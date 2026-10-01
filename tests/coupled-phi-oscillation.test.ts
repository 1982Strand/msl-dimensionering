import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beregn } from '../src/engine/calculator.ts';
import type { CalculationInput } from '../src/engine/types.ts';

// F-06.4: koblet φ, der ikke bliver stabil efter originalens 12 gentagelser. Originalen
// (core/calculator.py, _beregn_med_soejle_phi) bruger da den laveste mødte φᵥ for hver
// opbygning. Tilfældene er fundet og optaget af tools/capture_coupled_phi_oscillation.py.
const reference = JSON.parse(
  readFileSync(new URL('../reference/coupled-phi-oscillation-cases.json', import.meta.url), 'utf8'),
) as {
  cases: {
    id: string;
    input: Record<string, unknown>;
    expected: unknown;
    lookups: number;
    stable: boolean;
  }[];
};

test('F-06.4: referencen dækker kun ustabile tilfælde for begge φ-regler og lagtilstande', () => {
  assert.equal(reference.cases.length, 8);
  // 1 første opslag + 12 gentagelser + 1 konservativt slutopslag = aldrig stabil.
  assert.ok(reference.cases.every((c) => !c.stable && c.lookups === 14));
  const rules = new Set(
    reference.cases.map(
      (c) => (c.input.afrunding as { lagopbygning: { phi_regel: string } }).lagopbygning.phi_regel,
    ),
  );
  assert.deepEqual([...rules].sort(), ['laveste', 'soejle']);
  assert.deepEqual([...new Set(reference.cases.map((c) => c.input.lag_mode))].sort(), [
    '1_lag',
    '2_lag',
  ]);
});

for (const c of reference.cases)
  test(`F-06.4: ${c.id} afslutter konservativt som originalen`, () => {
    const input = structuredClone(c.input);
    assert.deepEqual(beregn(input as unknown as CalculationInput), c.expected);
    assert.deepEqual(input, c.input, 'Motoren må ikke ændre input');
  });
