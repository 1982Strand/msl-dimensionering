import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Hosting kontrolleres særskilt, så appens tests også virker uden denne opsætning.
const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const config = JSON.parse(
  read('hosting/cloudflare/wrangler.jsonc')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n'),
);

test('B-079: wrangler.jsonc udruller kun dist som statiske filer uden forhåndsvisningsadresser', () => {
  assert.equal(config.name, 'msl-dimensionering');
  assert.deepEqual(config.assets, { directory: '../../dist' });
  assert.equal(config.main, undefined);
  assert.equal(config.workers_dev, true);
  assert.equal(config.preview_urls, false);
});

test('B-079: GitHub-kontrollen udruller med fast wrangler-version og den delte bygning', () => {
  const job = read('.github/workflows/cloudflare.yml');
  assert.match(job, /run: npx --yes wrangler@\d+\.\d+\.\d+ deploy --config hosting\/cloudflare\/wrangler\.jsonc\r?$/m);
  assert.doesNotMatch(job, /pages deploy/);
  assert.match(job, /VITE_UDGAVE: delt/);
  assert.match(job, /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
});

test('B-080: den åbne udgave lægger ingen mailadresser ud og beder søgemaskiner om ikke at vise den', () => {
  // Uden login ville en admin-liste være offentlig; Cloudflare-udgaven har ingen admin.
  for (const path of ['.github/workflows/engine.yml', 'src/ui/access.ts'])
    assert.doesNotMatch(read(path), /adgang\.json|ADMIN_EMAILS|get-identity/, path);
  assert.match(
    read('public/_headers'),
    /^\/\*(?:\r?\n {2}.+)*\r?\n {2}X-Robots-Tag: noindex, nofollow/m,
  );
  assert.match(read('index.html'), /<meta name="robots" content="noindex, nofollow" \/>/);
});
