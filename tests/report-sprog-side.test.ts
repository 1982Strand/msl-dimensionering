import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reportCases } from '../tools/report-cases.ts';
import { reportPage, reportValueKey, resetReportChoices } from '../src/report/report-page.ts';
import { reportData } from '../src/report/report-data.ts';
import { reportFigures } from '../src/report/report-figures.ts';
import { reportDocument } from '../src/report/report-document.ts';
import { mergeCompanyProfile } from '../src/report/company-profile.ts';
import { REPORT_FONT_FILES } from '../src/report/profile-defaults.ts';
import { REPORT_STRINGS } from '../src/report/report-sprog.ts';
import { laengde } from '../src/engine/enhed.ts';

const sample = reportCases()[0]!;
const nodeText = (page: ReturnType<typeof reportPage>, key: string) => {
  const visit = (nodes: ReturnType<typeof reportPage>['steps'][number]['children']): unknown => {
    for (const node of nodes) {
      if (node.kind === 'text_area' && node.key === key) return node;
      if (node.kind === 'expander') {
        const found = visit(node.children);
        if (found) return found;
      }
    }
    return null;
  };
  for (const step of page.steps) {
    const found = visit(step.children);
    if (found) return found;
  }
  return null;
};

test('rapportsprog bruger egne standardtekster og gemmenøgler uden at blande rettelser', () => {
  const da = reportPage(sample.result, {});
  const sv = reportPage(sample.result, { rap_sprog: 'sv' });
  assert.equal(da.sprog, 'da');
  assert.equal(sv.sprog, 'sv');
  assert.equal(da.choices.standard_materialer?.[0], REPORT_STRINGS.da.standard_materialer[0]);
  assert.equal(sv.choices.standard_materialer?.[0], REPORT_STRINGS.sv.standard_materialer[0]);
  assert.ok(nodeText(sv, 'rap_tekst_sv_generelle_forudsaetninger'));
  assert.ok(!nodeText(sv, 'rap_tekst_generelle_forudsaetninger'));
  assert.equal(laengde(1230, 'mm', 0, REPORT_STRINGS.da.tusindtal), '1.230 mm');
  assert.equal(laengde(1230, 'mm', 0, REPORT_STRINGS.sv.tusindtal), '1230 mm');
});

test('nulstilling af rapportvalg beholder sprogvalget', () => {
  const reset = resetReportChoices({
    rap_sprog: 'sv',
    rap_tekst_generelle_forudsaetninger: 'dansk ændring',
    rap_tekst_sv_generelle_forudsaetninger: 'svensk ändring',
    rap_linje_resultat_1lag: { tekst: 'da' },
    rap_linje_sv_resultat_1lag: { tekst: 'sv' },
  });
  assert.equal(reset.rap_sprog, undefined);
  assert.equal(reset.rap_tekst_generelle_forudsaetninger, null);
  assert.equal(reset.rap_tekst_sv_generelle_forudsaetninger, null);
  assert.equal(reset.rap_linje_resultat_1lag, null);
  assert.equal(reset.rap_linje_sv_resultat_1lag, null);
});

test('afsnitsmærke vises kun når kun det andet sprog er rettet', () => {
  const one = reportPage(sample.result, {
    rap_sprog: 'sv',
    rap_tekst_generelle_forudsaetninger: 'Dansk brugerrettelse',
  });
  const section = one.steps
    .flatMap((step) => step.children)
    .find((node) => node.kind === 'expander' && node.key === 'generelle_forudsaetninger');
  assert.equal(section?.kind, 'expander');
  if (section?.kind === 'expander') {
    assert.equal(section.marker, 'Rettet på dansk');
    assert.ok(
      section.children.some(
        (node) =>
          node.kind === 'info' &&
          node.text === 'Afsnittet er rettet på dansk, men den svenske tekst er standardteksten.',
      ),
    );
  }
  const both = reportPage(sample.result, {
    rap_sprog: 'sv',
    rap_tekst_generelle_forudsaetninger: 'Dansk brugerrettelse',
    rap_tekst_sv_generelle_forudsaetninger: 'Svensk användartext',
  });
  const bothSection = both.steps
    .flatMap((step) => step.children)
    .find((node) => node.kind === 'expander' && node.key === 'generelle_forudsaetninger');
  assert.equal(bothSection?.kind === 'expander' ? bothSection.marker : undefined, undefined);
  // På det rettede sprog vises intet mærke; kun det urørte sprog advares.
  const own = reportPage(sample.result, {
    rap_tekst_generelle_forudsaetninger: 'Dansk brugerrettelse',
  });
  const ownSection = own.steps
    .flatMap((step) => step.children)
    .find((node) => node.kind === 'expander' && node.key === 'generelle_forudsaetninger');
  assert.equal(ownSection?.kind === 'expander' ? ownSection.marker : 'x', undefined);
  const reverse = reportPage(sample.result, {
    rap_sprog: 'da',
    rap_tekst_sv_generelle_forudsaetninger: 'Svensk användartext',
  });
  const reverseSection = reverse.steps
    .flatMap((step) => step.children)
    .find((node) => node.kind === 'expander' && node.key === 'generelle_forudsaetninger');
  assert.equal(
    reverseSection?.kind === 'expander' ? reverseSection.marker : undefined,
    'Rettet på svensk',
  );
});

const tableLines = (page: ReturnType<typeof reportPage>) =>
  page.steps
    .flatMap((step) => step.children)
    .flatMap((node) => (node.kind === 'expander' ? node.children : [node]))
    .filter((node) => node.kind === 'table_line');

test('svensk side: tabellinjer og rapportdata beregnes på svensk', () => {
  const sv = reportPage(sample.result, { rap_sprog: 'sv' });
  assert.equal(sv.choices.sprog, 'sv');
  const labels = tableLines(sv).map((node) => node.calculated.beregnet_tekst);
  assert.ok(labels.includes(REPORT_STRINGS.sv.grundlag.eu));
  assert.ok(labels.includes(REPORT_STRINGS.sv.resultat.geonet));
  assert.ok(!labels.includes(REPORT_STRINGS.da.grundlag.eu));
  const data = reportData(sample.result, sv.metadata, sv.choices, sv.texts);
  assert.equal(data.sprog.typst_language, 'sv');
  assert.equal(data.context.dim_grundlag[0]!.label, REPORT_STRINGS.sv.grundlag.eu);
  assert.equal(
    data.context.tekst_krav_komprimering,
    REPORT_STRINGS.sv.standard_tekster.krav_komprimering,
  );
});

test('linjerettelser er pr. sprog; den danske side rører ikke svenske rettelser', () => {
  const sv = reportPage(sample.result, { rap_sprog: 'sv' });
  const line = tableLines(sv).find((node) => node.key === 'resultat_geonet')!;
  const svEdit = { ...line.calculated, tekst: 'Valt nät' };
  const da = reportPage(sample.result, { rap_linje_sv_resultat_geonet: svEdit });
  assert.deepEqual(da.resetLines, []);
  assert.deepEqual(da.choices.linje_rettelser, {});
  const svPage = reportPage(sample.result, {
    rap_sprog: 'sv',
    rap_linje_sv_resultat_geonet: svEdit,
  });
  assert.deepEqual(svPage.choices.linje_rettelser?.resultat_geonet, svEdit);
  assert.deepEqual(svPage.resetLines, []);
  assert.equal(reportValueKey('linje', 'resultat_geonet', 'sv'), 'rap_linje_sv_resultat_geonet');
  assert.equal(reportValueKey('tekst', 'kontrolplan', 'da'), 'rap_tekst_kontrolplan');
});

test('svensk profil.json følger den fælles rækkefølge af afsluttende afsnit', () => {
  const profile = mergeCompanyProfile({});
  profile.afsluttende_afsnit.reverse();
  const data = reportData(sample.result, sample.metadata, { sprog: 'sv' });
  const req = reportDocument(
    data,
    reportFigures(sample.result, sample.settings, sample.table, { sprog: 'sv' }),
    {
      main: '',
      layout: '',
      logo: new Uint8Array([1]),
      fonts: Object.fromEntries(REPORT_FONT_FILES.map((name) => [name, new Uint8Array([1])])),
    },
    profile,
  );
  const sent = JSON.parse(req.files['profil.json'] as string);
  assert.deepEqual(
    sent.afsluttende_afsnit.map((s: { noegle: string }) => s.noegle),
    profile.afsluttende_afsnit.map((s) => s.noegle),
  );
  assert.equal(sent.afsluttende_afsnit[0].titel, 'Projekteringsansvar:');
});
