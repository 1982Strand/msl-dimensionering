import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { eoSteps, exampleCell, outsideRuleLine } from '../src/engine/table-explanation.ts';
import { koersler_fra_raekker, type RunRow } from '../src/engine/editing.ts';
const reference = JSON.parse(
  readFileSync(new URL('../reference/table-explanation-cases.json', import.meta.url), 'utf8'),
) as {
  cases: {
    rows: RunRow[];
    selected: unknown;
    samples: { traffic: string; eu: number; expected: unknown }[];
  }[];
  rules: { input: unknown; expected: string }[];
};
reference.cases.forEach((c, i) => {
  const runs = koersler_fra_raekker(c.rows);
  for (const sample of c.samples)
    test(`original explanation ${i} ${sample.traffic} Eu ${sample.eu}`, () =>
      assert.deepEqual(eoSteps(sample.traffic, sample.eu, runs), sample.expected));
  test(`original explanation selection ${i}`, () =>
    assert.deepEqual(exampleCell(runs), c.selected));
});
reference.rules.forEach((c, i) =>
  test(`original outside rule caption ${i}`, () =>
    assert.equal(outsideRuleLine(c.input), c.expected)),
);
