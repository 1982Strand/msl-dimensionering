import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INTERNAL_URL } from './check-access.ts';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const config = (path: string) =>
  JSON.parse(
    read(path)
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('//'))
      .join('\n'),
  );

test('B-079: Cloudflare har to statiske konfigurationer uden serverkode', () => {
  const internal = config('hosting/cloudflare/wrangler.jsonc');
  const publicEdition = config('hosting/cloudflare/wrangler-offentlig.jsonc');
  assert.equal(internal.name, 'msl-intern');
  // Access-kontrollen skal ramme den Worker, der udrulles som intern udgave.
  assert.equal(new URL(INTERNAL_URL).hostname, `${internal.name}.byggros.workers.dev`);
  assert.deepEqual(internal.assets, { directory: '../../dist-intern' });
  assert.equal(internal.main, undefined);
  assert.equal(internal.workers_dev, true);
  assert.equal(internal.preview_urls, false);
  assert.equal(publicEdition.name, 'msl');
  assert.deepEqual(publicEdition.assets, { directory: '../../dist-offentlig' });
  assert.equal(publicEdition.main, undefined);
  assert.equal(publicEdition.workers_dev, true);
  assert.equal(publicEdition.preview_urls, false);
});

test('B-079: workflow kontrollerer Access og bygger kartotek kun i intern udgave', () => {
  const job = read('.github/workflows/cloudflare.yml');
  assert.match(job, /node tools\/build-udgave\.ts offentlig/);
  assert.match(job, /node hosting\/cloudflare\/check-access\.ts/);
  assert.match(job, /node tools\/build-udgave\.ts intern/);
  assert.match(job, /MEDARBEJDERE_JSON: \$\{\{ secrets\.MEDARBEJDERE_JSON \}\}/);
  assert.equal((job.match(/secrets\.MEDARBEJDERE_JSON/g) ?? []).length, 1);
  assert.match(job, /check-assets\.ts dist-intern[\s\S]*check-assets\.ts dist-offentlig/);
  assert.match(job, /wrangler@\d+\.\d+\.\d+ deploy --config hosting\/cloudflare\/wrangler\.jsonc/);
  assert.match(
    job,
    /wrangler@\d+\.\d+\.\d+ deploy --config hosting\/cloudflare\/wrangler-offentlig\.jsonc/,
  );
  assert.match(job, /Cloudflare Access er ikke slået til[\s\S]*indbyggede kartotek er udeladt/);
  assert.doesNotMatch(job, /pages deploy/);
  const engine = read('.github/workflows/engine.yml');
  assert.match(engine, /MEDARBEJDERE_JSON: \$\{\{ secrets\.MEDARBEJDERE_JSON \}\}/);
});

test('B-080: offentlig udgave indeholder ingen firmamails og beder om ikke at blive indekseret', () => {
  for (const path of ['.github/workflows/engine.yml', 'src/ui/access.ts'])
    assert.doesNotMatch(read(path), /adgang\.json|ADMIN_EMAILS|get-identity/, path);
  assert.match(
    read('public/_headers'),
    /^\/\*(?:\r?\n {2}.+)*\r?\n {2}X-Robots-Tag: noindex, nofollow/m,
  );
  assert.match(read('index.html'), /<meta name="robots" content="noindex, nofollow" \/>/);
});
