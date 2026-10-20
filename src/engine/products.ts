import { GEONET_DB, PHI_BASIS, eo_til_klasse } from './data.ts';
import { beregn } from './calculator.ts';
import { check_geonet_placement } from './placement.ts';
import type { Placement } from './placement.ts';
import type { CalculationInput, CalculationResult } from './types.ts';
import { pythonRound } from './python-numbers.ts';
export type ProductRow = Omit<CalculationResult, 't_basis_arm_mm'> &
  Partial<Placement> & {
    navn: string;
    serie: string | null;
    korrektion: number;
    klasse_ok: boolean;
    klasser: number[];
    min_daklag: number | boolean | null;
    max_korn: number | null;
    t_basis_arm_mm: number | null;
    korrektion_min?: number;
    korrektion_max?: number;
    t_armeret_mm_min?: number | null;
    t_armeret_mm_max?: number | null;
    t_armeret_eksakt_mm_min?: number | null;
    phi_min?: number | null;
    reduktion_mm_min?: number | null;
    reduktion_mm_max?: number | null;
    reduktion_pct_min?: number | null;
    reduktion_pct_max?: number | null;
    placering_best?: Placement;
  };
export type ProductsInput = Omit<CalculationInput, 'phi' | 'net_korrektion'> & {
  phi?: number;
  klasse_for_anbefaling?: number | null;
};
export function beregn_alle_produkter(input: ProductsInput): ProductRow[] {
  const { phi = PHI_BASIS, klasse_for_anbefaling = null, ...args } = input;
  const klasse = klasse_for_anbefaling ?? eo_til_klasse(args.eo);
  const rows: ProductRow[] = [];
  const exactFields: (keyof CalculationResult)[] = [
    't_armeret_eksakt_mm',
    't_uarmeret_eksakt_mm',
    't_uarmeret_phi_kor_eksakt_mm',
    'reduktion_mm_eksakt',
    'reduktion_pct_eksakt',
    'afrunding_trin_mm',
    't_min_mm',
    't_armeret_til_minimum',
    't_uarmeret_til_minimum',
    't_uarmeret_phi_kor_til_minimum',
    't_armeret_til_lagminimum',
    't_uarmeret_phi_kor_til_lagminimum',
    't_armeret_vd_minimum_ikke_opfyldt',
    't_uarmeret_phi_kor_vd_minimum_ikke_opfyldt',
    't_armeret_lagtillaeg_lag',
    'phi',
    'phi_uarmeret',
    'phi_indtastet',
    'phi_regel',
    'phi_eksakt',
    'phi_uarmeret_eksakt',
    'phi_afrunding',
  ];
  for (const geonet of GEONET_DB) {
    if (geonet.navn === 'Anden armering (manuel)') continue;
    const res = beregn({ ...args, phi, net_korrektion: geonet.korrektion! });
    const row: ProductRow = {
      navn: geonet.navn,
      serie: geonet.serie ?? null,
      korrektion: geonet.korrektion!,
      t_armeret_mm: res.t_armeret_mm ?? null,
      t_uarmeret_mm: res.t_uarmeret_mm ?? null,
      t_uarmeret_phi_kor_mm: res.t_uarmeret_phi_kor_mm ?? null,
      t_basis_arm_mm: res.t_basis_arm_mm ?? null,
      reduktion_mm: res.reduktion_mm ?? null,
      reduktion_pct: res.reduktion_pct ?? null,
      klasse_ok: klasse === null || geonet.klasser!.includes(klasse),
      klasser: [...geonet.klasser!],
      min_daklag: geonet.min_daklag ?? null,
      max_korn: geonet.max_korn ?? null,
      fejl: res.fejl,
    };
    for (const field of exactFields) if (field in res) Object.assign(row, { [field]: res[field] });
    if (res.fejl === null && res.t_armeret_mm != null)
      Object.assign(
        row,
        check_geonet_placement({ lag_mode: args.lag_mode, total_mm: res.t_armeret_mm, geonet }),
      );
    if (geonet.korrektion_interval != null && res.fejl === null) {
      const [best, conservative] = geonet.korrektion_interval;
      const resBest = beregn({ ...args, phi, net_korrektion: best });
      if (resBest.fejl === null)
        Object.assign(row, {
          korrektion_min: best,
          korrektion_max: conservative,
          t_armeret_mm_min: resBest.t_armeret_mm ?? null,
          t_armeret_mm_max: res.t_armeret_mm ?? null,
          t_armeret_eksakt_mm_min: resBest.t_armeret_eksakt_mm ?? null,
          phi_min: resBest.phi ?? null,
          reduktion_mm_min: res.reduktion_mm ?? null,
          reduktion_mm_max: resBest.reduktion_mm ?? null,
          reduktion_pct_min: res.reduktion_pct ?? null,
          reduktion_pct_max: resBest.reduktion_pct ?? null,
          placering_best: check_geonet_placement({
            lag_mode: args.lag_mode,
            total_mm: resBest.t_armeret_mm ?? null,
            geonet,
          }),
        });
    }
    rows.push(row);
  }
  return rows.sort(
    (a, b) =>
      Number(a.fejl !== null) - Number(b.fejl !== null) ||
      (a.t_armeret_mm ?? 9999) - (b.t_armeret_mm ?? 9999),
  );
}
function groupReduction(products: ProductRow[], thickness: number): number | null {
  const values = products.map((p) => p.reduktion_pct);
  if (values.length && values.every((v): v is number => v != null))
    return values.reduce((s, v) => s + v, 0) / values.length;
  const t = products[0].t_uarmeret_phi_kor_mm || products[0].t_uarmeret_mm;
  return t == null || t <= 0 ? null : (t - thickness) / t;
}
function groupExact(
  products: ProductRow[],
  key: 't_armeret_eksakt_mm' | 'reduktion_pct_eksakt',
  fallback: number | null,
): number | null {
  const values = products.map((p) => p[key]);
  let value = fallback;
  if (values.length && values.every((v): v is number => v != null))
    value = values.reduce((s, v) => s + v, 0) / values.length;
  return value === null ? null : pythonRound(value, key.endsWith('_mm') ? 0 : 4);
}
export interface ProductGroup {
  t_armeret_mm: number | null;
  t_armeret_eksakt_mm: number | null;
  reduktion_pct: number | null;
  reduktion_pct_eksakt: number | null;
  t_basis_arm_mm?: number | null;
  produkter: ProductRow[];
  placering_ok?: boolean;
  har_fejl: boolean;
  fejl_besked: string | null;
}
export function grupper_produkter(produkter: ProductRow[], tolerance_mm = 5): ProductGroup[] {
  const groups: ProductGroup[] = [],
    used = new Set<string>();
  const valid = produkter.filter((p) => p.fejl === null),
    failed = produkter.filter((p) => p.fejl !== null);
  for (const product of valid) {
    if (used.has(product.navn)) continue;
    const t = product.t_armeret_mm!;
    const ps =
      product.t_armeret_mm_min != null
        ? [product]
        : valid.filter(
            (p) =>
              !used.has(p.navn) &&
              p.t_armeret_mm_min == null &&
              Math.abs(p.t_armeret_mm! - t) <= tolerance_mm,
          );
    const representative = ps.reduce((s, p) => s + p.t_armeret_mm!, 0) / ps.length;
    const reduction = groupReduction(ps, representative);
    groups.push({
      t_armeret_mm: pythonRound(representative),
      t_armeret_eksakt_mm: groupExact(ps, 't_armeret_eksakt_mm', pythonRound(representative)),
      reduktion_pct: reduction === null ? null : pythonRound(reduction, 4),
      reduktion_pct_eksakt: groupExact(ps, 'reduktion_pct_eksakt', reduction),
      t_basis_arm_mm: ps[0].t_basis_arm_mm,
      produkter: ps,
      placering_ok: ps.every((p) => p.placering_ok ?? true),
      har_fejl: false,
      fejl_besked: null,
    });
    ps.forEach((p) => used.add(p.navn));
  }
  const errors = new Map<string, ProductRow[]>();
  for (const p of failed) {
    if (!errors.has(p.fejl!)) errors.set(p.fejl!, []);
    errors.get(p.fejl!)!.push(p);
  }
  for (const [message, ps] of errors)
    groups.push({
      t_armeret_mm: null,
      t_armeret_eksakt_mm: null,
      reduktion_pct: null,
      reduktion_pct_eksakt: null,
      produkter: ps,
      har_fejl: true,
      fejl_besked: message,
    });
  return groups;
}
