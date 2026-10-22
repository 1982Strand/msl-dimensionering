import { test } from 'node:test';
import assert from 'node:assert/strict';
import { standard_data_state } from '../src/engine/auto-edit.ts';
import { dimensioner } from '../src/engine/dimensionering.ts';
import { dimensioningInput } from '../src/engine/dimensioning-form.ts';
import { dimensioningPage, resultProducts } from '../src/engine/dimensioning-page.ts';
import { roundingImpact, type RoundingImpactModel } from '../src/engine/rounding-impact.ts';
import { outsideDetails, settingsPage } from '../src/engine/settings-presentation.ts';

const values = {
  tilstand: 'Brugerdefineret',
  bd_mat_0: 'Stabilgrus SGII 0-32',
  bd_t_0: 300,
  bd_mat_1: 'Bundsikringssand',
  bd_t_1: 295,
};
function model(afrunding: Record<string, unknown> = {}) {
  const data = standard_data_state();
  Object.assign(data.indstillinger.afrunding, afrunding);
  const impact = roundingImpact(values, data);
  assert.ok(impact);
  return impact;
}
const AFSNIT_5 =
  'Efter valget i afsnit 5 kan de enkelte opbygninger regnes med en anden φᵥ end den indtastede opbygnings. Tykkelserne i tabellen følger resultatkortene.';
const row = (m: RoundingImpactModel, label: string) => {
  const found = m.rows.find((r) => r.label === label);
  assert.ok(found, label);
  return [found.selected, found.standard, found.difference];
};

test('standardindstillinger: begge kolonner ens og noten om standard', () => {
  const m = model();
  assert.equal(
    m.context,
    'Brugerdefineret · belastningsklasse 4 · Eᵤ = 10 MPa · Tensar TriAx TX160',
  );
  assert.deepEqual(row(m, 'Nødvendig uden geonet'), ['900 mm', '900 mm', '0 mm']);
  assert.deepEqual(row(m, '1 lag geonet'), ['600 mm', '600 mm', '0 mm']);
  assert.deepEqual(row(m, '2 lag geonet'), ['uden for diagrammet', 'uden for diagrammet', '']);
  assert.deepEqual(row(m, 'Reduktion ved 1 lag'), [
    '300 mm (33,3 %)',
    '300 mm (33,3 %)',
    '0 mm · 0,0 procentpoint',
  ]);
  assert.deepEqual(row(m, 'φᵥ for den indtastede opbygning'), ['38,51°', '38,51°', '0,00°']);
  assert.deepEqual(row(m, 'kφ for den indtastede opbygning'), [
    '−3,03 %',
    '−3,03 %',
    '0,00 procentpoint',
  ]);
  assert.deepEqual(m.notes, [
    AFSNIT_5,
    'De valgte indstillinger svarer til standardindstillingerne.',
  ]);
});

test('oprundingstrin 10 mm sammenlignes med 50 mm', () => {
  const m = model({ trin_mm: 10 });
  assert.deepEqual(row(m, 'Nødvendig uden geonet'), ['880 mm', '900 mm', '−20 mm']);
  assert.deepEqual(row(m, 'Reduktion ved 1 lag'), [
    '280 mm (31,8 %)',
    '300 mm (33,3 %)',
    '−20 mm · −1,5 procentpoint',
  ]);
  assert.deepEqual(m.notes, [AFSNIT_5]);
});

test('reduktion af de beregnede lagtykkelser', () => {
  const m = model({ reduktion_eksakt: true });
  assert.deepEqual(row(m, '1 lag geonet'), ['600 mm', '600 mm', '0 mm']);
  assert.deepEqual(row(m, 'Reduktion ved 1 lag'), [
    '275 mm (31,4 %)',
    '300 mm (33,3 %)',
    '−25 mm · −1,9 procentpoint',
  ]);
});

test('nedrundet φᵥ og beregnet lagtykkelse i parentes', () => {
  const m = model({ phi_afrunding: 'ned', vis_eksakt: true });
  assert.deepEqual(row(m, 'Nødvendig uden geonet'), ['900 mm (beregnet 882 mm)', '900 mm', '0 mm']);
  assert.deepEqual(row(m, '1 lag geonet'), ['650 mm (beregnet 605 mm)', '600 mm', '+50 mm']);
  assert.deepEqual(row(m, 'Reduktion ved 1 lag'), [
    '250 mm (27,8 %)',
    '300 mm (33,3 %)',
    '−50 mm · −5,5 procentpoint',
  ]);
  assert.deepEqual(row(m, 'φᵥ for den indtastede opbygning'), [
    '38,00° (beregnet 38,51°)',
    '38,51°',
    '−0,51°',
  ]);
  assert.deepEqual(row(m, 'kφ for den indtastede opbygning'), [
    '−2,00 %',
    '−3,03 %',
    '+1,03 procentpoint',
  ]);
});

test('tallene er de samme som resultatkortene på Dimensionering', () => {
  for (const afrunding of [{}, { trin_mm: 10 }, { phi_afrunding: 'ned', vis_eksakt: true }]) {
    const data = standard_data_state();
    Object.assign(data.indstillinger.afrunding, afrunding);
    const input = dimensioningInput(values, data),
      result = dimensioner(input);
    const cards = dimensioningPage(input, result, resultProducts(input, result)).cards;
    const m = model(afrunding);
    for (const card of cards) {
      const [selected] = row(m, card.label);
      const shown = `${card.value} ${card.unit}${card.calculated ? ` (${card.calculated})` : ''}`;
      assert.equal(selected, shown, card.label);
    }
  }
});

test('Standard-tilstand og cm-visning', () => {
  const data = standard_data_state();
  data.indstillinger.opbygning.enhed = 'cm';
  const m = roundingImpact({}, data);
  assert.ok(m);
  assert.match(m.context, /^Standard · belastningsklasse 4 · Eᵤ = 10 MPa · /);
  assert.equal(
    m.rows.some((r) => r.label.includes('φ')),
    false,
  );
  assert.equal(row(m, 'Nødvendig uden geonet')[0], '90 cm');
  assert.deepEqual(m.notes, [
    'Standard regnes med referencematerialet, φᵥ = 37°, og berøres ikke af φᵥ-afrundingen.',
    'De valgte indstillinger svarer til standardindstillingerne.',
  ]);
});

test('uden gyldigt resultat vises eksemplet med 532 mm', () => {
  const data = standard_data_state();
  data.designdiagrammer = [];
  assert.equal(roundingImpact(values, data), null);
  const page = settingsPage(
    data.indstillinger,
    outsideDetails(data.vejdim_koersel_raekker, null, data.indstillinger.yderomraade),
    null,
  );
  assert.ok(
    page.sections[0].content.some(
      (item) =>
        item.kind === 'caption' &&
        item.text === 'Eksempel: en beregnet lagtykkelse på 532 mm angives som 550 mm.',
    ),
  );
});

test('φᵥ-regel, manuel φᵥ og trafikklasse', () => {
  const data = standard_data_state();
  data.indstillinger.lagfordeling.phi_regel = 'indtastet';
  data.indstillinger.afrunding.phi_afrunding = 'naermeste';
  const manual = roundingImpact(
    { ...values, bd_phi_override: true, bd_phi_man: 38.6, bd_grundlag: 'Trafikklasse' },
    data,
  );
  assert.ok(manual);
  assert.match(manual.context, /^Brugerdefineret · trafikklasse T4 · /);
  assert.deepEqual(row(manual, 'φᵥ for den indtastede opbygning (manuel)'), [
    '39,00° (beregnet 38,60°)',
    '38,60°',
    '+0,40°',
  ]);
  assert.deepEqual(manual.notes, []);
});
