/** Pure orchestration from reference app.py. UI state/persistence stays outside this module. */
import * as a from './afrunding.ts';
import * as l from './lagfordeling.ts';
import { beregn } from './calculator.ts';
import { GEONET_DB, PHI_BASIS, EO_KOLONNER, klasse_til_eo } from './data.ts';
import { beregn_alle_produkter } from './products.ts';
import { enrich_result_with_placement } from './placement.ts';
import { trafik_opslag } from './traffic.ts';
import type { TrafficRuns, TrafficLookup } from './traffic.ts';
import type { BasisTable, Layer, LayerSpec, Rounding } from './types.ts';

export interface Material extends Layer {
  navn: string;
  phi: number;
  pct?: number | null;
}
export interface Settings {
  afrunding?: unknown;
  lagfordeling?: unknown;
  yderomraade?: unknown;
}
export interface DimensioningInput {
  tilstand: 'Standard' | 'Brugerdefineret';
  eu: number;
  grundlag:
    { type: 'belastningsklasse'; klasse: number } | { type: 'trafikklasse'; t_klasse: string };
  geonet_navn?: string;
  materialer?: Material[];
  phi_manuel?: number | null;
  indstillinger?: Settings;
  t_basis_table?: BasisTable | null;
  koersler?: TrafficRuns | null;
}
export function eo_til_naermeste_klasse(eo: number | null): number | null {
  if (eo === null) return null;
  let best = 0;
  for (let i = 1; i < EO_KOLONNER.length; i++)
    if (Math.abs(EO_KOLONNER[i] - eo) < Math.abs(EO_KOLONNER[best] - eo)) best = i;
  return best + 1;
}
export function beregn_grundlag(input: DimensioningInput) {
  if (input.grundlag.type === 'belastningsklasse')
    return {
      type: input.grundlag.type,
      eo: klasse_til_eo(input.grundlag.klasse),
      valgt_klasse: input.grundlag.klasse,
      t_klasse: null,
      eo_aekv: null,
      zone: null,
      skala: 1,
      yder: null,
    };
  const lookup = trafik_opslag(
    input.grundlag.t_klasse,
    input.eu,
    input.koersler,
    input.t_basis_table,
    input.indstillinger?.yderomraade,
  );
  const fields = [
    'afvigelse_pct',
    'tolerance_pct',
    'inden_tolerance',
    'handling',
    't_vejdim_mm',
    't_rand_mm',
    'eo_rand',
  ] as const satisfies readonly (keyof TrafficLookup)[];
  return {
    type: input.grundlag.type,
    eo: lookup.eo,
    valgt_klasse: eo_til_naermeste_klasse(lookup.eo),
    t_klasse: input.grundlag.t_klasse,
    eo_aekv: lookup.eo,
    zone: lookup.zone,
    skala: lookup.skala,
    yder: ['under', 'over'].includes(lookup.zone)
      ? Object.fromEntries(fields.map((k) => [k, lookup[k]]))
      : null,
  };
}
type Basis = ReturnType<typeof beregn_grundlag>;
const minimumsklasse = (g: Basis) =>
  g.type === 'trafikklasse' ? l.klasse_for_eo(g.eo) : g.valgt_klasse;
export function fordelingsgrundlag(g: Basis, settings: Settings) {
  const ind = l.normaliser(settings.lagfordeling),
    klasse = minimumsklasse(g);
  return {
    fordeling: ind.fordeling,
    klasse,
    min_mm: l.min_oeverste_lag(ind, klasse),
    samlet_min_mm: l.min_samlet(ind, klasse),
    restlag: ind.restlag,
    restlag_graense_mm: ind.restlag_graense_mm,
    vd_minimum_mm: { ...ind.vd_minimum_mm },
    phi_regel: ind.phi_regel,
    kraev_bundsikring: ind.kraev_bundsikring,
    netplacering: ind.netplacering,
  };
}
type Distribution = ReturnType<typeof fordelingsgrundlag>;
export function lag_til_fordeling(materialer: Material[]): Layer[] {
  const mm = materialer.some((m) => (m.tykkelse_mm || 0) > 0);
  return materialer.flatMap((m) => {
    const andel = (mm ? m.tykkelse_mm : m.pct) || 0;
    return andel > 0
      ? [{ navn: m.navn ?? 'Lag', andel, lagtype: m.lagtype ?? null, phi: m.phi ?? null }]
      : [];
  });
}
export function lagspec(materialer: Material[], fordeling: Distribution): LayerSpec | null {
  const lag = lag_til_fordeling(materialer);
  if (lag.length < 2) return null;
  let ref: number | null = null;
  if (fordeling.fordeling === 'fastholdt')
    for (const m of materialer) {
      if ((m.tykkelse_mm || 0) > 0) {
        ref = m.tykkelse_mm!;
        break;
      }
      if ((m.pct || 0) > 0) break;
    }
  return {
    lag,
    fordeling: fordeling.fordeling,
    min_mm: fordeling.min_mm,
    oeverst_ref_mm: ref,
    restlag: fordeling.restlag,
    restlag_graense_mm: fordeling.restlag_graense_mm,
    vd_minimum_mm: fordeling.restlag === 'vd' ? { ...fordeling.vd_minimum_mm } : null,
    phi_regel: fordeling.phi_regel,
    kraev_bundsikring: fordeling.kraev_bundsikring,
  };
}
export function afrunding_til_beregning(
  settings: Settings,
  materialer: Material[],
  fordeling: Distribution,
): Rounding {
  const out = a.normaliser(settings.afrunding);
  if (fordeling.samlet_min_mm) out.t_min_mm = fordeling.samlet_min_mm;
  const spec = lagspec(materialer, fordeling);
  if (spec && (spec.vd_minimum_mm || spec.phi_regel !== 'indtastet')) out.lagopbygning = spec;
  return out;
}
export function standard_opdeling(g: Basis, settings: Settings) {
  const ind = l.normaliser(settings.lagfordeling),
    klasse = minimumsklasse(g);
  const out: {
    klassisk: boolean;
    spec: LayerSpec | null;
    stabilgrus_mm: number | null;
    under_minimum: string;
    t_min_mm: number | null;
    klasse: number | null;
  } = {
    klassisk: ind.standard_klassisk,
    spec: null,
    stabilgrus_mm: null,
    under_minimum: ind.standard_under_minimum,
    t_min_mm: null,
    klasse,
  };
  if (out.klassisk) return out;
  const min = l.minimum_for_klasse(ind, klasse);
  let totalMin = l.min_samlet(ind, klasse);
  if (ind.standard_opdeling && min) {
    out.spec = l.standard_spec(ind, min);
    out.stabilgrus_mm = a.rund_op(min, a.normaliser(settings.afrunding).trin_mm);
    if (totalMin === null && out.under_minimum === 'loeft') totalMin = min;
  }
  out.t_min_mm = totalMin;
  return out;
}
export function afrunding_standard(
  settings: Settings,
  opdeling: ReturnType<typeof standard_opdeling>,
): Rounding {
  const out = a.normaliser(settings.afrunding);
  if (opdeling.klassisk) return out;
  if (opdeling.t_min_mm) out.t_min_mm = opdeling.t_min_mm;
  if (opdeling.spec?.vd_minimum_mm) out.lagopbygning = opdeling.spec;
  return out;
}
export function phi_fra_materialer(materialer: Material[]): number {
  const pct = materialer.some((m) => m.pct != null);
  let total = 0,
    sum = 0;
  for (const m of materialer) {
    const v = (pct ? m.pct : m.tykkelse_mm) || 0;
    total += v;
    sum += v * m.phi;
  }
  return total > 0 ? sum / total : PHI_BASIS;
}
const STANDARD_GEONET = 'Tensar TriAx TX160';
const REFERENCE_NET = 'Referencenet (TX160 / SX160 / T6)';
const SERIES: Record<string, number> = {
  Reference: 0,
  Tensar: 1,
  'GS-GRID': 2,
  "E'GRID": 3,
  Manuel: 4,
};
export function geonet_valgliste(names: string[]): { valg: string[]; standard: string | null } {
  const series = (name: string) => SERIES[GEONET_DB.find((p) => p.navn === name)?.serie ?? ''] ?? 5;
  const natural = (name: string) =>
    name
      .toLowerCase()
      .split(/(\d+)/)
      .map((v) => (/^\d+$/.test(v) ? Number(v) : v));
  const valg = [...new Set(names)].sort((x, y) => {
    const s = series(x) - series(y);
    if (s) return s;
    const a = natural(x),
      b = natural(y);
    for (let i = 0; i < Math.min(a.length, b.length); i++)
      if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    return a.length - b.length;
  });
  return { valg, standard: valg.includes(STANDARD_GEONET) ? STANDARD_GEONET : (valg[0] ?? null) };
}

/** Same latest-dimensioning payload as app.py; null means no reportable result. */
export function dimensioner(input: DimensioningInput) {
  const g = beregn_grundlag(input);
  if (g.eo === null) return null;
  const settings = input.indstillinger ?? {},
    standard = input.tilstand === 'Standard';
  const materials = standard ? [] : structuredClone(input.materialer ?? []);
  const split = standard_opdeling(g, settings),
    distribution = fordelingsgrundlag(g, settings);
  if (input.phi_manuel != null) distribution.phi_regel = 'indtastet';
  const rounding = standard
    ? afrunding_standard(settings, split)
    : afrunding_til_beregning(settings, materials, distribution);
  const phi = standard
    ? PHI_BASIS
    : a.afrund_phi(input.phi_manuel ?? phi_fra_materialer(materials), rounding.phi_afrunding);
  const common = {
    eu: input.eu,
    eo: g.eo,
    phi,
    skala: g.skala,
    t_basis_table: input.t_basis_table,
    afrunding: rounding,
  };
  const products = (lag_mode: string) =>
    beregn_alle_produkter({ ...common, lag_mode, klasse_for_anbefaling: g.valgt_klasse });
  const p1 = products('1_lag'),
    p2 = products('2_lag');
  const available = geonet_valgliste(
    [...p1, ...p2].filter((p) => p.fejl === null && p.t_armeret_mm != null).map((p) => p.navn),
  );
  if (standard && !available.valg.length) return null;
  const name =
    input.geonet_navn && available.valg.includes(input.geonet_navn)
      ? input.geonet_navn
      : (available.standard ?? REFERENCE_NET);
  const geonet = structuredClone(GEONET_DB.find((p) => p.navn === name) ?? null);
  const selected1 = p1.find((p) => p.navn === name),
    selected2 = p2.find((p) => p.navn === name);
  const calculate = (lag_mode: string) =>
    enrich_result_with_placement(
      beregn({ ...common, lag_mode, net_korrektion: geonet?.korrektion ?? 0 }),
      geonet,
    );
  const missing = { fejl: 'Ikke gyldigt for denne kombination.' };
  const res1 = standard ? (selected1 ?? missing) : calculate('1_lag');
  const res2 = standard ? (selected2 ?? missing) : calculate('2_lag');
  if (!standard && res1.fejl && res2.fejl) return null;
  return {
    tilstand: input.tilstand,
    eu: input.eu,
    eo: g.eo,
    valgt_klasse: g.valgt_klasse,
    grundlag_type: g.type,
    t_klasse: g.t_klasse,
    eo_aekv: g.eo_aekv,
    zone: g.zone,
    skala: g.skala,
    yder: g.yder,
    phi,
    materialer: materials,
    geonet,
    geonet_navn: name,
    res_1: res1,
    res_2: res2,
    afrunding: rounding,
    ...(standard ? { standard_opdeling: split } : { fordeling: distribution }),
    t_uarmeret_mm:
      ('t_uarmeret_mm' in res1 && res1.t_uarmeret_mm) ||
      ('t_uarmeret_mm' in res2 && res2.t_uarmeret_mm) ||
      null,
    t_1_lag_best_mm: selected1?.t_armeret_mm_min ?? null,
    t_2_lag_best_mm: selected2?.t_armeret_mm_min ?? null,
    t_1_lag_best_eksakt_mm: selected1?.t_armeret_eksakt_mm_min ?? null,
    t_2_lag_best_eksakt_mm: selected2?.t_armeret_eksakt_mm_min ?? null,
    phi_1_lag_best: selected1?.phi_min ?? null,
    phi_2_lag_best: selected2?.phi_min ?? null,
  };
}
