import { defaults } from './data.ts';
import { eo_til_naermeste_klasse } from './dimensionering.ts';
import { opslag_for_tykkelse, trafik_opslag, VEJDIM_KOERSLER } from './traffic.ts';
import type { TrafficRuns, TrafficLookup } from './traffic.ts';
import type { BasisTable } from './types.ts';
import { pythonFixed } from './python-numbers.ts';
import { legacyError } from './input-values.ts';

type Cell = TrafficRuns[string][string];
const total = (cell: Cell) =>
  typeof cell === 'object' ? (cell.sg || 0) + (cell.bl || 0) : cell || 0;
export function korrelation_opslag(
  runs: TrafficRuns,
  table: BasisTable | null = null,
  rules: unknown = null,
) {
  return Object.fromEntries(
    Object.entries(runs).map(([t, rows]) => [
      t,
      Object.fromEntries(
        Object.entries(rows).map(([eu, cell]) => {
          const thickness = total(cell);
          return [
            Math.trunc(Number(eu)),
            thickness <= 0
              ? { eo: null, zone: 'mangler' }
              : opslag_for_tykkelse(Number(eu), thickness, table, rules),
          ];
        }),
      ),
    ]),
  ) as Record<string, Record<string, TrafficLookup | { eo: null; zone: string }>>;
}
export function korrelation_fra_koersler(
  runs: TrafficRuns,
  table: BasisTable | null = null,
  rules: unknown = null,
) {
  return Object.fromEntries(
    Object.entries(korrelation_opslag(runs, table, rules)).map(([t, rows]) => [
      t,
      Object.fromEntries(Object.entries(rows).map(([eu, cell]) => [eu, cell.eo ?? cell.zone])),
    ]),
  );
}
export function trafik_eu_interval(
  t: string,
  runs: TrafficRuns | null = null,
): [number, number] | null {
  const values = Object.entries((runs ?? VEJDIM_KOERSLER)[t] ?? {})
    .filter(([, c]) => total(c) > 0)
    .map(([e]) => Number(e))
    .sort((a, b) => a - b);
  return values.length ? [values[0], values.at(-1)!] : null;
}
export function trafik_eo_aekv(
  ...args: Parameters<typeof trafik_opslag>
): [number | null, string, number] {
  const r = trafik_opslag(...args);
  return [r.eo, r.zone, r.skala];
}
export function trafikklasser_for_belastningsklasser(
  classes: number[] | null,
  eu: number,
  runs: TrafficRuns | null = null,
  table: BasisTable | null = null,
  rules: unknown = null,
): string[] {
  const ks = new Set((classes ?? []).map(Math.trunc));
  if (!ks.size) return [];
  return Object.keys(defaults.TRAFIKKLASSER).filter((t) => {
    const lookup = trafik_opslag(t, eu, runs, table, rules);
    const k = eo_til_naermeste_klasse(lookup.eo);
    return k !== null && ks.has(k);
  });
}
export function format_trafikklasse_interval(classes: string[] | null): string {
  const numbers = [
    ...new Set(
      (classes ?? [])
        .filter((t) => t.startsWith('T'))
        .map((t) => {
          const part = t.slice(1).trim();
          if (!/^[+-]?\d(?:_?\d)*$/.test(part))
            return legacyError('ValueError', 'Invalid traffic class number');
          return Number(part.replaceAll('_', ''));
        }),
    ),
  ].sort((a, b) => a - b);
  if (!numbers.length) return '—';
  const groups: string[] = [];
  let start = numbers[0],
    previous = start;
  const label = () => (start === previous ? `T${start}` : `T${start}-T${previous}`);
  for (const n of numbers.slice(1)) {
    if (n === previous + 1) {
      previous = n;
      continue;
    }
    groups.push(label());
    start = previous = n;
  }
  groups.push(label());
  return groups.join(', ');
}
const getClass = (name: string) =>
  Object.hasOwn(defaults.TRAFIKKLASSER, name)
    ? defaults.TRAFIKKLASSER[name as keyof typeof defaults.TRAFIKKLASSER]
    : null;
export function format_trafikklasse(t: string): string {
  const d = getClass(t);
  return d ? `${t} — ${d.beskrivelse}` : t;
}
export function trafikklasse_noegletal(t: string): [string, string][] {
  const d = getClass(t);
  if (!d) return [];
  return [
    ['Tunge køretøjer pr. døgn, begge retninger', d.tunge_koeretoejer],
    ['NÆ10 pr. døgn pr. vognbane (øvre grænse)', d.naae10_doegn],
    ['Dimensionsgivende trafikbelastning', `${d.naae10_aar} NÆ10 pr. år pr. vognbane`],
    [
      'Svarende til 20 år',
      `${pythonFixed(d.naae10_mio_20aar * 1e6, 0, true).replaceAll(',', '.')} NÆ10`,
    ],
    ['Typisk anvendelse', d.anvendelse],
  ];
}
