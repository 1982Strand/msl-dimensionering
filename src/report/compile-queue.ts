export interface PdfRequest {
  main: string;
  files: Readonly<Record<string, string | Uint8Array>>;
}

export type PdfCompiler = (request: PdfRequest) => Promise<Uint8Array>;
export type CompileState =
  | { status: 'idle' | 'loading' | 'compiling' }
  | { status: 'ready'; url: string; revision: number; bytes: Uint8Array }
  | { status: 'error'; message: string; details: string };

export type CompileStage = 'loading' | 'font' | 'source' | 'compilation';

// typst.ts 0.7.0: compiler.d.mts, DiagnosticsData['full'].
export interface TypstDiagnostic {
  package: string;
  path: string;
  severity: string;
  range: string;
  message: string;
}

export class ReportCompileError extends Error {
  readonly stage: CompileStage;
  readonly diagnostics: readonly TypstDiagnostic[];
  constructor(stage: CompileStage, cause: unknown, diagnostics: readonly TypstDiagnostic[] = []) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.name = 'ReportCompileError';
    this.stage = stage;
    this.diagnostics = diagnostics;
  }
}

export function formatDiagnostics(diagnostics: readonly TypstDiagnostic[]): string {
  return diagnostics
    .map((diagnostic) => {
      const position = /^(\d+):(\d+)/.exec(diagnostic.range);
      const file = diagnostic.path.replace(/^\//, '') || 'rapport.typ';
      const location = position
        ? `, linje ${Number(position[1]) + 1}, kolonne ${Number(position[2]) + 1}`
        : '';
      const severity = /^warning$/i.test(diagnostic.severity) ? 'Advarsel' : 'Fejl';
      return `${severity} i ${file}${location}: ${diagnostic.message}`;
    })
    .join('\n');
}

export function describeCompileError(error: unknown, fallback: CompileStage = 'compilation') {
  const stage = error instanceof ReportCompileError ? error.stage : fallback;
  const messages: Record<CompileStage, string> = {
    loading: 'PDF-motoren kunne ikke indlæses (WASM eller netværk). Prøv igen.',
    font: 'Rapportens lokale skrifter kunne ikke indlæses eller anvendes.',
    source: 'Rapportens skabelon eller kildefiler indeholder en fejl.',
    compilation: 'PDF-kompileringen mislykkedes.',
  };
  const diagnostics =
    error instanceof ReportCompileError ? formatDiagnostics(error.diagnostics) : '';
  return {
    status: 'error' as const,
    message: messages[stage],
    details: diagnostics || (error instanceof Error ? error.message : String(error)),
  };
}

/** En mislykket initialisering gemmes ikke; samtidige kald deler samme forsøg. */
export function retryableInitialization<T>(initialize: () => Promise<T>): () => Promise<T> {
  let initialized: Promise<T> | undefined;
  return () =>
    (initialized ??= Promise.resolve()
      .then(initialize)
      .catch((error: unknown) => {
        initialized = undefined;
        throw error;
      }));
}

export interface CompileQueueOptions {
  loadCompiler: () => Promise<PdfCompiler>;
  onState: (state: CompileState) => void;
  urls?: {
    create: (bytes: Uint8Array) => string;
    revoke: (url: string) => void;
  };
}

/** Én aktiv kompilering og højst én ventende revision. Ingen Typst-afhængighed. */
export function createCompileQueue(options: CompileQueueOptions) {
  const urls = options.urls ?? {
    create: (bytes: Uint8Array) =>
      URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })),
    revoke: (url: string) => URL.revokeObjectURL(url),
  };
  const load = retryableInitialization(options.loadCompiler);
  let compiler: PdfCompiler | undefined;
  let revision = 0;
  let pending: { request: PdfRequest; revision: number } | undefined;
  let running = false;
  let disposed = false;
  let state: CompileState = { status: 'idle' };

  function release() {
    if (state.status === 'ready') urls.revoke(state.url);
  }
  function publish(next: CompileState) {
    state = next;
    options.onState(next);
  }
  async function drain() {
    running = true;
    while (pending && !disposed) {
      const current = pending;
      pending = undefined;
      let stage: CompileStage = 'loading';
      try {
        compiler ??= await load();
        if (disposed) break;
        // Under indlæsning kan flere ændringer være kommet til.
        if (current.revision !== revision) continue;
        stage = 'compilation';
        publish({ status: 'compiling' });
        const bytes = await compiler(current.request);
        if (disposed || current.revision !== revision) continue;
        const url = urls.create(bytes);
        publish({ status: 'ready', url, revision: current.revision, bytes });
      } catch (error) {
        if (disposed || current.revision !== revision) continue;
        release();
        publish(describeCompileError(error, stage));
      }
    }
    running = false;
  }
  return {
    request(request: PdfRequest): number {
      if (disposed) throw new Error('Kompileringskøen er lukket.');
      revision += 1;
      // Fasthold anmodningen, selv om kalderen genbruger/ændrer sine bytes.
      pending = {
        revision,
        request: {
          main: request.main,
          files: Object.fromEntries(
            Object.entries(request.files).map(([path, content]) => [
              path,
              typeof content === 'string' ? content : new Uint8Array(content),
            ]),
          ),
        },
      };
      release();
      publish({ status: compiler ? 'compiling' : 'loading' });
      if (!running) void drain();
      return revision;
    },
    getState: () => state,
    dispose() {
      disposed = true;
      pending = undefined;
      release();
      publish({ status: 'idle' });
    },
  };
}
