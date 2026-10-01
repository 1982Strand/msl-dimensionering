import { test } from 'node:test';
import assert from 'node:assert/strict';
import { standard_data_state } from '../src/engine/auto-edit.ts';
import { dimensioningInput, dimensioningValues } from '../src/engine/dimensioning-form.ts';
import { dimensioner } from '../src/engine/dimensionering.ts';

test('F-11.2: slettet standardlag bruger originalens manuelle standarder og bevarer tykkelsen', () => {
  // Original: app.py:6546–6548, 6579–6585, 6617–6633; PHI_BASIS=37 fra core/data.py:1899.
  const data = standard_data_state();
  data.materialer = data.materialer.filter((m) => m.navn !== 'Stabilgrus SGII 0-32');
  const values = { tilstand: 'Brugerdefineret', bd_mat_0: 'Stabilgrus SGII 0-32', bd_t_0: 300 };
  assert.equal(dimensioningValues(values, data).bd_mat_0, 'Manuel indtastning');
  assert.deepEqual(dimensioningInput(values, data).materialer![0], {
    navn: 'Manuel indtastning',
    phi: 37,
    max_korn: 32,
    lagtype: 'Bærelag',
    tykkelse_mm: 300,
    pct: null,
    krav_maskestoerrelse_mm: null,
  });
  assert.equal(values.bd_mat_0, 'Stabilgrus SGII 0-32', 'Input må ikke muteres af motoren');
});

for (const [mode, thickness, reduction] of [
  ['stabilgrus', 200, 150],
  ['loeft', 250, 100],
  ['ubundet', 200, 150],
] as const) {
  test(`F-06.6: ${mode} matcher originalens Eu33/klasse4-eksempel`, () => {
    // Originalens forventninger: app.py:10226–10243 (_UNDER_MIN_EKSEMPEL).
    const data = standard_data_state();
    data.indstillinger.lagfordeling.samlet_minimum = false;
    data.indstillinger.lagfordeling.standard_under_minimum = mode;
    const result = dimensioner(
      dimensioningInput({ std_eu_slider: 33, std_geonet: 'Tensar TriAx TX160' }, data),
    )!;
    assert.equal(result.t_uarmeret_mm, 350);
    assert.ok(result.res_1 && 't_armeret_mm' in result.res_1 && 'reduktion_mm' in result.res_1);
    assert.equal(result.res_1!.t_armeret_mm, thickness);
    assert.equal(result.res_1!.reduktion_mm, reduction);
  });
}

test('F-06.6: bundsikringskrav matcher originalens Eu30/klasse4-eksempel', () => {
  // Original: app.py:10172–10179, krav om bundsikring med restlag=vd.
  const data = standard_data_state();
  data.indstillinger.lagfordeling.restlag = 'vd';
  for (const required of [false, true, false]) {
    data.indstillinger.lagfordeling.kraev_bundsikring = required;
    const result = dimensioner(
      dimensioningInput({ std_eu_slider: 30, std_geonet: 'Tensar TriAx TX160' }, data),
    )!;
    assert.ok(
      result.res_1 &&
        't_armeret_mm' in result.res_1 &&
        'reduktion_mm' in result.res_1 &&
        't_uarmeret_phi_kor_mm' in result.res_1,
    );
    // Eksemplet beskriver det viste krav efter lagminimum, ikke basistykkelsen før tillæg.
    assert.equal(result.res_1.t_uarmeret_phi_kor_mm, 450);
    assert.equal(result.res_1!.t_armeret_mm, required ? 450 : 250);
    assert.equal(result.res_1!.reduktion_mm, required ? 0 : 200);
  }
});
