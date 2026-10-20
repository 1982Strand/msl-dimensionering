export interface Layer {
  navn?: string;
  andel?: number;
  phi?: number | null;
  lagtype?: string | null;
  tykkelse_mm?: number;
  [key: string]: unknown;
}
export interface DistributedLayer extends Layer {
  navn: string;
  tykkelse_mm: number;
}
export interface LayerSpec {
  lag: Layer[];
  fordeling?: string | null;
  min_mm?: number | null;
  oeverst_ref_mm?: number | null;
  restlag?: string | null;
  restlag_graense_mm?: number | null;
  vd_minimum_mm?: Record<string, number> | null;
  phi_regel?: string | null;
  kraev_bundsikring?: boolean;
}
export interface Rounding {
  trin_mm: number;
  reduktion_eksakt: boolean;
  vis_eksakt: boolean;
  phi_afrunding: string;
  t_min_mm?: number;
  lagopbygning?: LayerSpec;
}
export type BasisTable = Record<string, Record<string, Record<string, number | null>>>;
export interface Product {
  korrektion?: number;
  klasser?: number[];
  max_korn?: number | null;
  type?: string;
  maskestoerrelse_mm?: number | null;
  korrektion_interval?: number[] | null;
  navn: string;
  serie?: string;
  min_daklag?: number | boolean | null;
  overlap_eu_ge5_cm?: number | boolean | null;
  overlap_eu_lt5_cm?: number | boolean | null;
  [key: string]: unknown;
}
export interface CalculationInput {
  eu: number;
  eo: number;
  phi: number;
  net_korrektion: number;
  lag_mode: string;
  t_basis_table?: BasisTable | null;
  skala?: number;
  afrunding?: Partial<Rounding> | null;
}
export interface CalculationResult {
  fejl: string | null;
  eu?: number;
  eo?: number;
  phi?: number;
  phi_uarmeret?: number;
  phi_eksakt?: number;
  phi_uarmeret_eksakt?: number;
  phi_afrunding?: string | null;
  phi_indtastet?: number;
  phi_regel?: string | null;
  lag_mode?: string;
  net_korrektion?: number;
  skala?: number;
  eu_lower?: number;
  eu_upper?: number;
  t_low_arm_cm?: number;
  t_high_arm_cm?: number;
  t_low_uarm_cm?: number | null;
  t_high_uarm_cm?: number | null;
  t_basis_arm_cm?: number;
  t_basis_arm_mm?: number;
  t_basis_uarm_cm?: number | null;
  t_basis_uarm_mm?: number | null;
  phi_korrektion?: number;
  phi_korrektion_uarmeret?: number;
  samlet_faktor?: number;
  t_armeret_mm?: number | null;
  t_uarmeret_mm?: number | null;
  t_uarmeret_phi_kor_mm?: number | null;
  reduktion_mm?: number | null;
  reduktion_pct?: number | null;
  uarmeret_mangler?: boolean;
  uarmeret_fejl?: string | null;
  t_armeret_eksakt_mm?: number | null;
  t_uarmeret_eksakt_mm?: number | null;
  t_uarmeret_phi_kor_eksakt_mm?: number | null;
  reduktion_mm_eksakt?: number | null;
  reduktion_pct_eksakt?: number | null;
  afrunding_trin_mm?: number;
  t_min_mm?: number | null;
  t_armeret_til_minimum?: boolean;
  t_uarmeret_til_minimum?: boolean;
  t_uarmeret_phi_kor_til_minimum?: boolean;
  t_armeret_til_lagminimum?: boolean;
  t_uarmeret_phi_kor_til_lagminimum?: boolean;
  t_armeret_vd_minimum_ikke_opfyldt?: boolean;
  t_uarmeret_phi_kor_vd_minimum_ikke_opfyldt?: boolean;
  t_armeret_lagtillaeg_lag?: {
    foer: Pick<DistributedLayer, 'navn' | 'tykkelse_mm'>[];
    efter: Pick<DistributedLayer, 'navn' | 'tykkelse_mm'>[];
  };
}
