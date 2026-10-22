import { test } from 'node:test';
import assert from 'node:assert/strict';
import { standard_data_state } from '../src/engine/auto-edit.ts';
import { dimensioningInput, dimensioningValues } from '../src/engine/dimensioning-form.ts';
import { dimensioner } from '../src/engine/dimensionering.ts';
import { resultChecks, type CheckNode } from '../src/engine/result-checks.ts';

type FormValues = Parameters<typeof dimensioningInput>[0];

function warnings(values: FormValues, unit = 'mm', data = standard_data_state()) {
  const input = dimensioningInput(values, data);
  const result = dimensioner(input);
  assert.ok(result);
  const nodeText = (node: CheckNode): string =>
    typeof node === 'string' ? node : node.children.map(nodeText).join('');
  return resultChecks(input, result, unit)
    .expanders.flatMap((expander) => expander.children)
    .flatMap((item) =>
      item.type === 'html' ? item.nodes.map(nodeText) : [item.type === 'warning' ? item.body : ''],
    )
    .filter((text) => text.startsWith('Lag '));
}

const twoLayers = (top: number, bottom: number, extra: Record<string, unknown> = {}) => ({
  tilstand: 'Brugerdefineret',
  bd_antal_lag: 2,
  bd_mat_0: 'Stabilgrus SGII 0-32',
  bd_t_0: top,
  bd_mat_1: 'Bundsikringssand',
  bd_t_1: bottom,
  ...extra,
});

test('indtastet lag under VD-minimum giver advarsel for lag 2', () => {
  assert.deepEqual(warnings(twoLayers(300, 100)), [
    "Lag 2 (Bundsikringssand) er 100 mm og dermed tyndere end VD's mindste lagtykkelse for bundsikring på 200 mm, jf. Indstillinger, Underliggende lag.",
  ]);
});

test('bærelag på 100 mm og lag på VD-minimum giver ingen advarsel', () => {
  assert.deepEqual(warnings(twoLayers(100, 300)), []);
  assert.deepEqual(warnings(twoLayers(300, 200)), []);
});

test('advarsel bruger ændret VD-minimum fra indstillingerne', () => {
  const data = standard_data_state();
  data.indstillinger.lagfordeling.vd_minimum_mm.Bærelag = 150;
  assert.deepEqual(warnings(twoLayers(100, 300), 'mm', data), [
    "Lag 1 (Stabilgrus SGII 0-32) er 100 mm og dermed tyndere end VD's mindste lagtykkelse for bærelag på 150 mm, jf. Indstillinger, Underliggende lag.",
  ]);
});

test('advarslen følger indstillingerne uanset restlag-valg', () => {
  for (const restlag of ['vis', 'flet', 'vd']) {
    const data = standard_data_state();
    data.indstillinger.lagfordeling.restlag = restlag;
    assert.equal(warnings(twoLayers(300, 100), 'mm', data).length, 1, restlag);
  }
});

test('standard-tilstand får ikke advarsel om indtastede lag', () => {
  assert.deepEqual(warnings({ tilstand: 'Standard' }), []);
});

test('advarsel viser lagtykkelse og minimum i cm ved cm-visning', () => {
  assert.deepEqual(warnings(twoLayers(300, 100), 'cm'), [
    "Lag 2 (Bundsikringssand) er 10 cm og dermed tyndere end VD's mindste lagtykkelse for bundsikring på 20 cm, jf. Indstillinger, Underliggende lag.",
  ]);
});

test('indtastet tykkelse på 100 mm bevares, mens værdier under 100 mm løftes', () => {
  const data = standard_data_state();
  assert.equal(dimensioningValues({ bd_t_0: 100 }, data).bd_t_0, 100);
  assert.equal(dimensioningValues({ bd_t_0: 50 }, data).bd_t_0, 100);
});
