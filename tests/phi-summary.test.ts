import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { phiSummary, phiTableData } from '../src/engine/phi-summary.ts';
import type { DimensioningInput } from '../src/engine/dimensionering.ts';
const reference = JSON.parse(
  readFileSync(new URL('./cases/phi-summary.json', import.meta.url), 'utf8'),
);

test('M6: active original formulas, rounding, visibility and table data match eleven UI cases exactly', () => {
  for (const c of reference.cases) {
    const v = c.inputs;
    const input: DimensioningInput = {
      tilstand: v.mode,
      eu: v.eu,
      grundlag:
        v.basis === 'Trafikklasse'
          ? { type: 'trafikklasse', t_klasse: v.traffic }
          : { type: 'belastningsklasse', klasse: 4 },
      materialer: v.materials,
      phi_manuel: v.phi_manual,
      indstillinger: v.settings,
    };
    assert.deepEqual(phiSummary(input), c.expected, c.id);
  }
});
test('M6: original helper preserves empty, zero and percentage weights for M1 reuse', () => {
  for (const c of reference.helper_cases)
    assert.deepEqual(phiTableData(c.materials), c.expected, c.id);
});
