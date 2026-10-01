import type { TypstCompiler } from '@myriaddreamin/typst.ts/compiler';
import { ReportCompileError, retryableInitialization, type PdfRequest } from './compile-queue.ts';

const fontFiles = [
  'Carlito-Regular',
  'Carlito-Bold',
  'Carlito-Italic',
  'Carlito-BoldItalic',
  'LiberationSans-Regular',
  'LiberationSans-Bold',
  'LiberationSans-Italic',
  'LiberationSans-BoldItalic',
];

const initialize = retryableInitialization(async (): Promise<TypstCompiler> => {
  // Begge moduler og WASM-URL'en hentes først, når rapporten skal bruges.
  let modules;
  try {
    modules = await Promise.all([
      import('@myriaddreamin/typst.ts/contrib/snippet'),
      import('@myriaddreamin/typst-ts-web-compiler'),
      import('@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url'),
    ]);
    // LazyWasmModule i 0.7.0 gemmer også afviste promises. Initialisér wrapperen
    // først, så en netværks-/WASM-fejl kan forsøges igen før dens once-cache.
    await modules[1].default({ module_or_path: new URL(modules[2].default, location.href) });
  } catch (error) {
    throw new ReportCompileError(
      'loading',
      new Error(
        `typst_ts_web_compiler_bg.wasm / compiler-modul: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      ),
    );
  }
  const { TypstSnippet } = modules[0];
  const snippet = new TypstSnippet();
  snippet.setCompilerInitOptions({ getModule: () => new URL(modules[2].default, location.href) });
  let fonts: Uint8Array[];
  try {
    fonts = await Promise.all(
      fontFiles.map(async (name) => {
        const path = `${import.meta.env.BASE_URL}report/fonts/${name}.ttf`;
        try {
          const response = await fetch(path);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return new Uint8Array(await response.arrayBuffer());
        } catch (error) {
          throw new Error(
            `${name}.ttf: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error },
          );
        }
      }),
    );
    // Bytes undgår bibliotekets globale URL-fontcache, som ellers også kan
    // huske skrifter fra et fejlet initialiseringsforsøg.
    const preloads = fonts.map((font, index) => {
      const preload = TypstSnippet.preloadFonts([font]);
      // Bevar loaderens metadata (_kind m.fl.), når skriftfejl får filnavn.
      preload.provides = preload.provides.map((provide) =>
        Object.assign(
          async (stage: Parameters<typeof provide>[0], context: Parameters<typeof provide>[1]) => {
            try {
              await provide(stage, context);
            } catch (error) {
              throw new ReportCompileError(
                'font',
                new Error(
                  `${fontFiles[index]}.ttf: ${error instanceof Error ? error.message : String(error)}`,
                  { cause: error },
                ),
              );
            }
          },
          provide,
        ),
      );
      return preload;
    });
    snippet.use(TypstSnippet.disableDefaultFontAssets(), ...preloads);
  } catch (error) {
    throw new ReportCompileError('font', error);
  }
  try {
    return await snippet.getCompiler();
  } catch (error) {
    if (error instanceof ReportCompileError) throw error;
    throw new ReportCompileError(
      'loading',
      new Error(`compiler-modul: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      }),
    );
  }
});

// Også direkte kald fra forskellige køer skal dele den tilstandsfulde compiler.
let tail: Promise<unknown> = Promise.resolve();
export function compilePdf(request: PdfRequest): Promise<Uint8Array> {
  const result = tail.then(async () => {
    const compiler = await initialize();
    try {
      compiler.resetShadow();
      for (const [path, content] of Object.entries(request.files)) {
        const absolute = path.startsWith('/') ? path : `/${path}`;
        if (absolute === '/rapport.typ')
          throw new Error('rapport.typ er reserveret til hovedkilden.');
        if (typeof content === 'string' && absolute.endsWith('.typ'))
          compiler.addSource(absolute, content);
        else
          compiler.mapShadow(
            absolute,
            typeof content === 'string' ? new TextEncoder().encode(content) : content,
          );
      }
      compiler.addSource('/rapport.typ', request.main);
    } catch (error) {
      throw new ReportCompileError(
        'source',
        new Error(`rapport.typ: ${error instanceof Error ? error.message : String(error)}`, {
          cause: error,
        }),
      );
    }
    try {
      // $typst.pdf() skjuler diagnoserne (diagnostics: 'none') i 0.7.0.
      // Den samme PDF-motor kaldes derfor med fulde diagnoser som i demoen.
      const result = await compiler.compile({
        mainFilePath: '/rapport.typ',
        format: 1,
        diagnostics: 'full',
        inputs: {},
      });
      const fontErrors = result.diagnostics?.filter((d) =>
        /unknown font family|failed to load font/i.test(d.message),
      );
      if (fontErrors?.length)
        throw new ReportCompileError('font', 'Skriften kunne ikke anvendes.', fontErrors);
      if (!result.result)
        throw new ReportCompileError('source', 'Typst returnerede ingen PDF.', result.diagnostics);
      return result.result;
    } catch (error) {
      if (error instanceof ReportCompileError) throw error;
      throw new ReportCompileError(
        'compilation',
        new Error(`rapport.typ: ${error instanceof Error ? error.message : String(error)}`, {
          cause: error,
        }),
      );
    }
  });
  tail = result.catch(() => undefined);
  return result;
}

export async function loadPdfCompiler() {
  await initialize();
  return compilePdf;
}
