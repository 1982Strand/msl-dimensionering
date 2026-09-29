/** Node 24's native TypeScript support; no application or calculation dependency. */
import { readFile, writeFile, copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { basename, dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));

export type Row = { label: string; vaerdi: string };
export type Picture = '' | { image: string; width_cm: 16 };
export type Context = Record<string, unknown> & {
  dim_grundlag: Row[]; dim_resultat: Row[]; visualisering: Picture; designdiagram: Picture;
};
export type Report = { schema_version: 1; source_commit: string; case: string; context: Context };

export function validateReport(value: unknown): asserts value is Report {
  if (!value || typeof value !== 'object') throw new Error('Missing report');
  const r = value as Report;
  if (r.schema_version !== 1 || typeof r.source_commit !== 'string' || !/^[a-f0-9]{40}$/.test(r.source_commit) || typeof r.case !== 'string' || !/^[a-z0-9-]+$/.test(r.case)) throw new Error('Invalid report identity');
  const c = r.context;
  if (!c || typeof c !== 'object') throw new Error('Missing context');
  for (const key of ['projekt','beskrivelse','omfang','udfoeres_for','sagsbehandler','sagsbehandler_mail','kontrol','dato',
    'tekst_oplyste_forudsaetninger','tekst_generelle_forudsaetninger','tekst_krav_komprimering','tekst_dim_sikkerhed','tekst_udfoerelse','tekst_kontrolplan','tekst_projekteringsansvar']) {
    if (typeof c[key] !== 'string') throw new Error(`Missing text ${key}`);
  }
  for (const key of ['dim_grundlag', 'dim_resultat'] as const) {
    if (!Array.isArray(c[key]) || c[key].some(row => !row || typeof row.label !== 'string' || typeof row.vaerdi !== 'string')) throw new Error(`Invalid rows ${key}`);
  }
  for (const key of ['visualisering', 'designdiagram'] as const) {
    const pic = c[key];
    if (pic !== '' && (!pic || typeof pic !== 'object' || !/^assets\/[a-zA-Z0-9_-]+\.png$/.test(pic.image) || pic.width_cm !== 16)) throw new Error(`Invalid image ${key}`);
  }
}

export async function compileReport(report: unknown, root: string, typst: string): Promise<{pdf: Buffer; milliseconds: number; sha256: string}> {
  validateReport(report);
  root = resolve(root);
  // Each job owns its input, output and template, even for identical case names.
  const job = await mkdtemp(join(root, 'job-'));
  try {
    await mkdir(join(job, 'assets'));
    await copyFile(join(root, 'assets/image1.jpeg'), join(job, 'assets/image1.jpeg'));
    for (const pic of [report.context.visualisering, report.context.designdiagram]) {
      if (pic) await copyFile(join(root, pic.image), join(job, pic.image));
    }
    await copyFile(join(here, 'report.typ'), join(job, 'report.typ'));
    await writeFile(join(job, 'report.json'), JSON.stringify(report));
    const start = performance.now();
    const result = await run(typst, ['compile', '--root', job, '--input', 'data=report.json', join(job, 'report.typ'), join(job, 'report.pdf')], { timeout: 90_000, windowsHide: true, maxBuffer: 2_000_000 });
    if (result.stderr.trim()) throw new Error(`Typst warning/error: ${result.stderr}`);
    const pdf = await readFile(join(job, 'report.pdf'));
    if (!pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('No valid PDF output');
    return { pdf, milliseconds: performance.now()-start, sha256: createHash('sha256').update(pdf).digest('hex') };
  } finally {
    // Only the newly-created job directory is removed, never a caller's folder.
    if (dirname(resolve(job)) !== root || !basename(job).startsWith('job-')) throw new Error('Unsafe job cleanup path');
    await rm(job, {recursive:true, force:true});
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? '.local/report-prototype');
  const typst = resolve(process.argv[3] ?? '.local/typst/v0.15.1/typst-x86_64-pc-windows-msvc/typst.exe');
  const index = JSON.parse(await readFile(join(root, 'case-index.json'), 'utf8'));
  const timings = [];
  await mkdir(join(root, 'typst'), {recursive:true});
  for (const name of index.cases) {
    const report = JSON.parse(await readFile(join(root, 'inputs', `${name}.json`), 'utf8'));
    const result = await compileReport(report, root, typst);
    await writeFile(join(root, 'typst', `${name}.pdf`), result.pdf);
    timings.push({case:name, milliseconds:result.milliseconds, sha256:result.sha256});
    console.log(name);
  }
  await writeFile(join(root, 'typst-timings.json'), JSON.stringify(timings, null, 2));
}
