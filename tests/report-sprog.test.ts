import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { REPORT_FONT_FILES, DEFAULT_COMPANY_PROFILE } from '../src/report/profile-defaults.ts';
import { reportData, reportDataWithStrings, SECTION_KEYS } from '../src/report/report-data.ts';
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

// Danske ord fra de faste tekster, som ikke må optræde i den svenske rapport.
const DANSKE_ORD = [
  'Bærelag',
  'bærelag',
  'Bundsikring',
  'Underbund',
  'Ustabiliseret',
  'Stabiliseret',
  'Stabilgrus',
  'Indtastet',
  'Ikke ',
  'Valgt',
  'Trafikklasse',
  'Belastningsklasse',
  'Materialeopbygning',
  'Vægtet',
  ' og ',
  'lag geonet',
  'Klasse ',
  'Forudsætning',
  'forudsætning',
  'Udførelse',
  'Kontrolplan',
  'Beskrivelse',
  'Omfang',
  'Kvalitetssikring',
  'Baseret',
];

test('svensk rapport: data og figurer har ingen danske faste tekster', () => {
  for (const item of pseudoCases) {
    const valg = { ...item.valg, sprog: 'sv' as const };
    delete valg.standard_materialer;
    delete valg.linje_rettelser;
    const data = reportData(item.result, {}, valg, {});
    const figures = reportFigures(item.result, item.settings, item.table, {
      sprog: 'sv',
      rap_vis_signatur: true,
      rap_vis_designdiagram: true,
    });
    // Brugerdefinerede materialenavne er brugerdata og må stå, som de er indtastet.
    const kunFaste = item.result.tilstand === 'Standard';
    const tekst = JSON.stringify({
      sprog: data.sprog,
      sections: data.sections,
      grundlag: data.grundlag?.overskrift,
      labels: [...data.context.dim_grundlag, ...data.context.dim_resultat].map((r) => r.label),
      vaerdier: kunFaste ? data.context.dim_grundlag.map((r) => r.vaerdi) : [],
      afsnit: SECTION_KEYS.map((key) => data.context[`tekst_${key}`]),
      dato: reportData(item.result, { dato: '2026-11-02' }, valg).context.dato,
    });
    const svg = kunFaste
      ? `${figures.visualisering?.svg}${figures.designdiagram?.svg}`
      : `${figures.designdiagram?.svg}`;
    for (const ord of DANSKE_ORD) {
      assert.ok(!tekst.includes(ord), `${item.name}: »${ord}« i svenske data`);
      assert.ok(!svg.includes(ord), `${item.name}: »${ord}« i svenske figurer`);
    }
    assert.equal(data.sprog.typst_language, 'sv');
    assert.ok(tekst.includes('2 november 2026'));
  }
});

test('svensk dato skrives med månedsnavn; ugyldige datoer gengives uændret', () => {
  const dato = REPORT_STRINGS.sv.dato;
  assert.equal(dato('2026-11-02'), '2 november 2026');
  assert.equal(dato('2027-01-09'), '9 januari 2027');
  assert.equal(dato('2026-03-31'), '31 mars 2026');
  for (const ugyldig of ['', '2026-13-01', '2026-1-1', '02/11/2026'])
    assert.equal(dato(ugyldig), ugyldig);
});

test('svenske standardtekster og -materialer findes for alle afsnit og adskiller sig fra dansk', () => {
  for (const key of SECTION_KEYS) {
    assert.ok(REPORT_STRINGS.sv.standard_tekster[key].length > 20, key);
    assert.notEqual(
      REPORT_STRINGS.sv.standard_tekster[key],
      REPORT_STRINGS.da.standard_tekster[key],
    );
  }
  assert.deepEqual(REPORT_STRINGS.sv.standard_materialer, [
    'Obundet bärlager',
    'Förstärkningslager',
  ]);
});
