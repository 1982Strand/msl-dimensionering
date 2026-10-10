/** Display and sorting rules from original _render_alle_produkter_overblik. */
import { GEONET_DB, format_klasse_interval } from './data.ts';
import { geonet_valgliste } from './dimensionering.ts';
import { er_oprundet, reduktion_for } from './afrunding.ts';
import { laengde, fortegn } from './enhed.ts';
import { pythonFixed } from './python-numbers.ts';
import {
  trafikklasser_for_belastningsklasser,
  format_trafikklasse_interval,
} from './correlation.ts';
import type { ProductRow } from './products.ts';
import type { BasisTable } from './types.ts';
import type { TrafficRuns } from './traffic.ts';

export const overviewColumns = [
  { key: 'produkt', label: 'Produkt', direction: 'asc' },
  { key: 'klasse', label: 'Klasse', direction: 'asc' },
  { key: 'indeks', label: 'Indeks', direction: 'desc' },
  { key: 't1', label: '1 lag', direction: 'asc' },
  { key: 'sparet1', label: 'Sparet', direction: 'desc' },
  { key: 't2', label: '2 lag', direction: 'asc' },
  { key: 'sparet2', label: 'Sparet', direction: 'desc' },
] as const;
export type OverviewColumn = (typeof overviewColumns)[number]['key'];
export type OverviewSort = { column: OverviewColumn; direction: 'asc' | 'desc' } | null;
interface OverviewInput {
  one: ProductRow[];
  two: ProductRow[];
  unit?: string;
  rounding?: { vis_eksakt?: boolean; reduktion_eksakt?: boolean };
  trafficEu?: number | null;
  runs?: TrafficRuns | null;
  table?: BasisTable | null;
  rules?: unknown;
  sort?: OverviewSort;
}
const valid = (p: ProductRow | undefined) => p?.fejl === null && p.t_armeret_mm != null;
export function productOverview(input: OverviewInput) {
  const {
    one,
    two,
    unit = 'mm',
    rounding = {},
    trafficEu = null,
    runs = null,
    table = null,
    rules = null,
    sort = null,
  } = input;
  const names = [...new Set([...one, ...two].map((p) => p.navn))];
  const products = new Map(GEONET_DB.map((p) => [p.navn, p]));
  const index = (name: string) =>
    Number(String(products.get(name)?.effektindeks ?? '').match(/^\s*(\d+)/)?.[1] ?? 0);
  const rows = names.map((name) => {
    const p1 = one.find((p) => p.navn === name),
      p2 = two.find((p) => p.navn === name);
    const classProduct = valid(p1) ? p1 : p2;
    const classes = classProduct?.klasser ?? [];
    const traffic =
      trafficEu == null
        ? []
        : trafikklasser_for_belastningsklasser(classes, trafficEu, runs, table, rules);
    const thickness = (p: ProductRow | undefined) => {
      if (!valid(p)) return '—';
      let s = laengde(p!.t_armeret_mm!, unit);
      if (rounding.vis_eksakt && er_oprundet(p!.t_armeret_mm!, p!.t_armeret_eksakt_mm ?? null))
        s += ` (${laengde(p!.t_armeret_eksakt_mm!, unit)})`;
      return s;
    };
    const saving = (p: ProductRow | undefined): [number | null, number | null] =>
      !valid(p) || !p!.t_uarmeret_mm
        ? [null, null]
        : reduktion_for(
            p!.t_uarmeret_mm!,
            p!.t_armeret_mm!,
            p!.t_uarmeret_eksakt_mm ?? null,
            p!.t_armeret_eksakt_mm ?? null,
            rounding,
          );
    const savingText = (p: ProductRow | undefined) => {
      const [mm, pct] = saving(p);
      return mm == null || pct == null
        ? '—'
        : `${fortegn(-mm, unit)} · ${pythonFixed(pct * 100, 0).replace('.', ',')} %`;
    };
    return {
      name,
      cells: [
        name,
        trafficEu == null ? format_klasse_interval(classes) : format_trafikklasse_interval(traffic),
        String(products.get(name)?.effektindeks || '—'),
        thickness(p1),
        savingText(p1),
        thickness(p2),
        savingText(p2),
      ],
      t1: valid(p1) ? p1!.t_armeret_mm! : null,
      t2: valid(p2) ? p2!.t_armeret_mm! : null,
      sparet1: saving(p1)[1],
      sparet2: saving(p2)[1],
      indeks: index(name),
      klasse:
        (!valid(p1) && !valid(p2)) || !classes.length
          ? null
          : trafficEu == null
            ? Math.min(...classes)
            : traffic.length
              ? Math.min(...traffic.map((t) => Number(t.slice(1))))
              : null,
    };
  });
  const cmp = (a: number | string, b: number | string) => (a < b ? -1 : a > b ? 1 : 0);
  if (!sort)
    rows.sort(
      (a, b) =>
        Number(a.t1 == null && a.t2 == null) - Number(b.t1 == null && b.t2 == null) ||
        cmp(a.t1 ?? Infinity, b.t1 ?? Infinity) ||
        cmp(a.t2 ?? Infinity, b.t2 ?? Infinity) ||
        b.indeks - a.indeks ||
        cmp(a.name, b.name),
    );
  else {
    const ranks = new Map(geonet_valgliste(names).valg.map((n, i) => [n, i]));
    const value = (row: (typeof rows)[number]) =>
      sort.column === 'produkt' ? ranks.get(row.name)! : row[sort.column];
    rows.sort(
      (a, b) =>
        Number(value(a) == null) - Number(value(b) == null) || cmp(value(a) ?? 0, value(b) ?? 0),
    );
    if (sort.direction === 'desc') {
      const present = rows.filter((r) => value(r) != null).reverse(),
        missing = rows.filter((r) => value(r) == null);
      rows.splice(0, rows.length, ...present, ...missing);
    }
  }
  let caption =
    'Produkterne er sorteret efter den tyndeste gyldige opbygning under de aktuelle forudsætninger.';
  if (sort) {
    const asc = sort.direction === 'asc';
    if (sort.column === 'produkt')
      caption = `Produkterne er sorteret efter serie${asc ? '' : ', faldende'}.`;
    else if (sort.column === 'indeks')
      caption = `Produkterne er sorteret efter effektindeks, ${asc ? 'laveste' : 'højeste'} først.`;
    else if (sort.column === 'klasse')
      caption =
        trafficEu == null
          ? `Produkterne er sorteret efter belastningsklasse, ${asc ? 'laveste' : 'højeste'} først.`
          : `Produkterne er sorteret efter anbefalet trafikklasse ved Eᵤ = ${pythonFixed(trafficEu, 0).replace('.', ',')} MPa, ${asc ? 'laveste' : 'højeste'} først.`;
    else if (sort.column.startsWith('sparet'))
      caption = `Produkterne er sorteret efter besparelsen ved ${sort.column.endsWith('1') ? '1' : '2'} lag geonet, ${asc ? 'mindst' : 'størst'} besparelse først.`;
    else
      caption = `Produkterne er sorteret efter tykkelsen ved ${sort.column === 't1' ? '1' : '2'} lag geonet, ${asc ? 'tyndeste' : 'tykkeste'} opbygning først.`;
  }
  return { rows: rows.map(({ name, cells }) => ({ name, cells })), caption };
}
