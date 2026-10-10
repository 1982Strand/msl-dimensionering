import { EO_KOLONNER, T_BASIS_TABLE } from './data.ts';
import { slaa_op_interp } from './calculator.ts';
import { pythonFixed, pythonRound } from './python-numbers.ts';
import { normaliser_yder_regler, trafik_ubundet_tykkelse, type TrafficRuns } from './traffic.ts';
import { korrelation_fra_koersler } from './correlation.ts';
import guidance from './table-guidance.json' with { type: 'json' };
import type { BasisTable } from './types.ts';

interface Step1 {
  ubundet_mm: number;
  direkte: boolean;
  kendte: number[];
  eu_punkt?: number;
  sg?: number | null;
  bl?: number | null;
  lav?: number;
  hoej?: number;
  t_lav?: number;
  t_hoej?: number;
  frac?: number;
}
interface Step2 {
  kurver: number[][];
  eo_lav?: number;
  eo_hoej?: number;
  t_lav?: number;
  t_hoej?: number;
  frac?: number;
  eo_aekv?: number;
}

export function eoSteps(
  t: string,
  eu: number,
  runs: TrafficRuns,
  table: BasisTable = T_BASIS_TABLE,
) {
  const row = runs[t] ?? {};
  const total = (v: TrafficRuns[string][string]) =>
    typeof v === 'object' ? (v.sg || 0) + (v.bl || 0) : v || 0;
  const known = Object.keys(row)
    .map(Number)
    .filter((p) => total(row[p]) > 0)
    .sort((a, b) => a - b);
  const ub = trafik_ubundet_tykkelse(t, eu, runs);
  if (ub === null || !known.length) return null;
  const rounded = pythonRound(eu);
  const direct = Math.abs(eu - rounded) < 1e-9 && known.includes(rounded);
  const trin1: Step1 = { ubundet_mm: ub, direkte: direct, kendte: known };
  if (direct) {
    const v = row[rounded];
    Object.assign(trin1, {
      eu_punkt: rounded,
      sg: typeof v === 'object' ? v.sg || 0 : null,
      bl: typeof v === 'object' ? v.bl || 0 : null,
    });
  } else {
    const low = known.filter((p) => p <= eu).at(-1),
      high = known.find((p) => p >= eu);
    if (low === undefined || high === undefined || low === high) return null;
    Object.assign(trin1, {
      lav: low,
      hoej: high,
      t_lav: total(row[low]),
      t_hoej: total(row[high]),
      frac: (Math.log(eu) - Math.log(low)) / (Math.log(high) - Math.log(low)),
    });
  }
  const curves = [...EO_KOLONNER]
    .sort((a, b) => a - b)
    .flatMap((eo) => {
      const value = slaa_op_interp(eu, eo, 'uarmeret', table);
      return value === null ? [] : [[eo, value * 10]];
    });
  if (!curves.length) return null;
  curves.sort((a, b) => a[1] - b[1]);
  const trin2: Step2 = { kurver: curves };
  for (let i = 0; i < curves.length - 1; i++) {
    const [e1, t1] = curves[i],
      [e2, t2] = curves[i + 1];
    if (t1 <= ub && ub <= t2 && t2 > t1) {
      const frac = (ub - t1) / (t2 - t1);
      Object.assign(trin2, {
        eo_lav: e1,
        eo_hoej: e2,
        t_lav: t1,
        t_hoej: t2,
        frac,
        eo_aekv: e1 + frac * (e2 - e1),
      });
      break;
    }
  }
  const trin3: Record<string, { lav: number; hoej: number; basis: number }> = {};
  if (trin2.eo_aekv !== undefined)
    for (const layer of ['1_lag', '2_lag'] as const) {
      const a = slaa_op_interp(eu, trin2.eo_lav!, layer, table),
        b = slaa_op_interp(eu, trin2.eo_hoej!, layer, table);
      if (a === null || b === null) continue;
      const low = a * 10,
        high = b * 10;
      trin3[layer] = { lav: low, hoej: high, basis: low + trin2.frac! * (high - low) };
    }
  return { trin1, trin2, trin3 };
}
export function exampleCell(
  runs: TrafficRuns,
  table: BasisTable = T_BASIS_TABLE,
): [string, number] | null {
  const corr = korrelation_fra_koersler(runs, table, guidance.strict_rules);
  if (typeof corr.T3?.[15] === 'number') return ['T3', 15];
  for (const [traffic, row] of Object.entries(corr))
    for (const [eu, value] of Object.entries(row)) {
      if (typeof value === 'number') return [traffic, Number(eu)];
    }
  return null;
}
export function outsideRuleLine(rules: unknown) {
  const r = normaliser_yder_regler(rules);
  const action = (name: string) => guidance.actions[name as keyof typeof guidance.actions];
  const outside = (name: string) =>
    name === 'afvis' ? 'afvises beregningen' : `regnes med ${action(name)}`;
  const pct = (n: number) => `${pythonFixed(n, 1).replace('.', ',')} %`;
  return `Uden for diagrammets kurver gælder Indstillinger, afsnit 8. Over: inden for ${pct(r.tolerance_over_pct)} regnes med VejDims tykkelse; derudover ${outside(r.over_uden)}. Under: inden for ${pct(r.tolerance_under_pct)} regnes med ${action(r.under_inden)}; derudover ${outside(r.under_uden)}.`;
}
