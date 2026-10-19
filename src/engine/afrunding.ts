import { isRecord, pythonNumber, pythonRound } from './python-numbers.ts';
import type { CalculationResult, DistributedLayer, Layer, LayerSpec, Rounding } from './types.ts';
import { byggelig_total, fordel_opbygning, oeverste_lag_mm } from './lagfordeling.ts';

export const TRIN_VALG = [1, 5, 10, 50, 100];
export const PHI_AFRUNDING_VALG = ['ingen', 'ned', 'naermeste'];
const TOLERANCE = 1e-6; // Existing Python algorithm tolerance, not a migration comparison tolerance.
export function normaliser(indstilling: unknown): Rounding {
  const out: Rounding = {
    trin_mm: 50,
    reduktion_eksakt: false,
    vis_eksakt: false,
    phi_afrunding: 'ingen',
  };
  if (!isRecord(indstilling)) return out;
  const step = indstilling.trin_mm;
  if (pythonNumber(step) && TRIN_VALG.includes(Math.trunc(Number(step))))
    out.trin_mm = Math.trunc(Number(step));
  for (const key of ['reduktion_eksakt', 'vis_eksakt'] as const)
    if (typeof indstilling[key] === 'boolean') out[key] = indstilling[key];
  if (
    typeof indstilling.phi_afrunding === 'string' &&
    PHI_AFRUNDING_VALG.includes(indstilling.phi_afrunding)
  )
    out.phi_afrunding = indstilling.phi_afrunding;
  if (typeof indstilling.t_min_mm === 'number' && indstilling.t_min_mm > 0)
    out.t_min_mm = indstilling.t_min_mm;
  if (
    isRecord(indstilling.lagopbygning) &&
    Array.isArray(indstilling.lagopbygning.lag) &&
    indstilling.lagopbygning.lag.length
  )
    out.lagopbygning = indstilling.lagopbygning as unknown as LayerSpec;
  return out;
}
export function afrund_phi(phi: number, metode?: string | null): number;
export function afrund_phi(phi: number | null, metode?: string | null): number | null;
export function afrund_phi(phi: number | null, metode?: string | null): number | null {
  if (phi === null) return null;
  if (metode === 'ned') return Math.floor(phi + TOLERANCE);
  if (metode === 'naermeste') return Math.floor(phi + 0.5 + TOLERANCE);
  return phi;
}
export function rund_op(vaerdi: number, trin: number): number;
export function rund_op(vaerdi: number | null, trin: number): number | null;
export function rund_op(vaerdi: number | null, trin: number): number | null {
  if (vaerdi === null) return null;
  trin = trin ? Math.trunc(trin) : 1;
  const result =
    trin <= 1 ? Math.ceil(vaerdi - TOLERANCE) : Math.ceil(vaerdi / trin - TOLERANCE) * trin;
  return result === 0 ? 0 : result; // Python ceil returns integer zero, never -0.
}
export const er_oprundet = (afrundet: number | null, eksakt: number | null) =>
  afrundet !== null && eksakt !== null && Math.abs(afrundet - eksakt) >= 0.5;
export const eksakt_navn = (felt: string) =>
  felt.endsWith('_mm') ? felt.slice(0, -3) + '_eksakt_mm' : felt + '_eksakt';
export const minimum_navn = (felt: string) => felt.replace(/_mm$/, '') + '_til_minimum';
export const lagminimum_navn = (felt: string) => felt.replace(/_mm$/, '') + '_til_lagminimum';

export function fordel_lag(
  lag: Layer[],
  total_mm: number | null,
  trin: number,
): DistributedLayer[] {
  lag = lag.filter((l) => (l.andel || 0) > 0);
  if (!lag.length || !total_mm || total_mm <= 0) return [];
  trin = trin ? Math.trunc(trin) : 1;
  const n = pythonRound(rund_op(total_mm, trin) / trin);
  const sum = lag.reduce((s, l) => s + l.andel!, 0);
  const shares = lag.map((l) => (l.andel! / sum) * n);
  let basis = shares.map((a) => Math.floor(a + TOLERANCE));
  if (n >= lag.length) basis = basis.map((b) => Math.max(b, 1));
  let rest = n - basis.reduce((s, b) => s + b, 0);
  const order = shares
    .map((_, i) => i)
    .sort(
      (i, j) =>
        shares[j] -
          Math.floor(shares[j] + TOLERANCE) -
          (shares[i] - Math.floor(shares[i] + TOLERANCE)) || shares[j] - shares[i],
    );
  let i = 0;
  while (rest > 0 && order.length) {
    basis[order[i++ % order.length]]++;
    rest--;
  }
  i = 0;
  while (rest < 0 && order.length) {
    const j = order[order.length - 1 - (i % order.length)];
    if (basis[j] > 1 || n < lag.length) {
      basis[j]--;
      rest++;
    }
    if (++i > 10 * order.length) break;
  }
  return lag.map(({ andel: _andel, ...layer }, i) => ({
    ...layer,
    navn: layer.navn ?? 'Lag',
    tykkelse_mm: basis[i] * trin,
  }));
}

export function anvend_paa_resultat(
  res: CalculationResult,
  indstilling: unknown,
): CalculationResult {
  if (res.fejl !== null) return res;
  const ind = normaliser(indstilling),
    trin = ind.trin_mm;
  const t_min = ind.t_min_mm === undefined ? null : rund_op(ind.t_min_mm, trin);
  const out = { ...res };
  for (const field of ['t_armeret_mm', 't_uarmeret_mm', 't_uarmeret_phi_kor_mm'] as const) {
    if (!(field in res)) continue;
    const v = res[field] ?? null;
    const exact = eksakt_navn(field) as
      't_armeret_eksakt_mm' | 't_uarmeret_eksakt_mm' | 't_uarmeret_phi_kor_eksakt_mm';
    out[exact] = v;
    let rounded = rund_op(v, trin);
    if (t_min !== null && rounded !== null && rounded < t_min) {
      rounded = t_min;
      out[
        minimum_navn(field) as
          't_armeret_til_minimum' | 't_uarmeret_til_minimum' | 't_uarmeret_phi_kor_til_minimum'
      ] = true;
    }
    out[field] = rounded;
  }
  out.t_min_mm = t_min;
  if (ind.lagopbygning) anvend_lagminimum(out, ind.lagopbygning, trin);
  out.reduktion_mm_eksakt = res.reduktion_mm ?? null;
  out.reduktion_pct_eksakt = res.reduktion_pct ?? null;
  if (!ind.reduktion_eksakt) {
    const ref = out.t_uarmeret_phi_kor_mm ?? out.t_uarmeret_mm;
    const arm = out.t_armeret_mm;
    if (ref != null && arm != null) {
      out.reduktion_mm = ref - arm;
      out.reduktion_pct = ref > 0 ? pythonRound((ref - arm) / ref, 4) : null;
    }
  }
  out.afrunding_trin_mm = trin;
  return out;
}
function anvend_lagminimum(out: CalculationResult, spec: LayerSpec, trin: number): void {
  if (!spec.vd_minimum_mm || !Object.keys(spec.vd_minimum_mm).length) return;
  const layers = spec.lag || [];
  let ref = spec.fordeling === 'fastholdt' ? (spec.oeverst_ref_mm ?? null) : null;
  const kw = {
    fordeling: spec.fordeling,
    min_mm: spec.min_mm,
    vd_minimum_mm: spec.vd_minimum_mm,
    kraev_alle_lag: !!spec.kraev_bundsikring,
  };
  const uarm = out.t_uarmeret_phi_kor_mm;
  if (uarm != null) {
    const next = byggelig_total(layers, uarm, trin, { ...kw, oeverst_ref_mm: ref });
    if (next !== null && next > uarm) {
      out.t_uarmeret_phi_kor_mm = next;
      out.t_uarmeret_phi_kor_til_lagminimum = true;
    }
    if (spec.fordeling === 'fastholdt' && ref === null)
      ref = oeverste_lag_mm(layers, out.t_uarmeret_phi_kor_mm ?? null, trin, kw);
  }
  const arm = out.t_armeret_mm;
  if (arm != null) {
    const next = byggelig_total(layers, arm, trin, { ...kw, oeverst_ref_mm: ref });
    if (next !== null && next > arm) {
      out.t_armeret_mm = next;
      out.t_armeret_til_lagminimum = true;
      const split = (t: number) =>
        fordel_opbygning(layers, t, trin, { ...kw, oeverst_ref_mm: ref }).map(
          ({ navn, tykkelse_mm }) => ({ navn, tykkelse_mm }),
        );
      out.t_armeret_lagtillaeg_lag = { foer: split(arm), efter: split(next) };
    }
  }
}
export function tillaeg(
  angivet: number | null,
  eksakt: number | null,
  trin: number,
  t_min: number | null = null,
): [number, number, number] {
  if (angivet === null || eksakt === null) return [0, 0, 0];
  const rounded = rund_op(eksakt, trin),
    after = t_min ? Math.max(rounded, t_min) : rounded;
  return [
    er_oprundet(rounded, eksakt) ? rounded - eksakt : 0,
    after - rounded >= 0.5 ? after - rounded : 0,
    angivet - after >= 0.5 ? angivet - after : 0,
  ];
}
export function reduktion_for(
  t_ref: number | null,
  t_arm: number | null,
  t_ref_eksakt: number | null = null,
  t_arm_eksakt: number | null = null,
  indstilling: unknown = null,
): [number | null, number | null] {
  if (normaliser(indstilling).reduktion_eksakt && t_ref_eksakt !== null && t_arm_eksakt !== null) {
    t_ref = t_ref_eksakt;
    t_arm = t_arm_eksakt;
  }
  if (t_ref === null || t_arm === null) return [null, null];
  return [t_ref - t_arm, t_ref > 0 ? (t_ref - t_arm) / t_ref : null];
}
export const trin_tekst = (trin: number) => `${Math.trunc(trin)} mm`;
