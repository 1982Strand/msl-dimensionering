import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reportCases } from '../tools/report-cases.ts';
import { reportData, SECTION_KEYS } from '../src/report/report-data.ts';
import { reportFigures } from '../src/report/report-figures.ts';
import { reportDocument, type ReportAssets } from '../src/report/report-document.ts';
import { DEFAULT_COMPANY_PROFILE, REPORT_FONT_FILES } from '../src/report/profile-defaults.ts';
import { parseReportText } from '../src/report/text-format.ts';
const assets: ReportAssets = {
  main: readFileSync(new URL('../src/report/typst/rapport.typ', import.meta.url), 'utf8'),
  layout: readFileSync(new URL('../src/report/typst/layout.typ', import.meta.url), 'utf8'),
  logo: readFileSync(new URL('../public/report/logo/byggros_logo.jpeg', import.meta.url)),
  fonts: Object.fromEntries(
    REPORT_FONT_FILES.map((name) => [
      name,
      readFileSync(new URL(`../public/report/fonts/${name}`, import.meta.url)),
    ]),
  ),
};
const cases = reportCases();
test('B-048 dokument: personlag med initialer/fallback og begge underskriftskolonner transporteres kun som JSON', () => {
  const c = cases[0];
  const special = '#panic("B048") $ [ ]';
  for (const checked of [false, true]) {
    const data = reportData(c.result, {
      ...c.metadata,
      sagsbehandler_initialer: 'AJ',
      sagsbehandler_telefon: special,
      kontrol_initialer: '',
      kontrol_mail: '',
      kontrol_telefon: '87654321',
      kontrollant_i_bunden: checked,
    });
    const req = reportDocument(data, reportFigures(c.result, c.settings, c.table), assets);
    const d = JSON.parse(req.files['data.json'] as string);
    assert.deepEqual(d.context, c.data.context);
    assert.deepEqual(d.medarbejdere, data.medarbejdere);
    assert.equal(d.medarbejdere.udfoert_af, 'AJ');
    assert.equal(d.medarbejdere.kontrol, c.metadata.kontrol);
    assert.deepEqual(d.medarbejdere.sagsbehandler, [
      c.metadata.sagsbehandler,
      special,
      c.metadata.sagsbehandler_mail,
    ]);
    // B-049: telefon vises før mail og grupperes; øvrige data er uændrede.
    assert.deepEqual(
      d.medarbejdere.kontrollant,
      checked ? [c.metadata.kontrol, '87 65 43 21'] : null,
    );
    assert.equal(req.main, assets.main);
    assert.equal(req.files['layout.typ'], assets.layout);
    assert.ok(!assets.layout.includes(special));
  }
});
for (const c of cases)
  test(`R3 dokument ${c.name}: data transporteres uændret til JSON`, () => {
    const figures = reportFigures(c.result, c.settings, c.table);
    const req = reportDocument(c.data, figures, assets);
    assert.equal(req.main, assets.main);
    assert.equal(req.files['layout.typ'], assets.layout);
    const d = JSON.parse(req.files['data.json'] as string);
    assert.deepEqual(d.context, c.data.context);
    assert.deepEqual(d.sections, c.data.sections);
    assert.deepEqual(d.grundlag, c.data.grundlag);
    assert.deepEqual(d.formattedTexts, c.data.formattedTexts);
    assert.deepEqual(JSON.parse(req.files['profil.json'] as string), DEFAULT_COMPANY_PROFILE);
    assert.equal(d.visualisering.image, 'figures/construction.svg');
    assert.ok(req.files[d.visualisering.image]);
    assert.ok(req.files[d.designdiagram.image]);
    for (const f of REPORT_FONT_FILES)
      assert.ok((req.files[`fonts/${f}`] as Uint8Array).length > 1000);
  });
test('R3 dokument: specialtegn og flerliniers brugerfelter findes kun i JSON, kilden er konstant', () => {
  const c = cases[0];
  const special = '# $ * _ @ < > [ ] \\ #panic("MUST NOT RUN")';
  const data = reportData(
    c.result,
    { ...c.metadata, projekt: special, beskrivelse: `${special}\nAnden linje` },
    c.valg,
    { udfoerelse: special },
  );
  const figures = reportFigures(c.result, c.settings, c.table);
  const request = reportDocument(data, figures, assets);
  const parsed = JSON.parse(request.files['data.json'] as string);
  assert.equal(parsed.context.projekt, special);
  assert.equal(parsed.context.tekst_udfoerelse, special);
  assert.equal(request.main, assets.main);
  for (const [path, content] of Object.entries(request.files))
    if (path !== 'data.json' && typeof content === 'string') assert.ok(!content.includes(special));
});
test('R3 dokument: tomme tekster beholder profiloverskrifter; null grundlag er layoutets eneste signal', () => {
  const empty = cases.find((c) => c.name === 'empty-text')!;
  assert.ok(SECTION_KEYS.every((k) => empty.data.context[`tekst_${k}`] === ''));
  assert.equal(DEFAULT_COMPANY_PROFILE.afsluttende_afsnit.length, 5);
  assert.match(assets.layout, /for afsnit in profil.afsluttende_afsnit/);
  const none = cases.find((c) => c.name === 'no-basis')!;
  assert.equal(none.data.grundlag, null);
  assert.match(assets.layout, /if report.grundlag != none/);
});
test('R3 dokument: fravalgte figurer medtages hverken som fil eller JSON-sti', () => {
  const c = cases[0];
  const figures = reportFigures(c.result, c.settings, c.table, {
    rap_vis_uarm: false,
    rap_vis_1lag: false,
    rap_vis_2lag: false,
    rap_vis_designdiagram: false,
  });
  const request = reportDocument(c.data, figures, assets);
  const data = JSON.parse(request.files['data.json'] as string);
  assert.equal(data.visualisering, null);
  assert.equal(data.designdiagram, null);
  assert.ok(!Object.keys(request.files).some((p) => p.startsWith('figures/')));
});

test('B-046 dokument: fravalgte afsnit mangler i dokumentdata; medtaget tom tekst beholder overskrift', () => {
  const c = cases[0];
  const data = reportData(
    c.result,
    c.metadata,
    {
      ...c.valg,
      medtag_afsnit: { oplyste_forudsaetninger: false, udfoerelse: false },
    },
    { kontrolplan: '' },
  );
  const req = reportDocument(data, reportFigures(c.result, c.settings, c.table), assets);
  const document = JSON.parse(req.files['data.json'] as string);
  for (const key of ['oplyste_forudsaetninger', 'udfoerelse']) {
    assert.ok(!(key in document.sections));
    assert.ok(!(key in document.formattedTexts));
    assert.ok(!(`tekst_${key}` in document.context));
  }
  assert.equal(document.sections.kontrolplan, 'Kontrolplan');
  assert.deepEqual(document.formattedTexts.kontrolplan, { paragraphs: [] });
  assert.deepEqual(document.grundlag, c.data.grundlag);
  assert.equal(
    data.context.tekst_oplyste_forudsaetninger,
    c.data.context.tekst_oplyste_forudsaetninger,
  );
});

test('B-046 dokument: formatering og Typst-specialtegn ligger alene i JSON-data', () => {
  const c = cases[0];
  const text = '• **Fed** og *kursiv* # $ [ ] \\ @ < >\n  o #panic("aldrig")';
  const data = reportData(c.result, c.metadata, c.valg, { udfoerelse: text });
  const req = reportDocument(data, reportFigures(c.result, c.settings, c.table), assets);
  const document = JSON.parse(req.files['data.json'] as string);
  assert.equal(document.context.tekst_udfoerelse, text);
  assert.deepEqual(document.formattedTexts.udfoerelse, parseReportText(text));
  assert.equal(req.main, assets.main);
  assert.equal(req.files['layout.typ'], assets.layout);
  assert.ok(!assets.layout.includes('#panic("aldrig")'));
});
