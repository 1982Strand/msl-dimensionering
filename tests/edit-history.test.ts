import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { standard_data_state, aktivt_beregningsgrundlag } from '../src/engine/auto-edit.ts';
import { review_table } from '../src/engine/edit-review.ts';
import type { TableSelection } from '../src/engine/edit-review.ts';
import type { DesignDiagram } from '../src/engine/editing.ts';
import { EditSession } from '../src/engine/edit-session.ts';
import { dimensioner } from '../src/engine/dimensionering.ts';

const references = JSON.parse(
  readFileSync(new URL('./cases/review-cases.json', import.meta.url), 'utf8'),
) as {
  cases: {
    id: string;
    input: DesignDiagram;
    expected: { celler: [number, string][]; nye: number[]; fjernede: number };
  }[];
};
for (const c of references.cases)
  test(`${c.id}: original diagram change markers`, () => {
    const state = standard_data_state();
    state.designdiagrammer[3] = structuredClone(c.input);
    const changes = review_table(state, { section: 'designdiagrammer', diagram_nr: 4 }, true);
    const cells = changes
      .filter((r) => r.kind === 'changed')
      .flatMap((r) => r.changedFields.map((f) => [Number(r.key), f] as [number, string]))
      .sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
    assert.deepEqual(
      {
        celler: cells,
        nye: changes
          .filter((r) => r.kind === 'added')
          .map((r) => Number(r.key))
          .sort((a, b) => a - b),
        fjernede: changes.filter((r) => r.kind === 'removed').length,
      },
      c.expected,
    );
  });
test('unchanged defaults have no changed rows in any table', () => {
  const state = standard_data_state();
  const tables: TableSelection[] = [
    { section: 'materialer' },
    { section: 'vejdim_koersel_raekker' },
    ...state.designdiagrammer.map((d) => ({
      section: 'designdiagrammer' as const,
      diagram_nr: d.diagram_nr,
    })),
  ];
  for (const t of tables) assert.deepEqual(review_table(state, t, true), []);
});
test('changed material fields expose the original and current values', () => {
  const state = standard_data_state();
  state.materialer[0].phi = 39;
  state.materialer[0].anvendelse = 'Note';
  const r = review_table(state, { section: 'materialer' }, true);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].changedFields, ['phi', 'anvendelse']);
  assert.equal(r[0].standard!.phi, 37);
  assert.equal(r[0].current!.phi, 39);
  r[0].current!.phi = 50;
  assert.equal(state.materialer[0].phi, 39);
});
test('new and missing materials are distinct from changed standard rows', () => {
  const state = standard_data_state(),
    name = state.materialer[0].navn;
  state.materialer[0].navn = 'Eget materiale';
  const r = review_table(state, { section: 'materialer' }, true);
  assert.equal(r.find((r) => r.key === 'Eget materiale')!.kind, 'added');
  assert.equal(r.find((r) => r.key === name)!.kind, 'removed');
});
test('undo and redo recalculate from exact prior diagram data and request saves', () => {
  const session = new EditSession(),
    diagrams = session.snapshot().designdiagrammer;
  diagrams[3].rows.find((r) => r.eu === 10)!.t_1_lag_cm = 80;
  const calc = () =>
    dimensioner({
      tilstand: 'Standard',
      eu: 10,
      grundlag: { type: 'belastningsklasse', klasse: 4 },
      ...aktivt_beregningsgrundlag(session.snapshot()),
    })!.res_1;
  const thickness = () => {
    const r = calc();
    assert.ok('t_armeret_mm' in r);
    return r.t_armeret_mm;
  };
  assert.equal(thickness(), 650);
  session.edit({ section: 'designdiagrammer', value: diagrams });
  assert.equal(thickness(), 800);
  assert.equal(session.undo().persistence?.operation.kind, 'write');
  assert.equal(thickness(), 650);
  assert.equal(session.redo().persistence?.operation.kind, 'write');
  assert.equal(thickness(), 800);
});
test('history spans sections and new edits after undo clear redo', () => {
  const session = new EditSession(),
    materials = session.snapshot().materialer;
  materials[0].phi = 39;
  session.edit({ section: 'materialer', value: materials });
  const settings = session.snapshot().indstillinger;
  settings.afrunding.trin_mm = 10;
  session.edit({ section: 'indstillinger', value: settings });
  session.undo();
  assert.equal(session.snapshot().indstillinger.afrunding.trin_mm, 50);
  assert.equal(session.snapshot().materialer[0].phi, 39);
  assert.equal(session.canRedo, true);
  materials[0].phi = 40;
  session.edit({ section: 'materialer', value: materials });
  assert.equal(session.canRedo, false);
});
test('invalid and unchanged edits neither add history nor clear redo', () => {
  const session = new EditSession(),
    m = session.snapshot().materialer;
  m[0].phi = 39;
  session.edit({ section: 'materialer', value: m });
  session.undo();
  session.edit({ section: 'materialer', value: [] });
  session.edit({ section: 'materialer', value: session.snapshot().materialer });
  assert.equal(session.canUndo, false);
  assert.equal(session.canRedo, true);
});
test('restore one material field keeps other edits and can be undone', () => {
  const session = new EditSession(),
    m = session.snapshot().materialer;
  m[0].phi = 39;
  m[0].anvendelse = 'Bevar';
  session.edit({ section: 'materialer', value: m });
  const result = session.restoreDefault({
    table: { section: 'materialer' },
    key: m[0].navn,
    index: 0,
    field: 'phi',
  });
  assert.equal(result.state.materialer[0].phi, 37);
  assert.equal(result.state.materialer[0].anvendelse, 'Bevar');
  assert.equal(result.persistence?.operation.kind, 'write');
  session.undo();
  assert.equal(session.snapshot().materialer[0].phi, 39);
});
test('restore a missing diagram row and undo restores its absence exactly', () => {
  const session = new EditSession(),
    d = session.snapshot().designdiagrammer;
  d[3].rows = d[3].rows.filter((r) => r.eu !== 10);
  session.edit({ section: 'designdiagrammer', value: d });
  session.restoreDefault({
    table: { section: 'designdiagrammer', diagram_nr: 4 },
    key: '10',
    index: null,
  });
  assert.ok(session.snapshot().designdiagrammer[3].rows.some((r) => r.eu === 10));
  session.undo();
  assert.equal(
    session.snapshot().designdiagrammer[3].rows.some((r) => r.eu === 10),
    false,
  );
});
test('custom row without a default cannot be silently reset or deleted', () => {
  const session = new EditSession(),
    m = session.snapshot().materialer;
  m[0].navn = 'Eget';
  session.edit({ section: 'materialer', value: m });
  const result = session.restoreDefault({
    table: { section: 'materialer' },
    key: 'Eget',
    index: 0,
  });
  assert.equal(result.changed, false);
  assert.equal(result.persistence, null);
  assert.equal(result.state.materialer[0].navn, 'Eget');
});
test('reset itself is undoable and snapshots cannot mutate history', () => {
  const session = new EditSession(),
    m = session.snapshot().materialer;
  m[0].phi = 39;
  session.edit({ section: 'materialer', value: m });
  const result = session.edit({ reset: 'materialer' });
  result.state.materialer[0].phi = 60;
  assert.equal(session.snapshot().materialer[0].phi, 37);
  session.undo();
  assert.equal(session.snapshot().materialer[0].phi, 39);
  session.redo();
  assert.equal(session.snapshot().materialer[0].phi, 37);
});
