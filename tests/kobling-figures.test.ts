import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dimensioner, type DimensioningInput } from '../src/engine/dimensionering.ts';
import { koblingExplanation } from '../src/engine/kobling-explanation.ts';
import {
  diagramFigure,
  koerslerFigure,
  koblingScale,
  koblingTicks,
  type CouplingFigureModel,
} from '../src/engine/kobling-figures.ts';
import { couplingSvgScales, renderCouplingFigureSvg } from '../src/engine/kobling-figures-svg.ts';
import { VEJDIM_KOERSLER } from '../src/engine/traffic.ts';
import type { BasisTable } from '../src/engine/types.ts';
import { tal } from '../src/engine/enhed.ts';
import type { DiagramPair } from '../src/engine/personal-diagram-svg.ts';

type DiagramArgs = [
  number,
  number,
  number[],
  BasisTable,
  number,
  number,
  [number, string, string][],
];
type RunsArgs = [string, number, { ubundet_mm: number }];
type Capture =
  | { function: '_kob_figur_diagram'; args: DiagramArgs; svg: string }
  | { function: '_kob_figur_koersler'; args: RunsArgs; svg: string };
const reference = JSON.parse(
  readFileSync(new URL('../reference/kobling-cases.json', import.meta.url), 'utf8'),
) as {
  cases: {
    id: string;
    input: DimensioningInput;
    figures: Capture[];
    expected: { steps: { figure: null | { caption: string; legend: string[] } }[] };
  }[];
};
const roles = {
  '#15211A': 'ustab',
  '#2C5AA0': 'lag1',
  '#7B3F8C': 'lag2',
  '#1B6B34': 'ind',
  '#C4CAC5': 'neutral',
} as const;
const role = (color: string) => {
  assert.ok(color in roles, color);
  return roles[color as keyof typeof roles];
};
const attrs = (tag: string) =>
  Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const tags = (svg: string, name: string) =>
  [...svg.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map((m) => attrs(m[0]));
const texts = (svg: string) => [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

// Independent reconstruction from captured arguments, not the production model/scales.
// Constants and arithmetic are from app.py a330cfd (_kob_skala/_kob_figur_diagram).
function originalRange(values: number[], log = false): DiagramPair {
  let low = Math.min(...values),
    high = Math.max(...values);
  if (high <= low) high = low + 1;
  if (log) {
    low = Math.log(low);
    high = Math.log(high);
  }
  const span = high - low;
  return [low - span * 0.08, high + span * 0.08];
}
function originalCurve(table: BasisTable, eo: number, mode: string, factor: number): DiagramPair[] {
  const columns = [30, 45, 60, 80, 120, 150];
  return Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((eu) => {
      const row = table[eu];
      let v = row[eo]?.[mode] ?? null;
      if (!columns.includes(eo)) {
        const lower = columns.filter((e) => e < eo).at(-1),
          upper = columns.find((e) => e > eo);
        const a = lower === undefined ? null : row[lower]?.[mode],
          b = upper === undefined ? null : row[upper]?.[mode];
        v = a == null || b == null ? null : a + ((eo - lower!) / (upper! - lower!)) * (b - a);
      }
      return v === null ? [] : [[v * 10 * factor, eu] as DiagramPair];
    });
}

/** Decode original SVG into data intervals. Its coordinates were written to 0.1 SVG unit.
 * We never compare the new renderer's pixel coordinates. Intervals express only the
 * information loss in the saved SVG; all raw argument-derived data is checked EXACTLY.
 */
function encodedPoint(pair: DiagramPair, x: string, y: string, m: CouplingFigureModel) {
  const inverseX = (v: number) => m.x.range[0] + ((v - 50) / 330) * (m.x.range[1] - m.x.range[0]);
  const inverseY = (v: number) => {
    const raw = m.y.range[0] + ((208 - v) / 172) * (m.y.range[1] - m.y.range[0]);
    return m.y.log ? Math.exp(raw) : raw;
  };
  const xv = Number(x),
    yv = Number(y);
  assert.ok(pair[0] >= inverseX(xv - 0.05) && pair[0] <= inverseX(xv + 0.05), `x data ${pair[0]}`);
  assert.ok(pair[1] >= inverseY(yv + 0.05) && pair[1] <= inverseY(yv - 0.05), `y data ${pair[1]}`);
}
function encodedLine(pairs: DiagramPair[], tag: Record<string, string>, m: CouplingFigureModel) {
  const saved = tag.points
    .trim()
    .split(/\s+/)
    .map((s) => s.split(','));
  assert.equal(saved.length, pairs.length);
  pairs.forEach((p, i) => encodedPoint(p, saved[i][0], saved[i][1], m));
}

const allModels: CouplingFigureModel[] = [];
for (const c of reference.cases) {
  const explanation = koblingExplanation(c.input, dimensioner(c.input));
  const figures = explanation.steps.flatMap((s) => (s.figure?.model ? [s.figure] : []));
  test(`M1 ${c.id}: same figure visibility as original`, () =>
    assert.equal(figures.length, c.figures.length));
  c.figures.forEach((saved, index) => {
    const fig = figures[index],
      m = fig.model!;
    allModels.push(m);
    test(`M1 ${c.id} ${saved.function}: exact data/axes/labels; original SVG data encoding`, () => {
      const originalFig = c.expected.steps.flatMap((s) => (s.figure ? [s.figure] : []))[index];
      assert.equal(fig.caption, originalFig.caption);
      assert.deepEqual(fig.legend, originalFig.legend);
      assert.deepEqual(
        m.legend.map((e) => e.text),
        originalFig.legend,
      );
      const unit =
        (c.input.indstillinger as { opbygning?: { enhed?: string } } | undefined)?.opbygning
          ?.enhed === 'cm'
          ? 'cm'
          : 'mm';
      assert.equal(m.unit, unit);
      if (saved.function === '_kob_figur_diagram') {
        const [eu, eo, neighbours, table, phi, net, points] = saved.args;
        const correction = -0.02 * (phi - 37);
        const expectedCurves = [
          ...neighbours.map((e) => ({
            role: 'neutral',
            eo: e,
            dashed: true,
            points: originalCurve(table, e, 'uarmeret', 1 + correction),
          })),
          ...['1_lag', '2_lag'].map((mode, i) => ({
            role: i ? 'lag2' : 'lag1',
            eo,
            dashed: false,
            points: originalCurve(table, eo, mode, 1 + correction + net),
          })),
          {
            role: 'ustab',
            eo,
            dashed: false,
            points: originalCurve(table, eo, 'uarmeret', 1 + correction),
          },
        ];
        assert.deepEqual(
          m.curves.map(({ role, eo, dashed, points }) => ({ role, eo, dashed, points })),
          expectedCurves,
        );
        assert.deepEqual(
          m.points.map((p) => [p.x, p.y, p.role, p.hollow]),
          points.map(([x, color, form]) => [x, eu, role(color), form === 'ring']),
        );
        assert.deepEqual(
          m.x.range,
          originalRange([
            ...expectedCurves.flatMap((curve) => curve.points.map((p) => p[0])),
            ...points.map((p) => p[0]),
          ]),
        );
        assert.deepEqual(m.y.range, originalRange([...Object.keys(table).map(Number), eu]));
        assert.equal(m.y.log, false);
        const labelAnchors = expectedCurves.slice(0, neighbours.length).flatMap((curve, i) => {
          if (curve.points.length < 2) return [];
          const position = (curve.points.length - 1) * (i ? 0.24 : 0.6);
          const floor = Math.floor(position),
            fraction = position - floor;
          // Python round: ties to even, independently of the production helper.
          const point = floor + (fraction > 0.5 || (fraction === 0.5 && floor % 2 !== 0) ? 1 : 0);
          return [curve.points[point]];
        });
        assert.deepEqual(
          m.labels.slice(0, -1).map((l) => l.at),
          labelAnchors,
        );
        assert.deepEqual(m.labels.at(-1)!.at, [m.x.range[0], eu]);
      } else {
        const [trafficClass, eu, t1] = saved.args;
        // Captured calls use the standard runs, whose provenance is independently
        // covered by traffic reference tests. Also verify every run against SVG below.
        const runs = c.input.koersler ?? VEJDIM_KOERSLER;
        const pts: DiagramPair[] = Object.entries(runs[trafficClass])
          .sort(([a], [b]) => +a - +b)
          .flatMap(([e, v]) => {
            const t = typeof v === 'object' ? (v.sg || 0) + (v.bl || 0) : v || 0;
            return t > 0 ? [[t, +e] as DiagramPair] : [];
          });
        assert.deepEqual(m.curves[0].points, pts);
        assert.deepEqual(
          m.points.map((p) => [p.x, p.y]),
          [[t1.ubundet_mm, eu]],
        );
        assert.deepEqual(m.x.range, originalRange([...pts.map((p) => p[0]), t1.ubundet_mm]));
        assert.deepEqual(m.y.range, originalRange([...pts.map((p) => p[1]), eu], true));
        assert.equal(m.y.log, true);
        const { sy } = couplingSvgScales(m);
        assert.equal(sy(eu), sy(Math.exp(Math.log(eu))));
      }
      assert.equal(m.x.log, false);
      // Original axis labels are also a direct, independent source of tick values.
      const axisTexts = [...saved.svg.matchAll(/<g fill="#9AA39C"[^>]*>(.*?)<\/g>/g)].map((g) =>
        texts(g[1]),
      );
      assert.deepEqual(
        m.y.ticks.map((t) => t.label),
        axisTexts[0],
      );
      assert.deepEqual(
        m.x.ticks.map((t) => t.label),
        axisTexts[1],
      );
      const fromDk = (s: string) => Number(s.replaceAll('.', '').replace(',', '.'));
      assert.deepEqual(
        m.y.ticks.map((t) => t.value),
        axisTexts[0].map(fromDk),
      );
      assert.deepEqual(
        m.x.ticks.map((t) => t.value),
        axisTexts[1].map((s) => fromDk(s) * (unit === 'cm' ? 10 : 1)),
      );
      assert.deepEqual(texts(saved.svg), [
        ...axisTexts[0],
        ...axisTexts[1],
        m.y.title,
        m.x.title,
        ...m.labels.map((l) => l.text),
      ]);

      const visibleCurves = m.curves.filter((curve) => curve.points.length >= 2);
      const polylines = tags(saved.svg, 'polyline');
      assert.equal(polylines.length, visibleCurves.length);
      visibleCurves.forEach((curve, i) => {
        assert.equal(curve.role, role(polylines[i].stroke));
        assert.equal(curve.dashed, Boolean(polylines[i]['stroke-dasharray']));
        encodedLine(curve.points, polylines[i], m);
      });
      const circles = tags(saved.svg, 'circle');
      const runCount = m.kind === 'koersler' ? m.curves[0].points.length : 0;
      assert.equal(circles.length, runCount + m.points.length);
      if (runCount)
        m.curves[0].points.forEach((p, i) => encodedPoint(p, circles[i].cx, circles[i].cy, m));
      m.points.forEach((p, i) => {
        const circle = circles[runCount + i];
        assert.equal(p.hollow, circle.fill === '#fff');
        assert.equal(p.role, role(p.hollow ? circle.stroke : circle.fill));
        encodedPoint([p.x, p.y], circle.cx, circle.cy, m);
      });
      const guides = tags(saved.svg, 'line').filter((l) => l['stroke-dasharray']);
      assert.equal(guides.length, m.guides.length);
      guides.forEach((line, i) => {
        encodedPoint(m.guides[i].from, line.x1, line.y1, m);
        encodedPoint(m.guides[i].to, line.x2, line.y2, m);
      });
      // Tick grid lines carry the same values as their labels (no pixel parity).
      const grid = tags(saved.svg.match(/<g stroke="#EEF1EE"[^>]*>(.*?)<\/g>/)![1], 'line');
      assert.equal(grid.length, m.x.ticks.length + m.y.ticks.length);
      const yBottom = m.y.log ? Math.exp(m.y.range[0]) : m.y.range[0];
      m.x.ticks.forEach((t, i) => encodedPoint([t.value, yBottom], grid[i].x1, '208', m));
      m.y.ticks.forEach((t, i) =>
        encodedPoint([m.x.range[0], t.value], '50', grid[m.x.ticks.length + i].y1, m),
      );

      const svg = renderCouplingFigureSvg(m, { idPrefix: `${c.id}-${index}` });
      assert.equal(svg, renderCouplingFigureSvg(m, { idPrefix: `${c.id}-${index}` }));
      assert.doesNotMatch(svg, /NaN|Infinity|undefined/);
      assert.equal(tags(svg, 'path').filter((p) => 'data-curve' in p).length, visibleCurves.length);
      assert.equal(tags(svg, 'circle').filter((p) => 'data-point' in p).length, m.points.length);
      assert.ok(svg.includes('data-legend="true"'));
    });
  });
}

test('M1: all eight original figure calls covered', () => assert.equal(allModels.length, 8));
test('M1: escaping, prefix isolation and finite geometry', () => {
  const m = structuredClone(allModels[0]);
  const malicious = `<script>&"'`;
  m.title =
    m.x.title =
    m.y.title =
    m.labels[0].text =
    m.legend[0].text =
    m.curves[0].name =
    m.points[0].name =
      malicious;
  const svg = renderCouplingFigureSvg(m, { fontFamily: malicious, idPrefix: `a"><script>` });
  assert.doesNotMatch(svg, /<script>/);
  assert.ok(svg.includes('&lt;script&gt;&amp;&quot;&apos;'));
  assert.ok(svg.includes('id="ascript-plot"'));
  assert.notEqual(
    renderCouplingFigureSvg(m, { idPrefix: 'one' }),
    renderCouplingFigureSvg(m, { idPrefix: 'two' }),
  );
  m.points[0].x = NaN;
  assert.throws(() => renderCouplingFigureSvg(m), /SVG-koordinat/);
  assert.throws(() => renderCouplingFigureSvg(allModels[0], { width: Infinity }), /SVG-mål/);
});
test('M1: original scale/tick degenerate ranges and 2.5 step', () => {
  assert.deepEqual(koblingScale([5, 5]), [4.92, 6.08]);
  assert.deepEqual(koblingScale([5, 5], true), originalRange([5, 5], true));
  assert.deepEqual(koblingTicks(0, 9), [0, 2.5, 5, 7.5]);
  assert.deepEqual(koblingTicks(4, 4), [4]);
  assert.throws(() => koblingScale([]));
  assert.throws(() => koblingScale([0], true));
  assert.throws(() => koblingScale([Infinity]));
});
test('M1: sparse/empty curves and custom runs use active data', () => {
  const trafficCase = reference.cases.find((c) => c.id === 'TR-1')!;
  const input = structuredClone(trafficCase.input);
  const capturedDiagram = trafficCase.figures.find((f) => f.function === '_kob_figur_diagram')!;
  assert.equal(capturedDiagram.function, '_kob_figur_diagram');
  input.koersler = { T4: { 3: 1300, 10: 980, 40: 530 } };
  input.t_basis_table = structuredClone((capturedDiagram.args as DiagramArgs)[3]);
  input.t_basis_table[10][120].uarmeret = 101;
  const result = dimensioner(input)!;
  const active = koblingExplanation(input, result).steps.flatMap((s) =>
    s.figure?.model ? [s.figure.model] : [],
  );
  assert.equal(active.length, 2);
  assert.deepEqual(active[0].curves[0].points, [
    [1300, 3],
    [980, 10],
    [530, 40],
  ]);
  assert.deepEqual(
    active[0].points.map((p) => [p.x, p.y]),
    [[980, 10]],
  );
  const mainCurve = active[1].curves.find((c) => c.role === 'ustab')!;
  assert.deepEqual(
    mainCurve.points,
    originalCurve(input.t_basis_table, mainCurve.eo!, 'uarmeret', 1 + -0.02 * (result.phi - 37)),
  );
  assert.equal(
    koerslerFigure('T4', 10, 100, { T4: { 10: 100 } }, 'mm', ['kørte punkter', 'dit Eᵤ']),
    null,
  );
  const runs = { T4: { 3: { sg: 200, bl: 600 }, 10: 400, 40: 0 } };
  const m = koerslerFigure('T4', 10, 400, runs, 'cm', ['kørte punkter', 'dit Eᵤ'])!;
  assert.deepEqual(m.curves[0].points, [
    [800, 3],
    [400, 10],
  ]);
  assert.deepEqual(m.y.ticks, [
    { value: 3, label: '3' },
    { value: 10, label: '10' },
  ]);
  assert.ok(m.x.ticks.every((t) => t.label === tal(t.value, 'cm')));
  const table = {
    3: { 80: { uarmeret: 100, '1_lag': 50, '2_lag': null } },
    5: { 80: { uarmeret: 90, '1_lag': null, '2_lag': null } },
  };
  const d = diagramFigure({
    eu: 3,
    eo: 80,
    neighbours: [],
    table,
    phi: 37,
    netCorrection: 0,
    points: [],
    unit: 'mm',
    legend: [],
  })!;
  assert.deepEqual(
    d.curves.map((c) => c.points.length),
    [1, 0, 2],
  );
  assert.equal(tags(renderCouplingFigureSvg(d), 'path').filter((p) => 'data-curve' in p).length, 1);
  assert.equal(
    diagramFigure({
      eu: 3,
      eo: 80,
      neighbours: [],
      table: {},
      phi: 37,
      netCorrection: 0,
      points: [],
      unit: 'mm',
      legend: [],
    }),
    null,
  );
});
