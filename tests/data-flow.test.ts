import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as correlation from '../src/engine/correlation.ts';
import * as editing from '../src/engine/editing.ts';
import { trafik_opslag } from '../src/engine/traffic.ts';
import { beregn } from '../src/engine/calculator.ts';
interface Case {
  id: string;
  function: string;
  args: unknown[];
  expected: { value?: unknown; error?: string };
}
const r = JSON.parse(
  readFileSync(new URL('./cases/data-flow-cases.json', import.meta.url), 'utf8'),
) as { cases: Case[] };
function edited_flow(input: { diagrammer: unknown; indstillinger: unknown; koersler: unknown }) {
  const [diagrams, errors] = editing.normaliser_designdiagrammer(input.diagrammer);
  const table = editing.generer_t_basis_table_fra_diagrammer(diagrams);
  const settings = editing.normaliser_indstillinger(input.indstillinger);
  const rows = editing.normaliser_koersel_raekker(input.koersler);
  const runs = editing.koersler_fra_raekker(rows);
  return {
    diagramfejl: errors,
    resultat: beregn({
      eu: 10,
      eo: 80,
      phi: 38.5,
      net_korrektion: -0.15,
      lag_mode: '1_lag',
      t_basis_table: table,
      afrunding: settings.afrunding,
    }),
    trafik: trafik_opslag('T4', 10, runs, table, settings.yderomraade),
    korrelation: correlation.korrelation_fra_koersler(runs, table, settings.yderomraade),
  };
}
const handlers = { ...correlation, edited_flow };
for (const c of r.cases)
  test(`${c.id}: ${c.function}`, () => {
    const fn = handlers[c.function as keyof typeof handlers];
    assert.equal(typeof fn, 'function');
    const args = structuredClone(c.args);
    const run = () => Reflect.apply(fn, null, args);
    if (c.expected.error) assert.throws(run, { name: c.expected.error });
    else assert.deepEqual(run(), c.expected.value);
    assert.deepEqual(args, c.args, 'Caller-owned data is unchanged');
  });
test('all data-flow expectations have adapters', () => assert.equal(r.cases.length, 86));
