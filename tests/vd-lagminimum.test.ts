import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anvend_paa_resultat } from '../src/engine/afrunding.ts';
import { dimensioner } from '../src/engine/dimensionering.ts';
import { byggelig_total_med_status } from '../src/engine/lagfordeling.ts';
import { resultChecks, type CheckNode } from '../src/engine/result-checks.ts';
import type { CalculationResult, Layer } from '../src/engine/types.ts';

const reproduktionslag: Layer[] = [
  { navn: 'A', andel: 99, lagtype: 'Bærelag' },
  { navn: 'B', andel: 1, lagtype: 'Bundsikring' },
];
const vdMinimum = { Bærelag: 100, Bundsikring: 200 };
const warning =
  "De underliggende lag kan ikke gøres mindst så tykke som VD's mindste lagtykkelse inden for 3000 mm over den oprundede lagtykkelse. Den angivne opbygning opfylder ikke valget under Indstillinger, Underliggende lag.";

test('VD-lagminimum: reproduktion bevarer tykkelsen, sætter flag og viser kontrolpunkt', () => {
  const built = byggelig_total_med_status(reproduktionslag, 900, 50, {
    fordeling: 'proportional',
    vd_minimum_mm: vdMinimum,
    kraev_alle_lag: true,
  });
  assert.deepEqual(built, { total_mm: 900, vd_minimum_opfyldt: false });
  const unchanged = anvend_paa_resultat(
    { fejl: null, t_uarmeret_phi_kor_mm: 900, t_armeret_mm: 900 },
    {
      trin_mm: 50,
      lagopbygning: {
        lag: reproduktionslag,
        fordeling: 'proportional',
        restlag: 'vd',
        vd_minimum_mm: vdMinimum,
        kraev_bundsikring: true,
      },
    },
  );
  assert.equal(unchanged.t_uarmeret_phi_kor_mm, 900);
  assert.equal(unchanged.t_armeret_mm, 900);
  assert.equal(unchanged.t_uarmeret_phi_kor_vd_minimum_ikke_opfyldt, true);
  assert.equal(unchanged.t_armeret_vd_minimum_ikke_opfyldt, true);

  const input = {
    tilstand: 'Brugerdefineret' as const,
    eu: 10,
    grundlag: { type: 'belastningsklasse' as const, klasse: 4 },
    geonet_navn: 'Tensar TriAx TX160',
    phi_manuel: 37,
    materialer: [
      { navn: 'A', tykkelse_mm: 990, lagtype: 'Bærelag', phi: 37 },
      { navn: 'B', tykkelse_mm: 10, lagtype: 'Bundsikring', phi: 37 },
    ],
    indstillinger: {
      afrunding: { trin_mm: 50 },
      lagfordeling: {
        fordeling: 'proportional',
        restlag: 'vd',
        vd_minimum_mm: vdMinimum,
        kraev_bundsikring: true,
      },
    },
  };
  const result = dimensioner(input);
  assert.ok(result);
  const res1 = result.res_1 as CalculationResult;
  assert.equal(res1.t_uarmeret_phi_kor_vd_minimum_ikke_opfyldt, true);
  assert.equal(res1.t_uarmeret_phi_kor_mm, 900);

  const checks = resultChecks(input, result);
  const nodeText = (node: CheckNode): string =>
    typeof node === 'string' ? node : node.children.map(nodeText).join('');
  const messages = checks.expanders
    .flatMap((expander) => expander.children)
    .map((item) => (item.type === 'html' ? item.nodes.map(nodeText).join('') : item.body));
  assert.equal(
    messages.filter((message) => message === `Ustabiliseret opbygning: ${warning}`).length,
    1,
    JSON.stringify(messages),
  );
  assert.equal(
    messages.filter((message) => message === `Tensar TriAx TX160 ved 1 lag geonet: ${warning}`)
      .length,
    1,
    JSON.stringify(messages),
  );
});

test('VD-lagminimum: kravet opfyldes efter forøgelse uden at sætte fejlflag', () => {
  const layers: Layer[] = [
    { navn: 'A', andel: 1, lagtype: 'Bærelag' },
    { navn: 'B', andel: 1, lagtype: 'Bundsikring' },
  ];
  const built = byggelig_total_med_status(layers, 300, 50, {
    fordeling: 'proportional',
    vd_minimum_mm: vdMinimum,
    kraev_alle_lag: true,
  });
  assert.deepEqual(built, { total_mm: 400, vd_minimum_opfyldt: true });

  const result = anvend_paa_resultat(
    { fejl: null, t_uarmeret_phi_kor_mm: 300, t_armeret_mm: 300 },
    {
      trin_mm: 50,
      lagopbygning: {
        lag: layers,
        fordeling: 'proportional',
        restlag: 'vd',
        vd_minimum_mm: vdMinimum,
        kraev_bundsikring: true,
      },
    },
  );
  assert.equal(result.t_uarmeret_phi_kor_mm, 400);
  assert.equal(result.t_armeret_mm, 400);
  assert.equal(result.t_uarmeret_phi_kor_vd_minimum_ikke_opfyldt, undefined);
  assert.equal(result.t_armeret_vd_minimum_ikke_opfyldt, undefined);
});

test('VD-lagminimum: restlag = vis sætter ikke fejlflag', () => {
  const result = anvend_paa_resultat(
    { fejl: null, t_uarmeret_phi_kor_mm: 300, t_armeret_mm: 300 },
    {
      trin_mm: 50,
      lagopbygning: {
        lag: reproduktionslag,
        fordeling: 'proportional',
        restlag: 'vis',
        vd_minimum_mm: null,
      },
    },
  );
  assert.equal(result.t_uarmeret_phi_kor_vd_minimum_ikke_opfyldt, undefined);
  assert.equal(result.t_armeret_vd_minimum_ikke_opfyldt, undefined);
});
