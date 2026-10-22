import { fordel_lag, rund_op } from './afrunding.ts';
import { isRecord } from './python-numbers.ts';
import type { Layer, DistributedLayer, LayerSpec } from './types.ts';
export const FORDELING_VALG = ['proportional', 'minimum', 'fastholdt', 'minimum_geonet'];
/** Fordelingen for én søjle. Ved 'minimum_geonet' sættes det øverste lag til minimumstykkelsen
 * i opbygningerne med geonet; den ustabiliserede opbygning fordeles som 'minimum'. */
export function soejle_fordeling(
  fordeling: string | null | undefined,
  min_mm: number | null | undefined,
  armeret: boolean,
): { fordeling: string; oeverst_ref_mm: number | null } | null {
  if (fordeling !== 'minimum_geonet') return null;
  return armeret && min_mm
    ? { fordeling: 'fastholdt', oeverst_ref_mm: min_mm }
    : { fordeling: 'minimum', oeverst_ref_mm: null };
}
export const RESTLAG_VALG = ['vis', 'flet', 'vd'];
export const MINIMUMSKLASSE_VALG = ['hoejeste', 'laveste'];
export const PHI_VALG = ['indtastet', 'laveste', 'soejle'];
export const STANDARD_MINIMUM_MM: Record<string, number> = {
  1: 200,
  2: 200,
  3: 200,
  4: 250,
  5: 275,
  6: 300,
};
export const STANDARD_VD_MINIMUM_MM: Record<string, number> = { Bærelag: 100, Bundsikring: 200 };
const valid = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v);
const clamp = (v: number, min: number) => Math.min(Math.max(v, min), 1000);
export function normaliser(value: unknown) {
  const out = {
    fordeling: 'minimum',
    samlet_minimum: true,
    minimumsklasse: 'hoejeste',
    minimum_mm: { ...STANDARD_MINIMUM_MM },
    restlag: 'vis',
    restlag_graense_mm: 100,
    vd_minimum_mm: { ...STANDARD_VD_MINIMUM_MM },
    phi_regel: 'laveste',
    kraev_bundsikring: false,
    netplacering: 'laggraense',
    standard_klassisk: false,
    standard_opdeling: true,
    standard_under_minimum: 'stabilgrus',
  };
  if (!isRecord(value)) return out;
  for (const [key, options] of [
    ['fordeling', FORDELING_VALG],
    ['restlag', RESTLAG_VALG],
    ['minimumsklasse', MINIMUMSKLASSE_VALG],
    ['phi_regel', PHI_VALG],
    ['netplacering', ['laggraense', 'daeklag', 'laggraense_min']],
    ['standard_under_minimum', ['stabilgrus', 'loeft', 'ubundet']],
  ] as const) {
    const v = value[key];
    if (typeof v === 'string' && (options as readonly string[]).includes(v)) out[key] = v;
  }
  for (const key of [
    'samlet_minimum',
    'kraev_bundsikring',
    'standard_klassisk',
    'standard_opdeling',
  ] as const)
    if (typeof value[key] === 'boolean') out[key] = value[key];
  if (isRecord(value.minimum_mm))
    for (const [key, v] of Object.entries(value.minimum_mm)) {
      if (/^[+-]?\d+$/.test(key.trim()) && String(Number(key)) in out.minimum_mm && valid(v))
        out.minimum_mm[String(Number(key))] = clamp(v, 100);
    }
  if (isRecord(value.vd_minimum_mm))
    for (const key of Object.keys(out.vd_minimum_mm)) {
      const v = value.vd_minimum_mm[key];
      if (valid(v)) out.vd_minimum_mm[key] = clamp(v, 0);
    }
  if (valid(value.restlag_graense_mm)) out.restlag_graense_mm = clamp(value.restlag_graense_mm, 0);
  return out;
}
export const lagtype_noegle = (type?: string | null) =>
  String(type || '')
    .trim()
    .toLowerCase()
    .startsWith('bunds')
    ? 'Bundsikring'
    : 'Bærelag';
export function klasse_for_eo(eo: number | null, valg = 'hoejeste'): number | null {
  if (eo === null) return null;
  const levels = [30, 45, 60, 80, 120, 150];
  const i = levels.findIndex((v) => v >= eo - 1e-6);
  if (i < 0) return 6;
  // Ligger Eₒ,ækv mellem to klasser, vælges den højeste (standard) eller den laveste af de to.
  return valg === 'laveste' && i > 0 && levels[i] > eo + 1e-6 ? i : i + 1;
}
export function minimum_for_klasse(indstilling: unknown, klasse: number | null): number | null {
  if (klasse === null) return null;
  const v = normaliser(indstilling).minimum_mm[Math.trunc(klasse)];
  return v && v > 0 ? v : null;
}
export const min_oeverste_lag = (ind: unknown, k: number | null) =>
  normaliser(ind).fordeling === 'proportional' ? null : minimum_for_klasse(ind, k);
export const min_samlet = (ind: unknown, k: number | null) =>
  normaliser(ind).samlet_minimum ? minimum_for_klasse(ind, k) : null;
type Options = Omit<LayerSpec, 'lag'> & { kraev_alle_lag?: boolean };
export function fordel_opbygning(
  lag: Layer[],
  total_mm: number | null,
  trin: number,
  options: Options = {},
): DistributedLayer[] {
  const {
    fordeling = 'proportional',
    min_mm = null,
    oeverst_ref_mm = null,
    restlag = 'vis',
    restlag_graense_mm = null,
  } = options;
  const prop = fordel_lag(lag, total_mm, trin);
  let out = prop;
  if (fordeling !== 'proportional' && prop.length >= 2) {
    lag = lag.filter((l) => (l.andel || 0) > 0);
    const total = prop.reduce((s, l) => s + l.tykkelse_mm, 0),
      top = prop[0].tykkelse_mm,
      min = min_mm ? rund_op(min_mm, trin) : 0;
    const next = Math.min(
      // Fastholdt: præcis den indtastede tykkelse uden klasseminimum (beslutning 22. oktober 2026).
      fordeling === 'fastholdt' && oeverst_ref_mm
        ? rund_op(oeverst_ref_mm, trin)
        : Math.max(top, min),
      total,
    );
    if (Math.abs(next - top) >= 0.5)
      out = [
        { ...prop[0], tykkelse_mm: next },
        ...(total - next > 0 ? fordel_lag(lag.slice(1), total - next, trin) : []),
      ];
  }
  out = out.filter((l) => l.tykkelse_mm > 0);
  if (restlag === 'flet' && restlag_graense_mm) {
    out = out.map((l) => ({ ...l }));
    for (let i = out.length - 1; i > 0; i--)
      if (out[i].tykkelse_mm > 0 && out[i].tykkelse_mm < restlag_graense_mm - 1e-6) {
        out[i - 1].tykkelse_mm += out[i].tykkelse_mm;
        out[i].tykkelse_mm = 0;
      }
    out = out.filter((l) => l.tykkelse_mm > 0);
  }
  return out;
}
export interface ByggeligTotalResult {
  total_mm: number | null;
  vd_minimum_opfyldt: boolean | null;
}
export function byggelig_total_med_status(
  lag: Layer[],
  total_mm: number | null,
  trin: number,
  options: Options = {},
): ByggeligTotalResult {
  const vd = options.vd_minimum_mm;
  if (total_mm === null || total_mm <= 0 || !vd || !Object.keys(vd).length)
    return { total_mm, vd_minimum_opfyldt: null };
  trin = trin ? Math.trunc(trin) : 1;
  const types = Object.fromEntries(lag.map((l) => [l.navn ?? 'Lag', l.lagtype]));
  const count = lag.filter((l) => (l.andel || 0) > 0).length,
    start = rund_op(total_mm, trin);
  for (let t = start; t <= start + 3000; t += trin) {
    const split = fordel_opbygning(lag, t, trin, {
      fordeling: options.fordeling,
      min_mm: options.min_mm,
      oeverst_ref_mm: options.oeverst_ref_mm,
    });
    if (options.kraev_alle_lag && split.length < count) continue;
    if (
      split.length < 2 ||
      split
        .slice(1)
        .every((l) => l.tykkelse_mm >= (vd[lagtype_noegle(l.lagtype || types[l.navn])] ?? 0) - 1e-6)
    )
      return { total_mm: t > start ? t : total_mm, vd_minimum_opfyldt: true };
  }
  return { total_mm, vd_minimum_opfyldt: false };
}
export function byggelig_total(
  lag: Layer[],
  total_mm: number | null,
  trin: number,
  options: Options = {},
): number | null {
  return byggelig_total_med_status(lag, total_mm, trin, options).total_mm;
}
export function oeverste_lag_mm(
  lag: Layer[],
  total_mm: number | null,
  trin: number,
  options: Options = {},
): number | null {
  return (
    fordel_opbygning(lag, total_mm, trin, {
      fordeling: options.fordeling,
      min_mm: options.min_mm,
    })[0]?.tykkelse_mm ?? null
  );
}
export function fordel_soejle(
  spec: LayerSpec,
  total_mm: number | null,
  trin: number,
  t_uarm_mm: number | null = null,
  armeret = t_uarm_mm !== null,
): DistributedLayer[] {
  if (!total_mm) return [];
  const lag = spec.lag || [],
    soejle = soejle_fordeling(spec.fordeling, spec.min_mm, armeret);
  if (soejle)
    return fordel_opbygning(lag, total_mm, trin, {
      ...soejle,
      min_mm: spec.min_mm,
      restlag: spec.restlag || 'vis',
      restlag_graense_mm: spec.restlag_graense_mm,
    });
  const fordeling = spec.fordeling || 'proportional';
  let ref = fordeling === 'fastholdt' ? (spec.oeverst_ref_mm ?? null) : null;
  if (fordeling === 'fastholdt' && ref === null && t_uarm_mm)
    ref = oeverste_lag_mm(lag, t_uarm_mm, trin, { fordeling, min_mm: spec.min_mm });
  return fordel_opbygning(lag, total_mm, trin, {
    fordeling,
    min_mm: spec.min_mm,
    oeverst_ref_mm: ref,
    restlag: spec.restlag || 'vis',
    restlag_graense_mm: spec.restlag_graense_mm,
  });
}
export function standard_spec(
  indstilling: unknown,
  stabilgrus_min_mm: number | null,
): LayerSpec | null {
  if (!stabilgrus_min_mm) return null;
  const ind = normaliser(indstilling);
  return {
    lag: [
      { navn: 'Stabilgrus', andel: 1, lagtype: 'Bærelag' },
      { navn: 'Bundsikring', andel: 1, lagtype: 'Bundsikring' },
    ],
    fordeling: 'fastholdt',
    min_mm: null,
    oeverst_ref_mm: stabilgrus_min_mm,
    restlag: ind.restlag,
    restlag_graense_mm: ind.restlag_graense_mm,
    vd_minimum_mm: ind.restlag === 'vd' ? { ...ind.vd_minimum_mm } : null,
    kraev_bundsikring: ind.kraev_bundsikring,
    phi_regel: 'indtastet',
  };
}
export function vaegtet_phi(layers: DistributedLayer[] | null): number | null {
  if (!layers?.length) return null;
  const total = layers.reduce((s, l) => s + l.tykkelse_mm, 0);
  if (total <= 0) return null;
  let weighted = 0;
  for (const l of layers) {
    if (typeof l.phi !== 'number') return null;
    weighted += l.tykkelse_mm * l.phi;
  }
  return weighted / total;
}
