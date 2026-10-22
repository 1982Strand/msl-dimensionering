import { test } from 'node:test';
import assert from 'node:assert/strict';
import { standard_data_state } from '../src/engine/auto-edit.ts';
import { distributionImpact } from '../src/engine/distribution-impact.ts';
import { fordel_opbygning, fordel_soejle } from '../src/engine/lagfordeling.ts';

const lag = [
  { navn: 'Stabilgrus', andel: 170, lagtype: 'Bærelag' },
  { navn: 'Bundsikring', andel: 300, lagtype: 'Bundsikring' },
];

test('fastholdt øverste lag har den indtastede tykkelse, også under klasseminimum', () => {
  const split = fordel_opbygning(lag, 480, 5, {
    fordeling: 'fastholdt',
    min_mm: 275,
    oeverst_ref_mm: 170,
  });
  assert.deepEqual(
    split.map((l) => [l.navn, l.tykkelse_mm]),
    [
      ['Stabilgrus', 170],
      ['Bundsikring', 310],
    ],
  );
});

test('fastholdt øverste lag oprundes til indbygningstrin, men løftes ikke til minimum', () => {
  const split = fordel_opbygning(lag, 500, 50, {
    fordeling: 'fastholdt',
    min_mm: 275,
    oeverst_ref_mm: 170,
  });
  assert.equal(split[0].tykkelse_mm, 200);
});

test('de øvrige fordelinger holder fortsat klasseminimum for øverste lag', () => {
  for (const fordeling of ['minimum', 'minimum_geonet'])
    assert.equal(
      fordel_opbygning(lag, 480, 5, { fordeling, min_mm: 275 })[0].tykkelse_mm,
      275,
      fordeling,
    );
});

test('dimensionering: fastholdt 170 mm stabilgrus i klasse 5 slår igennem i alle opbygninger', () => {
  const data = standard_data_state();
  data.indstillinger.lagfordeling.fordeling = 'fastholdt';
  data.indstillinger.afrunding.trin_mm = 5;
  const model = distributionImpact(
    {
      tilstand: 'Brugerdefineret',
      bd_valgt_klasse: 5,
      bd_eu_slider: 30,
      bd_mat_0: 'Stabilgrus SGII 0-32',
      bd_t_0: 170,
      bd_mat_1: 'Bundsikringssand',
      bd_t_1: 300,
    },
    data,
  );
  assert.ok(model);
  assert.deepEqual(
    model.rows.map((r) => [r.label, r.cells]),
    [
      ['Indtastet', ['170', '300', '470 mm']],
      ['Uden geonet', ['170', '310', '480 mm']],
      ['1 lag geonet', ['170', '165', '335 mm']],
      ['2 lag geonet', ['Ikke gyldigt for denne kombination']],
    ],
  );
});

test('sammenlægning af tynde lag kan fortsat gøre det fastholdte øverste lag tykkere', () => {
  const split = fordel_opbygning(lag, 480, 5, {
    fordeling: 'fastholdt',
    min_mm: 275,
    oeverst_ref_mm: 170,
    restlag: 'flet',
    restlag_graense_mm: 320,
  });
  assert.deepEqual(
    split.map((l) => [l.navn, l.tykkelse_mm]),
    [['Stabilgrus', 480]],
  );
});

test('procentlag uden indtastet tykkelse: øverste lag holdes fortsat på mindst minimum', () => {
  const procent = [
    { navn: 'Stabilgrus', andel: 20, lagtype: 'Bærelag' },
    { navn: 'Bundsikring', andel: 80, lagtype: 'Bundsikring' },
  ];
  const split = fordel_soejle(
    { lag: procent, fordeling: 'fastholdt', min_mm: 275, oeverst_ref_mm: null },
    500,
    5,
    900,
  );
  assert.equal(split[0].tykkelse_mm, 275);
});

test('»sat til minimumstykkelsen« er uændret i opbygningerne med geonet', () => {
  const split = fordel_soejle(
    { lag, fordeling: 'minimum_geonet', min_mm: 275, oeverst_ref_mm: 170 },
    480,
    5,
    600,
  );
  assert.equal(split[0].tykkelse_mm, 275);
});

test('samlet minimum gælder fortsat ved fastholdt øverste lag', () => {
  const data = standard_data_state();
  data.indstillinger.lagfordeling.fordeling = 'fastholdt';
  data.indstillinger.afrunding.trin_mm = 5;
  const model = distributionImpact(
    {
      tilstand: 'Brugerdefineret',
      bd_valgt_klasse: 4,
      bd_eu_slider: 30,
      bd_mat_0: 'Stabilgrus SGII 0-32',
      bd_t_0: 100,
      bd_mat_1: 'Bundsikringssand',
      bd_t_1: 300,
    },
    data,
  );
  assert.ok(model);
  assert.deepEqual(model.rows.find((r) => r.label === '1 lag geonet')?.cells, [
    '100',
    '150',
    '250 mm',
  ]);
});
