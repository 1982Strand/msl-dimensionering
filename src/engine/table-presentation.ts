import config from './table-ui-defaults.json' with { type: 'json' };
import { defaults } from './data.ts';
import { pythonFixed, pythonRound } from './python-numbers.ts';
import { berig_koersel_raekker, koersler_fra_raekker } from './editing.ts';
import type { DesignDiagram, RunRow } from './editing.ts';
import type { BasisTable } from './types.ts';
import { korrelation_opslag, korrelation_fra_koersler } from './correlation.ts';

export const diagramFields = ['t_uarmeret_cm', 't_1_lag_cm', 't_2_lag_cm'] as const;
export function rawDiagram(diagram: DesignDiagram) {
  const rows = [...diagram.rows].sort((a, b) => a.eu - b.eu);
  const data = diagramFields.flatMap((field, i) => {
    const points = rows.filter((r) => r[field] !== null && r[field] !== undefined);
    return points.length
      ? [
          {
            ...structuredClone(config.traces[i]),
            x: points.map((r) => r[field]!),
            y: points.map((r) => r.eu),
          },
        ]
      : [];
  });
  if (!data.length) return null;
  const xMax = Math.max(0, ...data.flatMap((t) => t.x));
  return {
    data,
    layout: {
      ...structuredClone(config.chart_layout),
      xaxis: { ...structuredClone(config.chart_layout.xaxis), range: [0, xMax * 1.08] },
      yaxis: {
        ...structuredClone(config.chart_layout.yaxis),
        range: [0, Math.max(...rows.map((r) => r.eu)) * 1.05],
      },
    },
  };
}
export function readPoint(nr: number, eu: number, field: string) {
  const points = (config.read_points as Record<string, (number | string)[][]>)[nr] ?? [];
  return points.some(([x, f]) => x === eu && f === field);
}
export function diagramCoverage(diagram: DesignDiagram) {
  return diagramFields
    .map((field, i) => {
      const points = diagram.rows.filter((r) => r[field] != null).map((r) => r.eu);
      const name = ['Ustabiliseret', '1 lag geonet', '2 lag geonet'][i];
      return points.length
        ? `${name} Eᵤ = ${pythonFixed(Math.min(...points), 0)}–${pythonFixed(Math.max(...points), 0)} MN/m²`
        : `${name} forekommer ikke`;
    })
    .join(' · ');
}
export interface TableColumn {
  field: string;
  label: string;
  numeric?: boolean;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  help?: string;
  locked?: boolean;
}
export const runColumns: TableColumn[] = [
  { field: 'T', label: 'Trafikklasse', locked: true },
  { field: 'eu', label: 'Eᵤ (MPa)', locked: true, numeric: true },
  { field: 'slidlag', label: 'Slidlag' },
  { field: 't_slid_mm', label: 't slidlag (mm)', numeric: true, min: 0, step: 10 },
  { field: 'bindelag', label: 'Bindelag' },
  { field: 't_bindelag_mm', label: 't bindelag (mm)', numeric: true, min: 0, step: 10 },
  { field: 'bundet_baerelag', label: 'Bundet bærelag' },
  { field: 't_bundet_mm', label: 't bundet (mm)', numeric: true, min: 0, step: 10 },
  { field: 'E_asf_vist_MPa', label: 'Asfalt-E (MPa)', numeric: true, min: 0, step: 100 },
  {
    field: 'ubundet_baerelag',
    label: 'Ubundet bærelag',
    help: 'Materialet i det ubundne bærelag, som kørslen er udført med. Tykkelsen angives i kolonnen SG (mm).',
  },
  { field: 't_SG_mm', label: 'SG (mm)', numeric: true, min: 0, step: 10 },
  {
    field: 'bundsikring',
    label: 'Bundsikringslag',
    help: 'Materialet i bundsikringslaget, som kørslen er udført med. Tykkelsen angives i kolonnen BL (mm).',
  },
  { field: 't_BL_mm', label: 'BL (mm)', numeric: true, min: 0, step: 10 },
  { field: 't_ubundet_total_mm', label: 'Ubundet (mm)', numeric: true, locked: true },
  { field: 't_befaestelse_total_mm', label: 'Samlet højde (mm)', numeric: true, locked: true },
  { field: 'levetid_styrende_aar', label: 'Levetid (år)', numeric: true, min: 0, step: 0.1 },
  { field: 'bemaerkning', label: 'Bemærkning' },
];
const floatText = (n: number) => {
  const a = Math.abs(n);
  if (a !== 0 && (a >= 1e16 || a < 1e-4))
    return n.toExponential().replace(/e([+-])(\d)$/, 'e$10$2');
  return Number.isInteger(n) ? `${n}.0` : String(n);
};
export function runsCsv(rows: RunRow[]) {
  const quote = (s: string) => (/[;"\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);
  return (
    [
      runColumns.map((c) => quote(c.label)).join(';'),
      ...berig_koersel_raekker(rows).map((row) =>
        runColumns
          .map((c) => {
            const v = (row as Record<string, unknown>)[c.field];
            return quote(
              v == null ? '' : c.numeric && c.field !== 'eu' ? floatText(Number(v)) : String(v),
            );
          })
          .join(';'),
      ),
    ].join('\n') + '\n'
  );
}
export function correlationRows(
  rows: RunRow[],
  table: BasisTable | null = null,
  rules: unknown = null,
) {
  const runs = koersler_fra_raekker(rows),
    lookup = korrelation_opslag(runs, table, rules),
    korr = korrelation_fra_koersler(runs, table, rules);
  return Object.keys(defaults.TRAFIKKLASSER).map((t) =>
    Object.fromEntries([
      ['Trafikklasse', t],
      ...[...new Set(defaults.VEJDIM_KOERSLER_STANDARD_RAEKKER.map((r) => r.eu))]
        .sort((a, b) => a - b)
        .map((eu) => {
          const c = lookup[t]?.[eu],
            value = korr[t]?.[eu];
          let suffix = '',
            marker = '';
          if (
            c &&
            ['under', 'over'].includes(c.zone) &&
            'afvigelse_pct' in c &&
            c.afvigelse_pct != null
          ) {
            const signed = (c.zone === 'under' ? -1 : 1) * c.afvigelse_pct;
            suffix = ` (${signed >= 0 ? '+' : ''}${pythonFixed(signed, 1).replace('.', ',').replace('-', '−')} %)`;
            marker = 'inden_tolerance' in c && c.inden_tolerance ? '*' : '†';
          }
          return [
            `Eᵤ ${eu}`,
            typeof value === 'string'
              ? value + suffix
              : value == null
                ? '—'
                : pythonFixed(value, 0) + marker + suffix,
          ];
        }),
    ]),
  );
}
export function asphaltRows(rows: RunRow[]) {
  return Object.entries(defaults.TRAFIKKLASSER).flatMap(([t, info]) => {
    const rs = rows.filter((r) => r.T === t);
    if (!rs.length) return [];
    const parts = [
      ['slidlag', 't_slid_mm'],
      ['bindelag', 't_bindelag_mm'],
      ['bundet_baerelag', 't_bundet_mm'],
    ].flatMap(([name, thickness]) => {
      const names = [
        ...new Set(rs.map((r) => String(r[name])).filter((n) => n !== '' && n !== '-')),
      ].sort();
      const nums = [
        ...new Set(
          rs
            .map((r) => Number(r[thickness]))
            .filter(Boolean)
            .map((n) => pythonRound(n)),
        ),
      ].sort((a, b) => a - b);
      if (!names.length || !nums.length) return [];
      return [
        `${nums.length === 1 ? nums[0] : `${nums[0]}–${nums.at(-1)}`} ${names.join(' / ')}${name === 'bindelag' ? ' (bindelag)' : ''}`,
      ];
    });
    return [
      {
        Klasse: t,
        'NÆ10 (20 år)': `~${String(info.naae10_mio_20aar).replace('.', ',')} mio.`,
        'Slidlag + bundne bærelag (mm)': parts.join(' + ') || '—',
      },
    ];
  });
}
