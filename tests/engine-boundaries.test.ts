import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pythonFixed, pythonRound } from '../src/engine/python-numbers.ts';
import { tal } from '../src/engine/enhed.ts';
import { normaliser as afrunding } from '../src/engine/afrunding.ts';
import {
  normaliser as lagfordeling,
  klasse_for_eo,
  standard_spec,
} from '../src/engine/lagfordeling.ts';
import { beregn } from '../src/engine/calculator.ts';
import type { CalculationInput } from '../src/engine/types.ts';
interface Case {
  id: string;
  function: string;
  input: Record<string, unknown>;
  expected: unknown;
}
const fixture = JSON.parse(
  readFileSync(new URL('../reference/engine-boundaries.json', import.meta.url), 'utf8'),
) as { cases: Case[] };
const handlers: Record<string, (i: Record<string, unknown>) => unknown> = {
  pythonRound: (i) => pythonRound(i.value as number, i.digits as number),
  pythonFixed: (i) => pythonFixed(i.value as number, i.digits as number, true),
  'enhed.tal': (i) => tal(i.v_mm as number, i.enhed as string, i.decimaler as number),
  'afrunding.normaliser': (i) => afrunding(i.indstilling),
  'lagfordeling.normaliser': (i) => lagfordeling(i.indstilling),
  'lagfordeling.klasse_for_eo': (i) => klasse_for_eo(i.eo as number | null),
  'lagfordeling.standard_spec': (i) => standard_spec(i.indstilling, i.minimum as number),
  'calculator.beregn': (i) => beregn(i as unknown as CalculationInput),
};
for (const c of fixture.cases)
  test(c.id + ' ' + c.function, () =>
    assert.deepEqual(handlers[c.function](structuredClone(c.input)), c.expected),
  );
