import { slaa_op_interp } from './calculator.ts';
import { K_PHI, PHI_BASIS, eo_til_klasse } from './data.ts';
import { laengde, tal } from './enhed.ts';
import { pythonFixed, pythonRound } from './python-numbers.ts';
import type { TrafficRuns } from './traffic.ts';
import type { BasisTable } from './types.ts';
import type { DiagramPair, DiagramRole } from './personal-diagram-svg.ts';

export interface CouplingAxis {
  range: DiagramPair;
  log: boolean;
  title: string;
  ticks: { value: number; label: string }[];
}
export interface CouplingCurve {
  name: string;
  role: DiagramRole;
  dashed: boolean;
  dots: boolean;
  eo?: number;
  points: DiagramPair[];
}
export interface CouplingPoint {
  x: number;
  y: number;
  role: DiagramRole;
  hollow: boolean;
  name: string;
}
export interface CouplingFigureModel {
  kind: 'koersler' | 'diagram';
  title: string;
  unit: 'mm' | 'cm';
  x: CouplingAxis;
  y: CouplingAxis;
  curves: CouplingCurve[];
  points: CouplingPoint[];
  guides: { from: DiagramPair; to: DiagramPair; role: DiagramRole }[];
  labels: { at: DiagramPair; text: string; side: -1 | 1; role: DiagramRole }[];
  legend: { text: string; role: DiagramRole; hollow: boolean }[];
}

/** Original's 8% padding, applied after ln for the logarithmic axis. */
export function koblingScale(values: number[], log = false): DiagramPair {
  if (!values.length || values.some((v) => !Number.isFinite(v) || (log && v <= 0)))
    throw new Error('M1-figurens dataværdier er ugyldige.');
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

/** Exact port of _kob_akse_ticks, including the 2.5 increment. */
export function koblingTicks(low: number, high: number, count = 4): number[] {
  const span = high - low;
  if (span <= 0) return [low];
  const raw = span / count;
  let step = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10])
    if (step * m >= raw) {
      step *= m;
      break;
    }
  const out: number[] = [];
  // Python ceil returns an integer 0; JS ceil can retain a negative zero.
  for (let v = Math.ceil(low / step) * step || 0; v <= high + 1e-9; v += step) out.push(v);
  return out;
}

const axis = (
  range: DiagramPair,
  title: string,
  values: number[],
  format: (v: number) => string,
  log = false,
): CouplingAxis => ({
  range,
  title,
  log,
  ticks: values.map((value) => ({ value, label: format(value) })),
});

export function koerslerFigure(
  trafficClass: string,
  eu: number,
  ubundet: number,
  runs: TrafficRuns,
  unit: 'mm' | 'cm',
  legend: string[],
): CouplingFigureModel | null {
  const row = runs[trafficClass] ?? {};
  const points: DiagramPair[] = Object.keys(row)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((e) => {
      const v = row[e],
        t = typeof v === 'object' ? (v.sg || 0) + (v.bl || 0) : v || 0;
      return t > 0 ? [[t, e] as DiagramPair] : [];
    });
  if (points.length < 2) return null;
  const x = koblingScale([...points.map((p) => p[0]), ubundet]);
  const y = koblingScale([...points.map((p) => p[1]), eu], true);
  return {
    kind: 'koersler',
    title: `${trafficClass}s VejDim-kørsler`,
    unit,
    x: axis(x, `Ubunden lagtykkelse SG + BL [${unit}]`, koblingTicks(...x), (v) => tal(v, unit)),
    y: axis(
      y,
      'Underbund Eᵤ [MPa]',
      points.map((p) => p[1]),
      (v) => pythonFixed(v),
      true,
    ),
    curves: [{ name: 'kørte punkter', role: 'ustab', dashed: false, dots: true, points }],
    points: [{ x: ubundet, y: eu, role: 'bruger', hollow: false, name: legend[1] }],
    guides: [
      { from: [x[0], eu], to: [ubundet, eu], role: 'bruger' },
      { from: [ubundet, eu], to: [ubundet, Math.exp(y[0])], role: 'bruger' },
    ],
    labels: [{ at: [ubundet, eu], text: laengde(ubundet, unit), side: 1, role: 'bruger' }],
    legend: legend.map((text, i) => ({ text, role: i ? 'bruger' : 'ustab', hollow: false })),
  };
}

export function diagramFigure({
  eu,
  eo,
  neighbours,
  table,
  phi,
  netCorrection,
  points,
  unit,
  legend,
}: {
  eu: number;
  eo: number;
  neighbours: number[];
  table: BasisTable;
  phi: number;
  netCorrection: number;
  points: CouplingPoint[];
  unit: 'mm' | 'cm';
  legend: string[];
}): CouplingFigureModel | null {
  const phiCorrection = K_PHI * (phi - PHI_BASIS);
  const eus = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  const curve = (e: number, mode: string, factor: number): DiagramPair[] =>
    eus.flatMap((u) => {
      const v = slaa_op_interp(u, e, mode, table);
      return v === null ? [] : [[v * 10 * factor, u] as DiagramPair];
    });
  const main = curve(eo, 'uarmeret', 1 + phiCorrection);
  if (main.length < 2) return null;
  const neighboursCurves: CouplingCurve[] = neighbours.map((e) => ({
    name: `KL. ${eo_til_klasse(e)}`,
    role: 'neutral',
    dashed: true,
    dots: false,
    eo: e,
    points: curve(e, 'uarmeret', 1 + phiCorrection),
  }));
  const reinforced: CouplingCurve[] = (['1_lag', '2_lag'] as const).map((mode, i) => ({
    name: `${i + 1} lag geonet`,
    role: i ? 'lag2' : 'lag1',
    dashed: false,
    dots: false,
    eo,
    points: curve(eo, mode, 1 + phiCorrection + netCorrection),
  }));
  const curves: CouplingCurve[] = [
    ...neighboursCurves,
    ...reinforced,
    { name: 'Ustabiliseret', role: 'ustab', dashed: false, dots: false, eo, points: main },
  ];
  const x = koblingScale([
    ...curves.flatMap((c) => c.points.map((p) => p[0])),
    ...points.map((p) => p.x),
  ]);
  const y = koblingScale([...eus, eu]);
  const labels: CouplingFigureModel['labels'] = neighboursCurves.slice(0, 2).flatMap((c, i) =>
    c.points.length < 2
      ? []
      : [
          {
            at: c.points[pythonRound((c.points.length - 1) * (i ? 0.24 : 0.6))],
            text: c.name,
            side: i ? (1 as const) : (-1 as const),
            role: 'neutral' as const,
          },
        ],
  );
  labels.push({
    at: [x[0], eu],
    text: `Eᵤ ${pythonFixed(eu, 0, true).replaceAll(',', '.')}`,
    side: 1,
    role: 'hjaelp',
  });
  return {
    kind: 'diagram',
    title: 'Designdiagrammets kurver',
    unit,
    x: axis(x, `Bærelagstykkelse [${unit}]`, koblingTicks(...x), (v) => tal(v, unit)),
    y: axis(y, 'Underbund Eᵤ [MPa]', koblingTicks(...y), (v) => pythonFixed(v)),
    curves,
    points,
    guides: [{ from: [x[0], eu], to: [x[1], eu], role: 'hjaelp' }],
    labels,
    legend: legend.map((text, i) => ({ text, role: points[i].role, hollow: points[i].hollow })),
  };
}
