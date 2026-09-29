import { pythonNumber, pythonFixed } from './python-numbers.ts';
import type { Product, Layer, CalculationResult } from './types.ts';
export const PLACERING_VALG = ['laggraense', 'daeklag', 'laggraense_min'];
export function placement_requirements(geonet: Product | null = null) {
  const cover = pythonNumber(geonet?.min_daklag) ? Number(geonet!.min_daklag) * 10 : 200;
  const serie = geonet?.serie;
  const source =
    serie === 'GS-GRID' || serie === "E'GRID"
      ? "GS-GRID/E'GRID"
      : serie === 'Tensar'
        ? 'Tensar'
        : 'referencenet';
  const overlap = (field: 'overlap_eu_ge5_cm' | 'overlap_eu_lt5_cm', fallback: number) =>
    pythonNumber(geonet?.[field]) ? Number(geonet![field]) * 10 : fallback;
  return {
    min_top_cover_mm: Math.max(200, cover),
    general_top_cover_mm: 200,
    product_cover_mm: cover,
    min_spacing_mm: 200,
    max_spacing_mm: source === "GS-GRID/E'GRID" ? 500 : 400,
    overlap_ge5_mm: overlap('overlap_eu_ge5_cm', 300),
    overlap_lt5_mm: overlap('overlap_eu_lt5_cm', 400),
    source,
  };
}
export type Requirements = ReturnType<typeof placement_requirements>;
export const overlap_krav_mm = (krav: Requirements, eu: number | null): [number, string] =>
  eu === null || eu < 5 ? [krav.overlap_lt5_mm, 'Eᵤ < 5 MPa'] : [krav.overlap_ge5_mm, 'Eᵤ ≥ 5 MPa'];
export interface PlacementInput {
  lag_mode: string;
  total_mm: number | null;
  geonet?: Product | null;
  sub_lag?: Layer[] | null;
  placering?: string;
}
export interface Placement extends Requirements {
  placering_ok: boolean;
  geonet_placeringer_mm_fra_top: number[];
  geonet_y_fracs: number[];
  topdaeklag_mm: number | null;
  afstande_mellem_geonet_mm: number[];
  placeringsadvarsler: string[];
  t_min_placering_mm: number | null;
  t_dimensionerende_mm: number | null;
  placeringsbasis: string | null;
}
export function check_geonet_placement({
  lag_mode,
  total_mm,
  geonet = null,
  sub_lag = null,
  placering = 'laggraense',
}: PlacementInput): Placement {
  const krav = placement_requirements(geonet),
    warnings: string[] = [],
    total = total_mm || 0;
  if (total <= 0 || !['1_lag', '2_lag'].includes(lag_mode))
    return {
      ...krav,
      placering_ok: true,
      geonet_placeringer_mm_fra_top: [],
      geonet_y_fracs: [],
      topdaeklag_mm: null,
      afstande_mellem_geonet_mm: [],
      placeringsadvarsler: [],
      t_min_placering_mm: null,
      t_dimensionerende_mm: total_mm,
      placeringsbasis: null,
    };
  const min = krav.min_top_cover_mm,
    minSpacing = krav.min_spacing_mm,
    maxSpacing = krav.max_spacing_mm;
  const minText = `Mindste dæklag for dette net er ${pythonFixed(min)} mm.`;
  let positions: number[], distances: number[], top: number, basis: string;
  if (lag_mode === '1_lag') {
    positions = [total];
    distances = [];
    top = total;
    basis = 'underbund';
    if (top < min)
      warnings.push(`Geonettet har kun ${pythonFixed(top)} mm dæklag over sig. ${minText}`);
  } else {
    const layers = (sub_lag || []).filter((l) => (l.tykkelse_mm || 0) > 0);
    top = Math.min(min, total);
    basis = 'minimumsdæklag';
    if (layers.length >= 2 && placering !== 'daeklag') {
      const boundary = layers[0].tykkelse_mm!;
      if (!(placering === 'laggraense_min' && boundary < min)) {
        top = boundary;
        basis = 'materialeskift';
      }
    }
    positions = [top, total];
    const spacing = total - top;
    distances = [spacing];
    if (top < min)
      warnings.push(
        `${minText} Øverste geonet ligger ${pythonFixed(top)} mm under oversiden — kravet er ikke overholdt. Nederste geonet ligger ${pythonFixed(total)} mm under oversiden — kravet er ${total >= min ? 'overholdt.' : 'ikke overholdt.'}`,
      );
    if (spacing < minSpacing)
      warnings.push(
        `Afstanden mellem geonetlagene er ${pythonFixed(spacing)} mm. Kravet er mindst ${pythonFixed(minSpacing)} mm.`,
      );
    if (spacing > maxSpacing)
      warnings.push(
        `Afstanden mellem geonetlagene er ${pythonFixed(spacing)} mm. Anbefalingen for bedst effekt er højst ${pythonFixed(maxSpacing)} mm for ${krav.source}.`,
      );
  }
  const minimum = lag_mode === '1_lag' ? min : min + minSpacing;
  return {
    ...krav,
    placering_ok: !warnings.length,
    geonet_placeringer_mm_fra_top: positions,
    geonet_y_fracs: positions.map((p) => Math.max(0, Math.min(1, p / total))),
    topdaeklag_mm: top,
    afstande_mellem_geonet_mm: distances,
    placeringsadvarsler: warnings,
    t_min_placering_mm: minimum,
    t_dimensionerende_mm: Math.max(total, minimum),
    placeringsbasis: basis,
  };
}
export function enrich_result_with_placement(
  result: CalculationResult,
  geonet: Product | null = null,
  sub_lag: Layer[] | null = null,
) {
  if (result.fejl || result.t_armeret_mm == null) return { ...result };
  return {
    ...result,
    ...check_geonet_placement({
      lag_mode: result.lag_mode ?? '',
      total_mm: result.t_armeret_mm,
      geonet,
      sub_lag,
    }),
  };
}
