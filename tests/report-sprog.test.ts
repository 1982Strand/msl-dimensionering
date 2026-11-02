import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { REPORT_FONT_FILES, DEFAULT_COMPANY_PROFILE } from '../src/report/profile-defaults.ts';
import { reportData, reportDataWithStrings } from '../src/report/report-data.ts';
import { reportDocument, type ReportAssets } from '../src/report/report-document.ts';
import { reportFigures, reportFiguresWithStrings } from '../src/report/report-figures.ts';
import { REPORT_STRINGS, reportStrings, type ReportStrings } from '../src/report/report-sprog.ts';
import { reportCases } from '../tools/report-cases.ts';
import { r6ReportCases } from '../tools/r6-report-cases.ts';

function marker(value: unknown): unknown {
  if (typeof value === 'string') return `⟦${value}⟧`;
  if (typeof value === 'function')
    return (...args: unknown[]) => `⟦${(value as (...args: unknown[]) => string)(...args)}⟧`;
  if (Array.isArray(value)) return value.map(marker);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, marker(item)]));
  return value;
}

function assets(): ReportAssets {
  return {
    main: 'main',
    layout: 'layout',
    logo: new Uint8Array([1]),
    fonts: Object.fromEntries(REPORT_FONT_FILES.map((name) => [name, new Uint8Array([1])])),
  };
}

const cases = reportCases();
const reportCase = cases.find((item) => item.result.tilstand === 'Standard')!;
const customCase = cases.find((item) => item.result.tilstand === 'Brugerdefineret')!;
const twoLayerCase = cases.find((item) => item.name === 'two-layers')!;
const outsideCase = r6ReportCases().find((item) => item.source === 'OUT-2')!.report;
const pseudoCases = [reportCase, customCase, twoLayerCase, outsideCase];

test('pseudosprog gennemstrømmer data, figurer og dokument', () => {
  const t = marker(REPORT_STRINGS.da) as ReportStrings;
  for (const item of pseudoCases) {
    const data = reportDataWithStrings(item.result, item.metadata, item.valg, item.tekster, t);
    const figures = reportFiguresWithStrings(
      item.result,
      item.settings,
      item.table,
      { rap_vis_signatur: true, rap_vis_designdiagram: true },
      t,
    );
    const request = reportDocument(data, figures, assets(), DEFAULT_COMPANY_PROFILE);
    const json = String(request.files['data.json']);
    const parsed = JSON.parse(json) as typeof data;
    assert.ok(parsed.sprog.projekt.startsWith('⟦'));
    assert.ok(Object.values(parsed.sections).every((title) => title.startsWith('⟦')));
    assert.ok(parsed.context.dim_grundlag.every((row) => row.label.startsWith('⟦')));
    assert.ok(parsed.context.dim_resultat.every((row) => row.label.startsWith('⟦')));
    assert.ok(
      parsed.context.dim_grundlag
        .find((row) => row.label === '⟦Materialeopbygning⟧')
        ?.vaerdi.includes('⟦'),
    );
    assert.ok(JSON.stringify(parsed.formattedTexts).includes('⟦'));
    assert.ok(parsed.grundlag?.overskrift.startsWith('⟦'));
    assert.ok(figures.visualisering?.svg.includes('⟦'));
    assert.ok(figures.designdiagram?.svg.includes('⟦'));
    assert.ok(figures.visualisering?.svg.includes('⟦Bærelag⟧'));
    assert.ok(figures.visualisering?.svg.includes('⟦Bundsikring⟧'));
    assert.ok(figures.designdiagram?.svg.includes('⟦Bærelagstykkelse [cm]⟧'));
    assert.ok(figures.designdiagram?.svg.includes('aria-label="⟦Personligt designdiagram⟧"'));
    assert.ok(!figures.visualisering?.svg.includes('Optimal korrektion ·'));
    assert.ok(!figures.designdiagram?.svg.includes('>Bærelagstykkelse [cm]</text>'));
  }
});

test('manglende sprog svarer til dansk for data, figurer og dokument', () => {
  for (const item of [reportCase, customCase]) {
    const implicitData = reportData(item.result, item.metadata, item.valg, item.tekster);
    const explicitData = reportData(
      item.result,
      item.metadata,
      { ...item.valg, sprog: 'da' },
      item.tekster,
    );
    assert.deepEqual(implicitData, explicitData);
    const implicitFigures = reportFigures(item.result, item.settings, item.table, {});
    const explicitFigures = reportFigures(item.result, item.settings, item.table, { sprog: 'da' });
    assert.deepEqual(implicitFigures, explicitFigures);
    assert.deepEqual(
      reportDocument(implicitData, implicitFigures, assets()),
      reportDocument(explicitData, explicitFigures, assets()),
    );
  }
});

test('Typst-layout har ingen faste danske rapportetiketter', () => {
  const layout = readFileSync(new URL('../src/report/typst/layout.typ', import.meta.url), 'utf8');
  const labels = [
    'Projekt: ',
    'Beskrivelse:',
    'Omfang:',
    'Udføres for:',
    'Udført af:',
    'Kvalitetssikring:',
    'Dimensioneringsgrundlag:',
    'Forudsætninger:',
    'Generelle dimensioneringsforudsætninger for MSL opbygning:',
    'Dimensioneringsresultat:',
    'Baseret på ovennævnte indgangsparametre kan vi foreslå følgende MSL opbygning:',
    ' d.',
    'Side ',
    ' af ',
    'lang: "da"',
  ];
  for (const label of labels) assert.ok(!layout.includes(label), `Fundet i layout.typ: ${label}`);
  assert.equal(reportStrings().typst_language, 'da');
});
