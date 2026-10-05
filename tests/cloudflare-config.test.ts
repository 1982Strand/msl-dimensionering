import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// B-077/B-079: den delte udgave i Cloudflare Workers er kun statiske filer bag Cloudflare Access.
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const config = JSON.parse(
  read('wrangler.jsonc')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n'),
);

test('B-079: wrangler.jsonc udruller kun dist som statiske filer uden forhåndsvisningsadresser', () => {
  assert.equal(config.name, 'msl-dimensionering');
  assert.deepEqual(config.assets, { directory: './dist' });
  // Ingen serverkode: hele appen kører i browseren som lokalt og i Azure.
  assert.equal(config.main, undefined);
  assert.equal(config.workers_dev, true);
  assert.equal(config.preview_urls, false);
});

test('B-079: GitHub-kontrollen udruller med fast wrangler-version og den delte bygning', () => {
  const workflow = read('.github/workflows/engine.yml');
  const job = workflow.slice(workflow.indexOf('\n  cloudflare:'));
  assert.match(job, /run: npx --yes wrangler@\d+\.\d+\.\d+ deploy\r?$/m);
  assert.doesNotMatch(job, /pages deploy/);
  assert.match(job, /VITE_UDGAVE: delt/);
  assert.match(job, /CLOUDFLARE_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
});
