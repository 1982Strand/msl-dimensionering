/** node tools/build-report-pdfs.ts — samme typst.ts/WASM 0.7.0 som browseren. */
import { writeFile, mkdir } from 'node:fs/promises';
import { reportReviewCases } from './report-cases.ts';
import { reportFigures } from '../src/report/report-figures.ts';
import { reportDocument } from '../src/report/report-document.ts';
import { createReportBuilder, expectedContents, root } from './report-pdf-builder.ts';
const { assets, compile } = await createReportBuilder();
await mkdir(new URL('.local/output/r3/', root), { recursive: true });
for (const c of reportReviewCases()) {
  const figures = reportFigures(c.result, c.settings, c.table);
  const pdf = await compile(reportDocument(c.data, figures, assets), c.name);
  await writeFile(new URL('.local/output/r3/' + c.name + '.pdf', root), pdf);
  await writeFile(
    new URL('.local/output/r3/' + c.name + '.expected.json', root),
    JSON.stringify(expectedContents(c, figures), null, 2),
    'utf8',
  );
  console.log(c.name + ': ' + pdf.length + ' bytes');
}
