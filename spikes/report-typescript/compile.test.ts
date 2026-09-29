import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { compileReport, validateReport } from './compile.ts';
import { saveBundle, verifyBundle } from './archive.ts';

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

test('Archived inputs, assets and template are retained and tampering is detected', async () => {
  const archiveRoot = await mkdtemp(resolve(root,'archive-test-'));
  const compiled = await compileReport(sample,root,typst);
  const first = await saveBundle(compiled.bundle,archiveRoot);
  assert.equal(await saveBundle(compiled.bundle,archiveRoot),first);
  assert.deepEqual(JSON.parse(await readFile(resolve(first,'report.json'),'utf8')),sample);
  assert.ok((await readFile(resolve(first,'theme.json'))).length);
  await writeFile(resolve(first,'report.json'),'{}');
  await assert.rejects(verifyBundle(first),/integrity failure/);
  await assert.rejects(saveBundle(compiled.bundle,archiveRoot),/integrity failure/);
});

test('Theme changes produce a new version without changing report data', async () => {
  const themeDirectory = await mkdtemp(resolve(root,'theme-test-'));
  const theme = JSON.parse(await readFile(resolve('spikes/report-typescript/theme.json'),'utf8'));
  theme.version += 1;
  theme.brand.tagline = 'Nyt design til test';
  theme.closing_sections.reverse();
  const themeFile = resolve(themeDirectory,'theme.json');
  await writeFile(themeFile,JSON.stringify(theme));
  const original = await compileReport(sample,root,typst);
  const changed = await compileReport(sample,root,typst,themeFile);
  assert.notEqual(original.sha256,changed.sha256);
  assert.deepEqual(original.bundle.files['report.json'],changed.bundle.files['report.json']);
  assert.equal(changed.bundle.provenance.theme_version,theme.version);
  theme.closing_sections.pop();
  await writeFile(themeFile,JSON.stringify(theme));
  await assert.rejects(compileReport(sample,root,typst,themeFile),/preserve all closing sections/);
});
