import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  apply_auto_edit,
  standard_data_state,
  aktivt_beregningsgrundlag,
} from '../src/engine/auto-edit.ts';
import { dimensioner } from '../src/engine/dimensionering.ts';

test('valid diagram edits immediately change the active calculation, with an automatic write', () => {
  const state = standard_data_state(),
    before = structuredClone(state);
  const diagrams = structuredClone(state.designdiagrammer);
  diagrams.find((d) => d.diagram_nr === 4)!.rows.find((r) => r.eu === 10)!.t_1_lag_cm = 80;
  const input = {
    tilstand: 'Standard' as const,
    eu: 10,
    grundlag: { type: 'belastningsklasse' as const, klasse: 4 },
  };
  const beforeResult = dimensioner({ ...input, ...aktivt_beregningsgrundlag(state) })!.res_1;
  assert.ok('t_armeret_mm' in beforeResult);
  assert.equal(beforeResult.t_armeret_mm, 650);
  const edit = apply_auto_edit(state, { section: 'designdiagrammer', value: diagrams });
  assert.equal(edit.changed, true);
  assert.deepEqual(edit.errors, []);
  assert.equal(edit.persistence?.operation.kind, 'write');
  const afterResult = dimensioner({ ...input, ...aktivt_beregningsgrundlag(edit.state) })!.res_1;
  assert.ok('t_armeret_mm' in afterResult);
  assert.equal(afterResult.t_armeret_mm, 800);
  assert.deepEqual(state, before);
});
test('duplicate diagram rows keep the last valid data and are not saved', () => {
  const state = standard_data_state(),
    diagrams = structuredClone(state.designdiagrammer);
  diagrams[0].rows.push({ ...diagrams[0].rows[0] });
  const edit = apply_auto_edit(state, { section: 'designdiagrammer', value: diagrams });
  assert.equal(edit.state, state);
  assert.equal(edit.persistence, null);
  assert.equal(edit.changed, false);
  assert.deepEqual(edit.errors, [
    'Diagramdata er ikke gemt, fordi der er fejl: Diagram 1: Eᵤ 1 MPa findes flere gange.',
  ]);
});
test('empty/duplicate material lists keep the last valid data and original errors', () => {
  const state = standard_data_state();
  for (const [value, message] of [
    [[], 'Materialelisten skal indeholde mindst ét materiale.'],
    [[{ navn: 'Grus' }, { navn: 'grus' }], 'Materialenavne skal være unikke. Ret duplikater: grus'],
  ] as const) {
    const edit = apply_auto_edit(state, { section: 'materialer', value });
    assert.equal(edit.state, state);
    assert.equal(edit.persistence, null);
    assert.deepEqual(edit.errors, [message]);
  }
});
test('materials and settings update directly without an edit/save mode', () => {
  let state = standard_data_state();
  const materials = structuredClone(state.materialer);
  materials[0].phi = 39;
  const materialEdit = apply_auto_edit(state, { section: 'materialer', value: materials });
  assert.equal(materialEdit.state.materialer[0].phi, 39);
  assert.equal(materialEdit.persistence?.section, 'materialer');
  state = materialEdit.state;
  const settings = structuredClone(state.indstillinger);
  settings.afrunding.trin_mm = 10;
  const edit = apply_auto_edit(state, { section: 'indstillinger', value: settings });
  assert.equal(edit.state.indstillinger.afrunding.trin_mm, 10);
  assert.equal(edit.persistence?.operation.kind, 'write');
  assert.equal(edit.state.materialer[0].phi, 39);
});
test('unchanged table data does not produce repeated writes', () => {
  const state = standard_data_state();
  const edit = apply_auto_edit(state, {
    section: 'materialer',
    value: structuredClone(state.materialer),
  });
  assert.equal(edit.changed, false);
  assert.equal(edit.persistence, null);
});
test('resetting one diagram preserves other custom diagrams', () => {
  let state = standard_data_state();
  const diagrams = structuredClone(state.designdiagrammer);
  diagrams[0].rows[0].t_1_lag_cm = 123;
  diagrams[1].rows[0].t_1_lag_cm = 456;
  state = apply_auto_edit(state, { section: 'designdiagrammer', value: diagrams }).state;
  const edit = apply_auto_edit(state, { reset: 'designdiagrammer', diagram_nr: 1 });
  assert.deepEqual(edit.state.designdiagrammer[0], standard_data_state().designdiagrammer[0]);
  assert.equal(edit.state.designdiagrammer[1].rows[0].t_1_lag_cm, 456);
  assert.equal(edit.persistence?.operation.kind, 'write');
});
test('VejDim edit rebuilds the lookup and returning to defaults removes the override', () => {
  const state = standard_data_state(),
    runs = structuredClone(state.vejdim_koersel_raekker);
  runs.find((r) => r.T === 'T4' && r.eu === 10)!.t_SG_mm = 999;
  const changed = apply_auto_edit(state, { section: 'vejdim_koersel_raekker', value: runs });
  assert.deepEqual(aktivt_beregningsgrundlag(changed.state).koersler.T4[10], {
    sg: 999,
    bl: runs.find((r) => r.T === 'T4' && r.eu === 10)!.t_BL_mm,
  });
  const reset = apply_auto_edit(changed.state, { reset: 'vejdim_koersel_raekker' });
  assert.deepEqual(reset.state.vejdim_koersel_raekker, state.vejdim_koersel_raekker);
  assert.equal(reset.persistence?.operation.kind, 'delete');
});
