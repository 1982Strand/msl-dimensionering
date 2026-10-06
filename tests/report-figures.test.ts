import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mpa } from './enhed-mpa.ts';
import {
  reportFigures,
  FIGUR_MAKS_MM,
  FIGUR_MM_PR_PX,
  type ReportFigureChoices,
} from '../src/report/report-figures.ts';
import type { DimensioningResult } from '../src/engine/construction.ts';
import type { BasisTable } from '../src/engine/types.ts';

interface Case {
  id: string;
  dimensioning: DimensioningResult;
  settings: { opbygning: unknown; lagfordeling: unknown };
  choices: ReportFigureChoices;
  calls: { function: string; kwargs: Record<string, unknown> }[];
  exports: {
    kwargs: { width: number; height: number; scale: number };
    layout: { title?: unknown; margin: unknown };
  }[];
}
const cases = ['report-figure-cases.json', 'report-figure-extra-cases.json'].flatMap(
  (name) =>
    mpa(JSON.parse(readFileSync(new URL(`../reference/${name}`, import.meta.url), 'utf8')))
      .cases as Case[],
);
const table = JSON.parse(
  readFileSync(new URL('../reference/ui-flows.json', import.meta.url), 'utf8'),
).defaults.aktiv_t_basis_table as BasisTable;
for (const c of cases)
  test(`R3 ${c.id}: hele rapportkaldet og eksportmål matcher originalen præcist`, () => {
    const actual = reportFigures(c.dimensioning, c.settings, table, c.choices);
    assert.deepEqual(
      actual.constructionCall,
      c.calls.find((c) => c.function === 'render_opbygning_png')?.kwargs ?? null,
    );
    assert.deepEqual(
      actual.diagramCall,
      c.calls.find((c) => c.function === 'render_personligt_designdiagram_png')?.kwargs ?? null,
    );
    const figures = [actual.visualisering, actual.designdiagram].filter((x) => x !== null);
    assert.equal(figures.length, c.exports.length);
    figures.forEach((f, i) => {
      const e = c.exports[i];
      assert.deepEqual(
        { width: f.export.width, height: f.export.height, scale: f.export.scale },
        e.kwargs && { width: e.kwargs.width, height: e.kwargs.height, scale: e.kwargs.scale },
      );
      assert.deepEqual(f.export.margin, e.layout.margin);
      assert.deepEqual(f.export.title, e.layout.title);
      assert.match(f.svg, /^<svg /);
      if (f === actual.designdiagram) {
        assert.match(f.svg, new RegExp(`width="${e.kwargs.width}" height="${e.kwargs.height}"`));
        assert.equal(f.width_mm, FIGUR_MAKS_MM);
      } else {
        // Den fælles opbygnings-SVG sættes i originalens målestok (1000 px = 16 cm).
        const natural = Number(/width="([\d.]+)"/.exec(f.svg)![1]);
        assert.equal(f.width_mm, Math.min(FIGUR_MAKS_MM, natural * FIGUR_MM_PR_PX));
      }
    });
  });
test('R3: alle otte optagelser er dækket, inkl. ingen snit og ren input-søjle', () =>
  assert.equal(cases.length, 8));
test('R3: fravalgt indtastet snit fjerner linje/status, men diagramvalg er uafhængige', () => {
  const c = cases.find((c) => c.id === 'RFIG-custom-input-pure')!;
  const f = reportFigures(c.dimensioning, c.settings, table, {
    ...c.choices,
    rap_vis_indtastet: false,
    rap_vis_1lag: true,
    rap_dd_vis_din_prik: false,
    rap_dd_vis_lag_prikker: false,
  });
  assert.equal(f.constructionCall!.reference_mm, null);
  assert.ok(
    f.constructionCall!.snit_liste.every(
      (s) => s.status_tekst === null && s.t_indtastet_mm === null,
    ),
  );
  assert.equal(f.diagramCall!.t_indtastet_mm, null);
  assert.equal(f.diagramCall!.t_1_lag_mm, null);
  assert.equal(f.diagramCall!.t_2_lag_best_mm, null);
});
