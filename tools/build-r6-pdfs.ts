/** node tools/build-r6-pdfs.ts — komplet R6-sæt uden browser eller nye pakker.
 * PDF-tekstkontrol bruger systemets pdftotext (PDFTOTEXT kan angive programmet).
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { r6ReportCases } from './r6-report-cases.ts';
import { reportFigures } from '../src/report/report-figures.ts';
import { reportDocument } from '../src/report/report-document.ts';
import { createReportBuilder, expectedContents, root } from './report-pdf-builder.ts';
import { auditReportLayout } from './report-layout-audit.ts';

const output = new URL('.local/output/r6/', root);
await mkdir(output, { recursive: true });
const builder = await createReportBuilder();
const normalize = (s: string) => s.replace(/\s+/gu, ' ').trim();
function containsRendered(text: string, expected: string): boolean {
  // PDF-linjebrud kan lægge whitespace efter en eksisterende bindestreg
  // (fx MSL-\n opbygning). Bindestregen bevares; ingen tegn/tal ændres.
  const chars = [...normalize(expected)];
  const pattern = chars
    .map((ch, i) =>
      ch === ' '
        ? '\\s+'
        : ch === '-' && chars[i + 1] !== ' '
          ? '-\\s*'
          : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('');
  return new RegExp(pattern, 'u').test(text);
}
const summary = [];
for (const c of r6ReportCases()) {
  const figures = reportFigures(c.report.result, c.report.settings, c.report.table);
  const request = reportDocument(c.report.data, figures, builder.assets, c.profile);
  const pdf = await builder.compile(request, c.name);
  const pdfPath = new URL(`${c.name}.pdf`, output);
  await writeFile(pdfPath, pdf);
  const expected = expectedContents(c.report, figures, c.profile);
  expected.case = c.name;
  expected.forbiddenStrings.push(...c.forbiddenStrings);
  // Profilens by og sidetal er også dynamiske strenge.
  expected.strings.push(`${c.profile.by} d.`);
  // Indholdsorden bevarer flerlinjede tabelværdier samlet. Xpdfs -layout
  // kan indskyde nabokolonnens næste etiket midt i sådan en værdi.
  const text = execFileSync(
    process.env.PDFTOTEXT ?? 'pdftotext',
    ['-enc', 'UTF-8', '-raw', fileURLToPath(pdfPath), '-'],
    {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 16_000_000,
    },
  );
  const pages = text.split('\f').filter((page) => page.trim());
  for (const [i] of pages.entries())
    expected.strings.push(
      c.profile.sidetal === 'side-af' ? `Side ${i + 1} af ${pages.length}` : `[${i + 1}]`,
    );
  expected.strings = [...new Set(expected.strings.filter(Boolean))];
  expected.forbiddenStrings = [...new Set(expected.forbiddenStrings)];
  await writeFile(
    new URL(`${c.name}.expected.json`, output),
    JSON.stringify(
      {
        ...expected,
        description: c.description,
        sourceCase: c.source,
      },
      null,
      2,
    ),
  );
  const flattened = normalize(text);
  // Baggrundens verificerede sidehoved/-fod ligger først i indholdsstrømmen.
  // Fjern KUN denne præcise prefix pr. side fra en separat brødtekststrøm,
  // så et afsnit over et sideskift kan findes samlet. Prefix kontrolleres selv.
  const bodyText = pages
    .map((page, i) => {
      const prefix = normalize(
        [
          ...(c.profile.logo_paa_alle_sider || i === 0 ? [c.profile.slogan] : []),
          c.profile.sidefod,
          c.profile.sidetal === 'side-af' ? `Side ${i + 1} af ${pages.length}` : `[${i + 1}]`,
        ].join(' '),
      );
      const normalized = normalize(page);
      assert.ok(
        normalized.startsWith(prefix),
        `${c.name}: ukendt rækkefølge i PDF-baggrund, side ${i + 1}`,
      );
      return normalized.slice(prefix.length).trim();
    })
    .join(' ');
  const missing = expected.strings.filter(
    (s) => !containsRendered(flattened, s) && !containsRendered(bodyText, s),
  );
  const forbiddenFound = expected.forbiddenStrings.filter(
    (s) => containsRendered(flattened, s) || containsRendered(bodyText, s),
  );
  const perPageMissing = pages.flatMap((page, i) => {
    const strings = [
      c.profile.sidefod,
      c.profile.sidetal === 'side-af' ? `Side ${i + 1} af ${pages.length}` : `[${i + 1}]`,
      ...(c.profile.logo_paa_alle_sider || i === 0 ? [c.profile.slogan] : []),
    ];
    return strings
      .filter((s) => s && !normalize(page).includes(normalize(s)))
      .map((s) => ({ page: i + 1, string: s }));
  });
  const contentCheck = {
    passed: !missing.length && !forbiddenFound.length && !perPageMissing.length,
    pages: pages.length,
    checkedStrings: expected.strings.length,
    checkedForbiddenStrings: expected.forbiddenStrings.length,
    missing,
    forbiddenFound,
    perPageMissing,
  };
  // Ingen tekstfallback: fejl i systemudtrækket stopper, og mangler rapporteres.
  await writeFile(
    new URL(`${c.name}.content-check.json`, output),
    JSON.stringify(contentCheck, null, 2),
  );
  const layout = await auditReportLayout(
    builder.compiler,
    builder.load,
    request,
    figures,
    c.profile,
    pages.length,
  );
  await writeFile(new URL(`${c.name}.layout-check.json`, output), JSON.stringify(layout, null, 2));
  // R3 sammenlignes kun ved uændrede originalinput/profil (de første ti).
  let identicalToR3: boolean | null = null;
  if (summary.length < 10) {
    const r3 = await readFile(new URL(`.local/output/r3/${c.source}.pdf`, root));
    identicalToR3 = r3.equals(pdf);
  }
  summary.push({
    name: `${c.name}.pdf`,
    description: c.description,
    sourceCase: c.source,
    bytes: pdf.length,
    sha256: createHash('sha256').update(pdf).digest('hex'),
    identicalToR3,
    contentCheck,
    layoutStatus: layout.status,
    layoutChecks: layout.checks,
  });
  console.log(
    `${c.name}: ${pages.length} sider, indhold ${contentCheck.passed ? 'OK' : 'FEJL'}, layout DELKONTROL`,
  );
}
await writeFile(
  new URL('manifest.json', output),
  JSON.stringify(
    {
      compiler: 'typst.ts / typst-ts-web-compiler 0.7.0; Typst 0.14.2',
      normalization:
        'Kun whitespace og linjeombrydning, også efter eksisterende bindestreg; ingen normalisering af værdier, tegnsætning eller Unicode.',
      extraction:
        'pdftotext -raw; præcist verificeret baggrundsprefix pr. side udelades i separat brødtekststrøm ved kontrol over sideskift. Baggrund kontrolleres pr. side.',
      fullLayoutCheck:
        'Udestår: styrende agent kontrollerer alle sider med PyMuPDF og sidebilleder.',
      cases: summary,
    },
    null,
    2,
  ),
);
assert.ok(
  summary.every((c) => c.contentCheck.passed),
  'PDF-indholdskontrol fejlede; se *.content-check.json',
);
assert.ok(
  summary.every((c) => c.identicalToR3 !== false),
  'Originaltilfælde afviger fra R3',
);
assert.ok(
  summary.every((c) => Object.values(c.layoutChecks).every(Boolean)),
  'Layout-delkontrol fejlede; se *.layout-check.json',
);
assert.equal(
  summary.find(
    (c) => c.sourceCase === 'Profilvariation af standard' && c.name.includes('side-1-af-3'),
  )?.contentCheck.pages,
  3,
);
