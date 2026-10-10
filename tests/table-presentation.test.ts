import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mpa } from './enhed-mpa.ts';
import {
  rawDiagram,
  diagramCoverage,
  runsCsv,
  correlationRows,
  asphaltRows,
} from '../src/engine/table-presentation.ts';
import type { DesignDiagram, RunRow } from '../src/engine/editing.ts';
const reference = mpa(
  JSON.parse(readFileSync(new URL('./cases/table-ui-cases.json', import.meta.url), 'utf8')),
) as {
  charts: { input: DesignDiagram; expected: unknown }[];
  csv: { input: RunRow[]; expected: string }[];
  presentation: { input: RunRow[]; expected: unknown; asfalt: unknown }[];
  coverage: { input: DesignDiagram; expected: string }[];
};
reference.charts.forEach((c, i) =>
  test(`original raw chart ${i}`, () => assert.deepEqual(rawDiagram(c.input), c.expected)),
);
reference.csv.forEach((c, i) =>
  test(`original CSV ${i}`, () => assert.equal(runsCsv(c.input), c.expected)),
);
reference.presentation.forEach((c, i) => {
  test(`original correlation labels ${i}`, () =>
    assert.deepEqual(correlationRows(c.input), c.expected));
  test(`original asphalt table ${i}`, () => assert.deepEqual(asphaltRows(c.input), c.asfalt));
});
reference.coverage.forEach((c, i) =>
  test(`original diagram coverage ${i}`, () => assert.equal(diagramCoverage(c.input), c.expected)),
);
