import { defaults, T_BASIS_TABLE, EO_KOLONNER } from './data.ts';
import { isRecord } from './python-numbers.ts';
import type { BasisTable } from './types.ts';
export type TrafficRuns = Record<
  string,
  Record<string, number | { sg?: number | null; bl?: number | null }>
>;
export function normaliser_yder_regler(regler: unknown) {
  const out = { ...defaults.STANDARD_YDER_REGLER };
  if (!isRecord(regler)) return out;
  for (const key of ['tolerance_over_pct', 'tolerance_under_pct'] as const) {
    const v = regler[key];
    if (typeof v === 'number' && !Number.isNaN(v)) out[key] = Math.min(Math.max(v, 0), 50);
  }
  for (const [key, options] of [
    ['under_inden', ['laveste', 'vejdim']],
    ['over_uden', ['afvis', 'vejdim']],
    ['under_uden', ['afvis', 'laveste', 'vejdim']],
  ] as const) {
    const v = regler[key];
    if (typeof v === 'string' && (options as readonly string[]).includes(v)) out[key] = v;
  }
  return out;
}
export const VEJDIM_KOERSLER: TrafficRuns = {};
for (const row of defaults.VEJDIM_KOERSLER_STANDARD_RAEKKER) {
  VEJDIM_KOERSLER[row.T] ??= {};
  VEJDIM_KOERSLER[row.T][row.eu] = { sg: row.t_SG_mm, bl: row.t_BL_mm };
}
export function trafik_ubundet_tykkelse(
  t_klasse: string,
  eu: number,
  koersler: TrafficRuns | null = null,
): number | null {
  const row = (koersler ?? VEJDIM_KOERSLER)[t_klasse];
  if (!row) return null;
  const total = (v: number | { sg?: number | null; bl?: number | null }) =>
    typeof v === 'object' ? (v.sg || 0) + (v.bl || 0) : v || 0;
  const known = Object.keys(row)
    .map(Number)
    .filter((p) => total(row[p]) > 0)
    .sort((a, b) => a - b);
  if (!known.length || eu < known[0] || eu > known.at(-1)! || eu <= 0) return null;
  if (known.includes(eu)) return total(row[eu]);
  const low = Math.max(...known.filter((p) => p <= eu)),
    high = Math.min(...known.filter((p) => p >= eu));
  const frac = (Math.log(eu) - Math.log(low)) / (Math.log(high) - Math.log(low));
  return total(row[low]) + frac * (total(row[high]) - total(row[low]));
}
export function back_beregn_eo_aekv(
  eu: number,
  ubundet_mm: number,
  t_basis_table: BasisTable | null = null,
): [number | null, string, number] {
  const row = (t_basis_table && Object.keys(t_basis_table).length ? t_basis_table : T_BASIS_TABLE)[
    eu
  ];
  if (!row) return [null, 'udenfor', 1];
  const pts = EO_KOLONNER.filter((eo) => row[eo]?.uarmeret != null)
    .map((eo) => [eo, row[eo].uarmeret! * 10])
    .sort((a, b) => a[1] - b[1]);
  if (!pts.length) return [null, 'udenfor', 1];
  if (ubundet_mm < pts[0][1]) return [pts[0][0], 'under', ubundet_mm / pts[0][1]];
  if (ubundet_mm > pts.at(-1)![1]) return [pts.at(-1)![0], 'over', ubundet_mm / pts.at(-1)![1]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [e1, t1] = pts[i],
      [e2, t2] = pts[i + 1];
    if (t1 <= ubundet_mm && ubundet_mm <= t2)
      return [t2 > t1 ? e1 + ((ubundet_mm - t1) / (t2 - t1)) * (e2 - e1) : e1, 'ok', 1];
  }
  return [null, 'udenfor', 1];
}
export interface TrafficLookup {
  eo: number | null;
  zone: string;
  skala: number;
  afvigelse_pct: number | null;
  tolerance_pct: number | null;
  inden_tolerance: boolean | null;
  handling: string | null;
  t_vejdim_mm: number | null;
  t_rand_mm: number | null;
  eo_rand: number | null;
}
const empty = (thickness: number | null): TrafficLookup => ({
  eo: null,
  zone: 'udenfor',
  skala: 1,
  afvigelse_pct: null,
  tolerance_pct: null,
  inden_tolerance: null,
  handling: null,
  t_vejdim_mm: thickness,
  t_rand_mm: null,
  eo_rand: null,
});
export function opslag_for_tykkelse(
  eu: number,
  tykkelse: number,
  t_basis_table: BasisTable | null = null,
  yder_regler: unknown = null,
): TrafficLookup {
  const out = empty(tykkelse);
  const [eo, zone, scale] = back_beregn_eo_aekv(eu, tykkelse, t_basis_table);
  out.zone = zone;
  if (zone === 'ok') {
    out.eo = eo;
    return out;
  }
  if (!['under', 'over'].includes(zone) || eo === null || !scale) return out;
  const rules = normaliser_yder_regler(yder_regler),
    over = zone === 'over';
  const difference = (over ? scale - 1 : 1 - scale) * 100,
    tolerance = over ? rules.tolerance_over_pct : rules.tolerance_under_pct;
  const inside = difference <= tolerance + 1e-9;
  const action = over
    ? inside
      ? 'vejdim'
      : rules.over_uden
    : inside
      ? rules.under_inden
      : rules.under_uden;
  Object.assign(out, {
    eo_rand: eo,
    t_rand_mm: tykkelse / scale,
    afvigelse_pct: difference,
    tolerance_pct: tolerance,
    inden_tolerance: inside,
    handling: action,
  });
  if (action !== 'afvis') {
    out.eo = eo;
    out.skala = action === 'vejdim' ? scale : 1;
  }
  return out;
}
export function trafik_opslag(
  t_klasse: string,
  eu: number,
  koersler: TrafficRuns | null = null,
  t_basis_table: BasisTable | null = null,
  yder_regler: unknown = null,
): TrafficLookup {
  const t = trafik_ubundet_tykkelse(t_klasse, eu, koersler);
  return t === null ? empty(null) : opslag_for_tykkelse(eu, t, t_basis_table, yder_regler);
}
