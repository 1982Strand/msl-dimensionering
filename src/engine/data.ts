import snapshot from './defaults.json' with { type: 'json' };
import type { BasisTable, Product } from './types.ts';
export const defaults = snapshot.values;
export const T_BASIS_TABLE: BasisTable = defaults.T_BASIS_TABLE;
export const EU_RAEKKER: number[] = defaults.EU_RAEKKER;
export const EO_KOLONNER: number[] = defaults.EO_KOLONNER;
export const GEONET_DB: Product[] = defaults.GEONET_DB;
export const { PHI_BASIS, K_PHI, EO_MIN, EO_MAX } = defaults;
export function cv_til_eu(cv: number): number | null {
  if (cv === 0) return defaults.CV_TIL_EU[0][2];
  for (const [min, max, eu] of defaults.CV_TIL_EU) if (min < cv && cv <= max) return eu;
  return null;
}
export const klasse_til_eo = (klasse: number): number | null => EO_KOLONNER[klasse - 1] ?? null;
export const eo_til_klasse = (eo: number): number | null =>
  EO_KOLONNER.includes(eo) ? EO_KOLONNER.indexOf(eo) + 1 : null;
export function format_klasse_interval(klasser: number[]): string {
  const ks = [...new Set(klasser.map(Math.trunc))].sort((a, b) => a - b);
  if (!ks.length) return '—';
  const groups: string[] = [];
  let start = ks[0],
    previous = start;
  const label = () => (start === previous ? String(start) : `${start}-${previous}`);
  for (const k of ks.slice(1)) {
    if (k === previous + 1) {
      previous = k;
      continue;
    }
    groups.push(label());
    start = previous = k;
  }
  groups.push(label());
  return groups.join(', ');
}
