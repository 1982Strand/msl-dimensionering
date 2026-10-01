import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createCompileQueue,
  describeCompileError,
  formatDiagnostics,
  ReportCompileError,
  retryableInitialization,
  type PdfCompiler,
  type CompileState,
  type PdfRequest,
} from '../src/report/compile-queue.ts';

const pdf = new TextEncoder().encode('%PDF-1.7 test');
const request = (main: string): PdfRequest => ({ main, files: {} });
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function harness(loadCompiler: () => Promise<PdfCompiler>) {
  const states: CompileState[] = [];
  const created: string[] = [];
  const revoked: string[] = [];
  const queue = createCompileQueue({
    loadCompiler,
    onState: (state) => states.push(state),
    urls: {
      create(bytes) {
        assert.deepEqual(bytes, pdf);
        const url = `blob:pdf-${created.length + 1}`;
        created.push(url);
        return url;
      },
      revoke(url) {
        revoked.push(url);
      },
    },
  });
  return { queue, states, created, revoked };
}

test('hurtige revisioner samles; kun seneste resultat får en URL', async () => {
  const first = deferred<Uint8Array>();
  const last = deferred<Uint8Array>();
  const calls: string[] = [];
  const { queue, created } = harness(async () => async ({ main }) => {
    calls.push(main);
    return main === 'første' ? first.promise : last.promise;
  });
  assert.deepEqual(queue.getState(), { status: 'idle' });
  assert.equal(queue.request(request('første')), 1);
  assert.equal(queue.getState().status, 'loading');
  await tick();
  assert.equal(queue.getState().status, 'compiling');
  queue.request(request('anden'));
  assert.equal(queue.request(request('tredje')), 3);
  first.resolve(pdf);
  await tick();
  assert.deepEqual(calls, ['første', 'tredje']);
  assert.deepEqual(created, []);
  assert.equal(queue.getState().status, 'compiling');
  last.resolve(pdf);
  await tick();
  assert.deepEqual(queue.getState(), {
    status: 'ready',
    revision: 3,
    url: 'blob:pdf-1',
    bytes: pdf,
  });
  queue.dispose();
});

test('ændringer under indlæsning kompilerer kun den seneste revision', async () => {
  const loading = deferred<PdfCompiler>();
  const calls: string[] = [];
  const { queue } = harness(() => loading.promise);
  queue.request(request('første'));
  queue.request(request('anden'));
  queue.request(request('tredje'));
  loading.resolve(async ({ main }) => {
    calls.push(main);
    return pdf;
  });
  await tick();
  assert.deepEqual(calls, ['tredje']);
  assert.equal(queue.getState().status, 'ready');
  queue.dispose();
});

test('forrige URL frigives straks ved en ny revision, ved fejl og ved nedlukning', async () => {
  const broken = deferred<Uint8Array>();
  const { queue, created, revoked } = harness(
    async () =>
      async ({ main }) =>
        main === 'fejl' ? broken.promise : pdf,
  );
  queue.request(request('gyldig'));
  await tick();
  queue.request(request('fejl'));
  assert.deepEqual(revoked, ['blob:pdf-1']);
  assert.equal('url' in queue.getState(), false);
  await tick();
  broken.reject(new ReportCompileError('source', 'Ugyldig skabelon'));
  await tick();
  assert.equal(queue.getState().status, 'error');
  assert.equal('url' in queue.getState(), false);
  queue.request(request('rettet'));
  await tick();
  assert.deepEqual(created, ['blob:pdf-1', 'blob:pdf-2']);
  queue.dispose();
  queue.dispose();
  assert.deepEqual(revoked, created);
  assert.deepEqual(queue.getState(), { status: 'idle' });
  assert.throws(() => queue.request(request('lukket')), /lukket/);
});

test('en ældre fejl kasseres, mens den nyeste revision venter', async () => {
  const old = deferred<Uint8Array>();
  const { queue, states } = harness(
    async () =>
      async ({ main }) =>
        main === 'gammel' ? old.promise : pdf,
  );
  queue.request(request('gammel'));
  await tick();
  queue.request(request('ny'));
  old.reject(new Error('gammel fejl'));
  await tick();
  assert.equal(
    states.some((state) => state.status === 'error'),
    false,
  );
  assert.equal(queue.getState().status, 'ready');
  queue.dispose();
});

test('nedlukning kasserer både igangværende og ventende arbejde', async () => {
  const old = deferred<Uint8Array>();
  const calls: string[] = [];
  const { queue, created, states } = harness(async () => async ({ main }) => {
    calls.push(main);
    return old.promise;
  });
  queue.request(request('gammel'));
  await tick();
  queue.request(request('ny'));
  queue.dispose();
  const count = states.length;
  old.resolve(pdf);
  await tick();
  assert.deepEqual(calls, ['gammel']);
  assert.deepEqual(created, []);
  assert.equal(states.length, count);
});

test('indlæsningsfejl kan forsøges igen; en vellykket indlæsning genbruges', async () => {
  let attempts = 0;
  const { queue } = harness(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('HTTP 503');
    return async () => pdf;
  });
  queue.request(request('første'));
  await tick();
  const error = queue.getState();
  assert.equal(error.status, 'error');
  if (error.status === 'error') assert.match(error.message, /indlæses.*WASM eller netværk/);
  queue.request(request('nyt forsøg'));
  await tick();
  assert.equal(queue.getState().status, 'ready');
  queue.request(request('genbrug'));
  await tick();
  assert.equal(attempts, 2);
  queue.dispose();
});

test('initialiseringscache deler samtidige forsøg og frigiver afviste promises', async () => {
  const failed = deferred<number>();
  let attempts = 0;
  const load = retryableInitialization(() =>
    ++attempts === 1 ? failed.promise : Promise.resolve(42),
  );
  const a = load(),
    b = load();
  assert.equal(a, b);
  failed.reject(new Error('WASM'));
  await assert.rejects(a, /WASM/);
  assert.equal(await load(), 42);
  assert.equal(await load(), 42);
  assert.equal(attempts, 2);
});

test('anmodningens filer fastholdes, mens compileren indlæses', async () => {
  const loading = deferred<PdfCompiler>();
  const input = { '/data.bin': new Uint8Array([1]), '/data.json': 'før' };
  const { queue } = harness(() => loading.promise);
  queue.request({ main: 'test', files: input });
  input['/data.bin'][0] = 2;
  input['/data.json'] = 'efter';
  loading.resolve(async ({ files }) => {
    assert.deepEqual(files['/data.bin'], new Uint8Array([1]));
    assert.equal(files['/data.json'], 'før');
    return pdf;
  });
  await tick();
  assert.equal(queue.getState().status, 'ready');
  queue.dispose();
});

test('fulde Typst-diagnoser viser fil samt linje og kolonne med +1', () => {
  // Faktisk objekt fra den installerede WASM-compiler ved testsidens syntaksfejl.
  assert.equal(
    formatDiagnostics([
      {
        package: '',
        path: '/rapport.typ',
        range: '11:14-11:15',
        severity: 'error',
        message: 'unclosed delimiter',
      },
    ]),
    'Fejl i rapport.typ, linje 12, kolonne 15: unclosed delimiter',
  );
  const diagnostics = [
    {
      package: '',
      path: '/layout.typ',
      severity: 'Error',
      range: '0:4-0:5',
      message: 'expected expression',
    },
    {
      package: '',
      path: '/rapport.typ',
      severity: 'warning',
      range: '12:0-12:3',
      message: 'unknown font family',
    },
  ];
  assert.equal(
    formatDiagnostics(diagnostics),
    'Fejl i layout.typ, linje 1, kolonne 5: expected expression\nAdvarsel i rapport.typ, linje 13, kolonne 1: unknown font family',
  );
  const error = describeCompileError(new ReportCompileError('source', 'Ingen PDF', diagnostics));
  assert.match(error.message, /skabelon eller kildefiler/);
  assert.match(error.details, /layout.typ, linje 1, kolonne 5/);
});

test('danske fejl adskiller indlæsning, skrifter, kilde og kompilering', () => {
  for (const [stage, pattern] of [
    ['loading', /WASM eller netværk/],
    ['font', /skrifter/],
    ['source', /skabelon eller kildefiler/],
    ['compilation', /PDF-kompileringen/],
  ] as const) {
    const error = describeCompileError(new ReportCompileError(stage, new Error('årsag')));
    assert.match(error.message, pattern);
    assert.equal(error.details, 'årsag');
  }
});
