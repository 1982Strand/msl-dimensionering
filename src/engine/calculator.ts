import {
  T_BASIS_TABLE,
  EU_RAEKKER,
  EO_KOLONNER,
  PHI_BASIS,
  K_PHI,
  EO_MIN,
  EO_MAX,
} from './data.ts';
import { afrund_phi, anvend_paa_resultat, normaliser } from './afrunding.ts';
import { fordel_soejle, vaegtet_phi } from './lagfordeling.ts';
import { pythonFixed, pythonRound } from './python-numbers.ts';
import type { BasisTable, CalculationInput, CalculationResult, DistributedLayer } from './types.ts';
const mpa = (v: number) => pythonFixed(v, 0, true).replaceAll(',', '.');
const round = (v: number | null, n: number) => (v === null ? null : pythonRound(v, n));
export const aktive_eu_raekker = (table?: BasisTable | null): number[] =>
  table == null
    ? EU_RAEKKER
    : Object.keys(table)
        .map(Number)
        .sort((a, b) => a - b);
export function slaa_op(
  eu: number,
  eo: number,
  mode: string,
  table?: BasisTable | null,
): number | null {
  return (table && Object.keys(table).length ? table : T_BASIS_TABLE)[eu]?.[eo]?.[mode] ?? null;
}
export function slaa_op_interp(
  eu: number,
  eo: number,
  mode: string,
  table?: BasisTable | null,
): number | null {
  const row = (table && Object.keys(table).length ? table : T_BASIS_TABLE)[eu];
  if (!row) return null;
  if (EO_KOLONNER.includes(eo)) return row[eo]?.[mode] ?? null;
  const cols = [...EO_KOLONNER].sort((a, b) => a - b);
  if (eo < cols[0] || eo > cols.at(-1)!) return null;
  const low = Math.max(...cols.filter((k) => k <= eo)),
    high = Math.min(...cols.filter((k) => k >= eo));
  const a = row[low]?.[mode],
    b = row[high]?.[mode];
  if (a == null || b == null) return null;
  return high === low ? a : a + ((eo - low) / (high - low)) * (b - a);
}

export function beregn(input: CalculationInput): CalculationResult {
  let result = beregn_opslag(input);
  const spec = input.afrunding?.lagopbygning;
  if (result.fejl !== null || !spec || !['laveste', 'soejle'].includes(spec.phi_regel ?? ''))
    return result;
  const phiInd = input.phi,
    step = normaliser(input.afrunding).trin_mm;
  const nextPhi = (layers: DistributedLayer[]) => {
    const v = vaegtet_phi(layers);
    return v === null ? phiInd : spec.phi_regel === 'laveste' ? Math.min(phiInd, v) : v;
  };
  let phiU = phiInd,
    phiA = phiInd,
    stable = false;
  const seen: [number, number][] = [];
  for (let i = 0; i < 12; i++) {
    const tu = result.t_uarmeret_phi_kor_mm ?? null,
      ta = result.t_armeret_mm ?? null;
    const nu = tu ? nextPhi(fordel_soejle(spec, tu, step)) : phiInd;
    const na = nextPhi(fordel_soejle(spec, ta, step, tu));
    if (Math.abs(nu - phiU) < 1e-9 && Math.abs(na - phiA) < 1e-9) {
      stable = true;
      break;
    }
    seen.push([phiU, phiA]);
    phiU = nu;
    phiA = na;
    result = beregn_opslag({ ...input, phi: phiA }, phiU);
    if (result.fejl !== null) return result;
  }
  if (!stable) {
    seen.push([phiU, phiA]);
    phiU = Math.min(...seen.map((p) => p[0]));
    phiA = Math.min(...seen.map((p) => p[1]));
    result = beregn_opslag({ ...input, phi: phiA }, phiU);
  }
  result.phi_indtastet = phiInd;
  result.phi_regel = spec.phi_regel;
  return result;
}

function beregn_opslag(input: CalculationInput, phiUarmeret = input.phi): CalculationResult {
  const {
    eu,
    eo,
    net_korrektion,
    lag_mode,
    t_basis_table = null,
    skala = 1,
    afrunding = null,
  } = input;
  const method = afrunding !== null ? normaliser(afrunding).phi_afrunding : null;
  const phi = afrund_phi(input.phi, method),
    phiU = afrund_phi(phiUarmeret, method);
  if (!(EO_MIN <= eo && eo <= EO_MAX))
    return {
      fejl: `Eₒ=${mpa(eo)} MPa er uden for gyldigt interval (${mpa(EO_MIN)}–${mpa(EO_MAX)} MPa).`,
    };
  const kor = K_PHI * (phi - PHI_BASIS),
    korU = K_PHI * (phiU - PHI_BASIS);
  const rows = aktive_eu_raekker(t_basis_table);
  if (!rows.includes(eu)) {
    if (!rows.length)
      return {
        fejl: 'Diagramtabellen indeholder ingen Eᵤ-rækker. Nulstil diagramdata til standard under Designdiagrammer.',
      };
    if (eu < rows[0] || eu > rows.at(-1)!)
      return {
        fejl: `Eᵤ=${mpa(eu)} MPa er uden for tabelområdet (${mpa(rows[0])}–${mpa(rows.at(-1)!)} MPa)`,
      };
    return {
      fejl: `Eᵤ=${mpa(eu)} MPa findes ikke som række i den aktive diagramtabel. Rækken kan være fjernet under Designdiagrammer — gendan den, eller nulstil diagramdata til standard.`,
    };
  }
  const arm = slaa_op_interp(eu, eo, lag_mode, t_basis_table);
  if (arm === null)
    return {
      fejl: `Kombinationen Eᵤ=${mpa(eu)} MPa / Eₒ=${mpa(eo)} MPa / ${lag_mode === '1_lag' ? '1 lag geonet' : '2 lag geonet'} er uden for diagrammets gyldighedsområde ("—" i opslagstabellen). Et lavere Eᵤ eller færre lag vil normalt ligge inden for gyldighedsområdet.`,
    };
  const uarm = slaa_op_interp(eu, eo, 'uarmeret', t_basis_table),
    missing = uarm === null;
  const basisArm = arm * skala,
    basisU = uarm === null ? null : uarm * skala;
  const basisArmMM = basisArm * 10,
    basisUMM = basisU === null ? null : basisU * 10;
  const factor = 1 + kor + net_korrektion,
    tArm = basisArmMM * factor,
    tU = basisUMM === null ? null : basisUMM * (1 + korU);
  const reduction = tU === null ? null : tU - tArm,
    percent = reduction !== null && tU! > 0 ? reduction / tU! : null;
  let result: CalculationResult = {
    eu,
    eo,
    phi,
    phi_uarmeret: phiU,
    phi_eksakt: input.phi,
    phi_uarmeret_eksakt: phiUarmeret,
    phi_afrunding: method,
    lag_mode,
    net_korrektion,
    eu_lower: eu,
    eu_upper: eu,
    t_low_arm_cm: arm,
    t_high_arm_cm: arm,
    t_low_uarm_cm: uarm,
    t_high_uarm_cm: uarm,
    t_basis_arm_cm: pythonRound(basisArm, 1),
    t_basis_arm_mm: pythonRound(basisArmMM),
    t_basis_uarm_cm: round(basisU, 1),
    t_basis_uarm_mm: round(basisUMM, 0),
    phi_korrektion: pythonRound(kor, 4),
    phi_korrektion_uarmeret: pythonRound(korU, 4),
    samlet_faktor: pythonRound(factor, 4),
    skala,
    t_armeret_mm: pythonRound(tArm),
    t_uarmeret_mm: round(basisUMM, 0),
    t_uarmeret_phi_kor_mm: round(tU, 0),
    reduktion_mm: round(reduction, 0),
    reduktion_pct: round(percent, 4),
    uarmeret_mangler: missing,
    uarmeret_fejl: missing
      ? `Der er ikke defineret nogen uarmeret bærelagstykkelse for Eᵤ=${mpa(eu)} MPa / Eₒ=${mpa(eo)} MPa.`
      : null,
    fejl: null,
  };
  if (afrunding !== null) result = anvend_paa_resultat(result, afrunding);
  return result;
}
