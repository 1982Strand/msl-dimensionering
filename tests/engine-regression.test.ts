import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as a from '../src/engine/afrunding.ts';
import * as l from '../src/engine/lagfordeling.ts';
import * as e from '../src/engine/enhed.ts';
import { beregn } from '../src/engine/calculator.ts';
import * as p from '../src/engine/placement.ts';
import * as t from '../src/engine/traffic.ts';
import { cv_til_eu } from '../src/engine/data.ts';
import { beregn_alle_produkter, grupper_produkter } from '../src/engine/products.ts';
import type { ProductsInput, ProductRow } from '../src/engine/products.ts';
import type { BasisTable } from '../src/engine/types.ts';
import { valider_input } from '../src/engine/validators.ts';
import type { ValidationInput } from '../src/engine/validators.ts';
import type { CalculationInput, LayerSpec } from '../src/engine/types.ts';
interface Case {
  id: string;
  group: string;
  function: string;
  input: Record<string, unknown>;
  expected: unknown;
}
const reference = JSON.parse(
  readFileSync(new URL('./cases/core-cases.json', import.meta.url), 'utf8'),
) as { cases: Case[]; defaults: Record<string, unknown> };
// Only adapters dispatch inputs. Expected values remain exclusively in frozen Python fixtures.
const handlers: Record<string, (input: Record<string, unknown>) => unknown> = {
  'core.validators.valider_input': (i) => valider_input(i as unknown as ValidationInput),
  'core.calculator.beregn_alle_produkter': (i) =>
    beregn_alle_produkter(i as unknown as ProductsInput),
  'core.calculator.grupper_produkter': (i) =>
    grupper_produkter(i.produkter as ProductRow[], i.tolerance_mm as number),
  'core.placement.check_geonet_placement': (i) =>
    p.check_geonet_placement(i as unknown as p.PlacementInput),
  'core.placement.overlap_krav_mm': (i) =>
    p.overlap_krav_mm(i.krav as p.Requirements, i.eu as number | null),
  'core.data.normaliser_yder_regler': (i) => t.normaliser_yder_regler(i.regler),
  'core.data.cv_til_eu': (i) => cv_til_eu(i.cv as number),
  'core.data.trafik_opslag': (i) =>
    t.trafik_opslag(
      i.t_klasse as string,
      i.eu as number,
      i.koersler as t.TrafficRuns | null,
      i.t_basis_table as BasisTable | null,
      i.yder_regler,
    ),
  'core.data._opslag_for_tykkelse': (i) =>
    t.opslag_for_tykkelse(
      i.eu as number,
      i.tykkelse as number,
      i.t_basis_table as BasisTable | null,
      i.yder_regler,
    ),
  'core.calculator.beregn': (input) => beregn(input as unknown as CalculationInput),
  'core.afrunding.rund_op': (input) =>
    a.rund_op(input.vaerdi as number | null, input.trin as number),
  'core.afrunding.afrund_phi': (input) =>
    a.afrund_phi(input.phi as number | null, input.metode as string),
  'core.afrunding.normaliser': (input) => a.normaliser(input.indstilling),
  'core.lagfordeling.normaliser': (input) => l.normaliser(input.indstilling),
  'core.lagfordeling.fordel_soejle': (input) =>
    l.fordel_soejle(
      input.spec as LayerSpec,
      input.total_mm as number | null,
      input.trin as number,
      input.t_uarm_mm as number | null,
    ),
  'core.enhed.laengde': (input) => e.laengde(input.v_mm as number | null, input.enhed as string),
};
test('Every frozen case has a TypeScript adapter', () => {
  assert.deepEqual(
    reference.cases.filter((c) => !(c.function in handlers)).map((c) => c.id),
    [],
  );
  assert.equal(reference.cases.length, 2062);
});
for (const c of reference.cases) {
  test(c.id, () => {
    const input = structuredClone(c.input);
    assert.deepEqual(handlers[c.function](input), c.expected);
    assert.deepEqual(input, c.input, 'Engine must not mutate input');
  });
}
test('Built-in settings match approved Python defaults', () => {
  assert.deepEqual(a.normaliser(null), reference.defaults.afrunding);
  assert.deepEqual(l.normaliser(null), reference.defaults.lagfordeling);
  assert.equal(e.STANDARD_ENHED, reference.defaults.enhed);
});
