import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { standard_data_state } from '../src/engine/auto-edit.ts';
import {
  calculateForm,
  dimensioningInput,
  dimensioningValues,
  resetDimensioning,
} from '../src/engine/dimensioning-form.ts';
const reference = JSON.parse(
  readFileSync(new URL('../reference/ui-flows.json', import.meta.url), 'utf8'),
);

test('dimensioning form maps all 17 original widget snapshots to identical calculation payloads', () => {
  for (const s of reference.snapshots.filter(
    (s: { page: string }) => s.page === 'dimensionering',
  )) {
    const data = {
      ...standard_data_state(),
      materialer: reference.defaults.materialer,
      indstillinger: s.settings,
    };
    const values = Object.fromEntries(
      s.widgets.map((w: { key: string; value: unknown }) => [w.key, w.value]),
    );
    assert.deepEqual(calculateForm(values, data), s.dimensioning, s.id);
  }
});
test('dimensioning reset preserves mode, settings editor selections and unrelated values', () => {
  assert.deepEqual(
    resetDimensioning({
      tilstand: 'Brugerdefineret',
      std_eu_slider: 5,
      bd_phi_override: true,
      materialFilter: 'a',
      opbygning_geonet_valg: 'a',
    }),
    { tilstand: 'Brugerdefineret', materialFilter: 'a' },
  );
});
test('removed materials use manual inputs and nullable material properties are preserved', () => {
  const data = standard_data_state();
  data.materialer[0].max_korn = null;
  const values = {
    tilstand: 'Brugerdefineret',
    bd_mat_0: data.materialer[0].navn,
    bd_mat_1: 'Slettet materiale',
    bd_phi_m_1: 40,
  };
  const input = dimensioningInput(values, data);
  assert.equal(input.materialer![0].max_korn, null);
  assert.equal(input.materialer![1].navn, 'Manuel indtastning');
  assert.equal(input.materialer![1].phi, 40);
  assert.equal(dimensioningValues({}, data).bd_t_1, 400);
});
