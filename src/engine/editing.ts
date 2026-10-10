import { defaults, PHI_BASIS, EO_KOLONNER } from './data.ts';
import * as a from './afrunding.ts';
import * as l from './lagfordeling.ts';
import { normaliser as normaliser_enhed } from './enhed.ts';
import { normaliser_yder_regler } from './traffic.ts';
import type { TrafficRuns } from './traffic.ts';
import type { BasisTable } from './types.ts';
import { isRecord, pythonFixed, pythonRound } from './python-numbers.ts';
import {
  editorText,
  pythonFloat,
  pythonInt,
  pythonCasefold,
  rowRecord,
  rowsList,
  valueOr,
} from './input-values.ts';

export interface EditableMaterial {
  navn: string;
  lagtype: string;
  phi: number;
  max_korn: number | null;
  krav_maskestoerrelse_mm: number | null;
  anvendelse: string;
}
export interface DiagramRow {
  eu: number;
  t_uarmeret_cm: number | null;
  t_1_lag_cm: number | null;
  t_2_lag_cm: number | null;
}
export interface DesignDiagram {
  diagram_nr: number;
  eo: number;
  klasse: number;
  image_name: string;
  rows: DiagramRow[];
}
export type RunRow = Record<string, unknown> & {
  T: string;
  eu: number;
  t_SG_mm: number;
  t_BL_mm: number;
};
const OPBYGNING_STANDARD = {
  geonet_paaskrift: true,
  maal_streg: true,
  maal_tal: true,
  signatur: true,
  enhed: 'mm',
};
export function normaliser_opbygning(value: unknown) {
  const out = { ...OPBYGNING_STANDARD };
  if (isRecord(value)) {
    out.enhed = normaliser_enhed(value.enhed);
    for (const key of ['geonet_paaskrift', 'maal_streg', 'maal_tal', 'signatur'] as const)
      if (typeof value[key] === 'boolean') out[key] = value[key];
  }
  return out;
}
export function normaliser_indstillinger(value: unknown) {
  const v = isRecord(value) ? value : {};
  return {
    afrunding: a.normaliser(v.afrunding),
    opbygning: normaliser_opbygning(v.opbygning),
    lagfordeling: l.normaliser(v.lagfordeling),
    yderomraade: normaliser_yder_regler(v.yderomraade),
  };
}
export const standard_indstillinger = () => normaliser_indstillinger(null);
export const standard_materialer = (): EditableMaterial[] =>
  defaults.MATERIAL_DB.map((m) => ({
    navn: m.navn.trim(),
    lagtype: m.lagtype || 'Bærelag',
    phi: Math.trunc(m.phi || PHI_BASIS),
    max_korn: m.max_korn ? Math.trunc(m.max_korn) : null,
    krav_maskestoerrelse_mm: m.krav_maskestoerrelse_mm
      ? Math.trunc(m.krav_maskestoerrelse_mm)
      : null,
    anvendelse: m.anvendelse || '',
  }));
export const er_tom_vaerdi = (v: unknown) =>
  v == null || v === '' || (typeof v === 'number' && Number.isNaN(v));
export function normaliser_materiale(value: unknown): EditableMaterial | null {
  const raw = rowRecord(value),
    navn = editorText(raw.navn);
  if (!navn) return null;
  const lagtype = raw.lagtype === 'Bundsikring' ? 'Bundsikring' : 'Bærelag';
  const phi = Math.min(
    60,
    Math.max(
      20,
      valueOr(() => pythonInt(pythonRound(pythonFloat(raw.phi))), PHI_BASIS),
    ),
  );
  const grain = (v: unknown) => {
    if (er_tom_vaerdi(v)) return null;
    const n = valueOr<number | null>(() => pythonInt(pythonRound(pythonFloat(v))), null);
    return n === null ? null : Math.min(500, Math.max(0, n)) || null;
  };
  return {
    navn,
    lagtype,
    phi,
    max_korn: grain(raw.max_korn),
    krav_maskestoerrelse_mm: grain(raw.krav_maskestoerrelse_mm),
    anvendelse: editorText(raw.anvendelse),
  };
}
export function normaliser_materialer(value: unknown): EditableMaterial[] {
  return rowsList(value)
    .map(normaliser_materiale)
    .filter((m): m is EditableMaterial => m !== null);
}
export function duplikerede_materialenavne(materials: { navn: string }[]): string[] {
  const seen = new Set<string>(),
    duplicates: string[] = [];
  for (const m of materials) {
    const key = pythonCasefold(m.navn);
    if (seen.has(key) && !duplicates.includes(m.navn)) duplicates.push(m.navn);
    seen.add(key);
  }
  return duplicates;
}
export function backfill_fra_standard<
  T extends { navn?: unknown; krav_maskestoerrelse_mm?: unknown },
>(materials: T[]): T[] {
  return materials.map((m) => {
    const source = defaults.MATERIAL_DB.find((s) => s.navn === m.navn);
    return m.krav_maskestoerrelse_mm == null && source?.krav_maskestoerrelse_mm != null
      ? { ...m, krav_maskestoerrelse_mm: Math.trunc(source.krav_maskestoerrelse_mm) }
      : { ...m };
  });
}
export const standard_designdiagrammer = (): DesignDiagram[] =>
  structuredClone(defaults.DESIGNDIAGRAM_RAW_TABLES);
export function diagramtal(value: unknown): number | null {
  return er_tom_vaerdi(value) ? null : valueOr<number | null>(() => pythonFloat(value), null);
}
export function normaliser_diagram_rows(value: unknown): [DiagramRow[], string[]] {
  const out: DiagramRow[] = [],
    errors: string[] = [],
    seen = new Set<number>();
  for (const [i, v] of rowsList(value).entries()) {
    const row = rowRecord(v);
    const get = (key: string, alias: string) => diagramtal(key in row ? row[key] : row[alias]);
    const eu = get('eu', 'Eᵤ (MPa)'),
      u = get('t_uarmeret_cm', 'Ustabiliseret tykkelse (cm)'),
      one = get('t_1_lag_cm', '1 lag tykkelse (cm)'),
      two = get('t_2_lag_cm', '2 lag tykkelse (cm)');
    if ([eu, u, one, two].every((v) => v === null)) continue;
    if (eu === null) {
      errors.push(`Række ${i + 1} mangler Eᵤ.`);
      continue;
    }
    if (seen.has(eu)) {
      errors.push(`Eᵤ ${pythonFixed(eu, 0, true).replaceAll(',', '.')} MPa findes flere gange.`);
      continue;
    }
    seen.add(eu);
    out.push({ eu, t_uarmeret_cm: u, t_1_lag_cm: one, t_2_lag_cm: two });
  }
  return [out.sort((a, b) => a.eu - b.eu), errors];
}
export function normaliser_designdiagrammer(value: unknown): [DesignDiagram[], string[]] {
  const values = rowsList(value),
    out: DesignDiagram[] = [],
    errors: string[] = [];
  for (const standard of standard_designdiagrammer()) {
    const raw = values.map(rowRecord).find((d) => d.diagram_nr === standard.diagram_nr) ?? standard;
    const [rows, messages] = normaliser_diagram_rows('rows' in raw ? raw.rows : []);
    errors.push(...messages.map((e) => `Diagram ${standard.diagram_nr}: ${e}`));
    out.push({ ...standard, rows });
  }
  return [out, errors];
}
export function generer_t_basis_table_fra_diagrammer(
  diagrams: { eo: number; rows?: Partial<DiagramRow>[] }[],
): BasisTable {
  const table: BasisTable = {};
  for (const d of diagrams)
    for (const row of d.rows ?? []) {
      table[row.eu!] ??= {};
      table[row.eu!][d.eo] = {
        uarmeret: row.t_uarmeret_cm ?? null,
        '1_lag': row.t_1_lag_cm ?? null,
        '2_lag': row.t_2_lag_cm ?? null,
      };
    }
  for (const row of Object.values(table))
    for (const eo of EO_KOLONNER) row[eo] ??= { uarmeret: null, '1_lag': null, '2_lag': null };
  return Object.fromEntries(Object.entries(table).sort(([a], [b]) => Number(a) - Number(b)));
}
export function interpoler_kurve(points: [number, number][], eu: number): number | null {
  const pts = points.map(([t, e]) => [e, t]).sort(([e1, t1], [e2, t2]) => e1 - e2 || t1 - t2);
  if (!pts.length || eu < pts[0][0] || eu > pts.at(-1)![0]) return null;
  for (let i = 0; i < pts.length - 1; i++) {
    const [e1, t1] = pts[i],
      [e2, t2] = pts[i + 1];
    if (e1 <= eu && eu <= e2) {
      const t = t1 + ((eu - e1) / (e2 - e1)) * (t2 - t1);
      return Math.floor(pythonRound(t * 10, 6) + 0.5) / 10;
    }
  }
  return pts[0][1];
}
export const diagrammer_har_aktuel_schema = (ds: { rows?: Record<string, unknown>[] }[]) =>
  ds.every((d) => (d.rows ?? []).every((r) => 'eu' in r));

const RUN_FIELDS = [
  'T',
  'eu',
  'slidlag',
  't_slid_mm',
  'bindelag',
  't_bindelag_mm',
  'bundet_baerelag',
  't_bundet_mm',
  'E_asf_vist_MPa',
  'ubundet_baerelag',
  't_SG_mm',
  'bundsikring',
  't_BL_mm',
  'levetid_styrende_aar',
  'bemaerkning',
];
const TEXT_FIELDS = [
  'T',
  'slidlag',
  'bindelag',
  'bundet_baerelag',
  'ubundet_baerelag',
  'bundsikring',
  'bemaerkning',
];
const RUN_TEXT_DEFAULTS: Record<string, string> = {
  ubundet_baerelag: defaults.VEJDIM_KOERSLER_STANDARD_RAEKKER[0].ubundet_baerelag,
  bundsikring: defaults.VEJDIM_KOERSLER_STANDARD_RAEKKER[0].bundsikring,
};
export const standard_koersel_raekker = (): RunRow[] =>
  structuredClone(defaults.VEJDIM_KOERSLER_STANDARD_RAEKKER);
export function normaliser_koersel_raekker(value: unknown): RunRow[] {
  if (!Array.isArray(value)) return standard_koersel_raekker();
  const out: RunRow[] = [];
  for (const r of value) {
    if (!isRecord(r)) continue;
    const t = editorText(r.T);
    const numbers = valueOr(
      () => [pythonInt(pythonFloat(r.eu)), pythonFloat(r.t_SG_mm), pythonFloat(r.t_BL_mm)],
      [],
    );
    if (numbers.length !== 3) continue;
    const [eu, sg, bl] = numbers;
    if (!t || sg < 0 || bl < 0) continue;
    const row: RunRow = { T: t, eu, t_SG_mm: sg, t_BL_mm: bl };
    for (const field of RUN_FIELDS)
      if (!(field in row)) {
        row[field] = TEXT_FIELDS.includes(field)
          ? !(field in r) && field in RUN_TEXT_DEFAULTS
            ? RUN_TEXT_DEFAULTS[field]
            : editorText(r[field])
          : valueOr(() => pythonFloat(r[field]), 0);
      }
    out.push(row);
  }
  if (!out.length) return standard_koersel_raekker();
  const known = new Set(out.map((r) => JSON.stringify([r.T, r.eu])));
  for (const row of standard_koersel_raekker())
    if (!known.has(JSON.stringify([row.T, row.eu]))) out.push(row);
  return out.sort((a, b) => (a.T < b.T ? -1 : a.T > b.T ? 1 : a.eu - b.eu));
}
export function koersler_fra_raekker(rows: Record<string, unknown>[]): TrafficRuns {
  const out: TrafficRuns = {};
  for (const row of rows) {
    const t = editorText(row.T),
      eu = valueOr<number | null>(() => pythonInt(pythonFloat(row.eu)), null);
    if (eu === null || !t) continue;
    // Own-property definition also preserves legitimate names such as "__proto__".
    if (!Object.hasOwn(out, t))
      Object.defineProperty(out, t, {
        value: {},
        enumerable: true,
        configurable: true,
        writable: true,
      });
    out[t][eu] = { sg: pythonFloat(row.t_SG_mm || 0), bl: pythonFloat(row.t_BL_mm || 0) };
  }
  return out;
}
export function berig_koersel_raekker(rows: Record<string, unknown>[]) {
  return rows.map((r) => {
    const sg = pythonFloat(r.t_SG_mm || 0),
      bl = pythonFloat(r.t_BL_mm || 0),
      bound =
        pythonFloat(r.t_slid_mm || 0) +
        pythonFloat(r.t_bindelag_mm || 0) +
        pythonFloat(r.t_bundet_mm || 0);
    return {
      ...structuredClone(r),
      t_ubundet_total_mm: sg + bl,
      t_befaestelse_total_mm: bound + sg + bl,
    };
  });
}

function load<T>(
  text: string | null,
  decode: (value: unknown) => T,
  fallback: () => T,
  bom = false,
): T {
  if (text === null) return fallback();
  try {
    return decode(JSON.parse(bom ? text.replace(/^\uFEFF/, '') : text));
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      (error instanceof Error && ['TypeError', 'ValueError'].includes(error.name))
    )
      return fallback();
    throw error;
  }
}
export const indlaes_indstillinger = (text: string | null) =>
  load(text, normaliser_indstillinger, standard_indstillinger);
export const indlaes_materialer = (text: string | null) =>
  load(
    text,
    (value) => {
      const materials = normaliser_materialer(value);
      return materials.length && !duplikerede_materialenavne(materials).length
        ? backfill_fra_standard(materials)
        : standard_materialer();
    },
    standard_materialer,
  );
export const indlaes_designdiagrammer = (text: string | null) =>
  load(
    text,
    (value) => {
      const [diagrams, errors] = normaliser_designdiagrammer(value);
      return errors.length ? standard_designdiagrammer() : diagrams;
    },
    standard_designdiagrammer,
  );
export const indlaes_koersel_raekker = (text: string | null) =>
  load(text, normaliser_koersel_raekker, standard_koersel_raekker, true);
export type SaveOperation = { kind: 'delete' } | { kind: 'write'; data: unknown };
export const gem_materialer = (data: unknown): SaveOperation => ({
  kind: 'write',
  data: structuredClone(data),
});
export const gem_designdiagrammer = gem_materialer;
export const gem_indstillinger = (data: unknown): SaveOperation => ({
  kind: 'write',
  data: normaliser_indstillinger(data),
});
export function equalData(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => equalData(v, b[i]));
  if (isRecord(a) && isRecord(b))
    return (
      Object.keys(a).length === Object.keys(b).length &&
      Object.keys(a).every((k) => Object.hasOwn(b, k) && equalData(a[k], b[k]))
    );
  return a === b;
}
export const gem_koersel_raekker = (data: unknown): SaveOperation =>
  equalData(data, standard_koersel_raekker()) ? { kind: 'delete' } : gem_materialer(data);
