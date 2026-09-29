import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compileReport, validateReport } from './compile.ts';

const root = resolve('.local/report-prototype');
const typst = resolve('.local/typst/v0.15.1/typst-x86_64-pc-windows-msvc/typst.exe');
const sample = JSON.parse(await readFile(resolve(root, 'inputs/empty-text.json'), 'utf8'));

test('Empty text remains empty; missing text is rejected', () => {
  validateReport(sample);
  const changed = structuredClone(sample);
  delete changed.context.tekst_udfoerelse;
  assert.throws(() => validateReport(changed), /Missing text/);
});
test('Invalid or external image paths are rejected', () => {
  for (const image of ['../private.png','assets/../private.png','https://example.com/a.png','C:/private.png']) {
    const changed = structuredClone(sample);
    changed.context.visualisering = {image, width_cm:16};
    assert.throws(() => validateReport(changed), /Invalid image/);
  }
});
test('Numeric table values must already be formatted as exact strings', () => {
  const changed = structuredClone(sample);
  changed.context.dim_resultat[0].vaerdi = 650;
  assert.throws(() => validateReport(changed), /Invalid rows/);
});
test('Concurrent reports with same identity remain isolated and repeatable', async () => {
  const before = (await readdir(root)).filter(p => p.startsWith('job-')).sort();
  const edited = structuredClone(sample);
  edited.context.projekt = 'Særskilt projekt';
  const [a,b,c] = await Promise.all([compileReport(sample,root,typst),compileReport(edited,root,typst),compileReport(sample,root,typst)]);
  assert.equal(a.sha256,c.sha256);
  assert.notEqual(a.sha256,b.sha256);
  assert.deepEqual((await readdir(root)).filter(p => p.startsWith('job-')).sort(),before);
});
test('Text resembling Typst code remains literal', async () => {
  const changed = structuredClone(sample);
  changed.context.projekt = '#panic("MUST NOT RUN") <>& [æøå]';
  const result = await compileReport(changed,root,typst);
  assert.ok(result.pdf.length > 1000);
});
