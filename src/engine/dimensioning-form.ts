/** Legacy dimensioning widgets mapped to the existing calculation payload. */
import type { DataState } from './auto-edit.ts';
import { aktivt_beregningsgrundlag } from './auto-edit.ts';
import { cv_til_eu, PHI_BASIS } from './data.ts';
import {
  dimensioner,
  phi_fra_materialer,
  type DimensioningInput,
  type Material,
} from './dimensionering.ts';
import { pythonRound } from './python-numbers.ts';
import type { JsonValue } from './session-storage.ts';

export type FormValues = Record<string, JsonValue>;
export const MANUAL_MATERIAL = 'Manuel indtastning';
export function dimensioningValues(values: FormValues, data: DataState): FormValues {
  const result: FormValues = { ...values };
  const set = (key: string, value: JsonValue) => {
    if (result[key] == null) result[key] = value;
  };
  set('tilstand', 'Standard');
  for (const prefix of ['std', 'bd']) {
    set(`${prefix}_eu_mode`, 'Eᵤ — E-modul');
    set(`${prefix}_eu_slider`, 10);
    set(`${prefix}_cv_slider`, 60);
    set(`${prefix}_grundlag`, 'Belastningsklasse');
    set(`${prefix}_valgt_klasse`, 4);
    set(`${prefix}_valgt_tklasse`, 'T4');
  }
  set('bd_antal_lag', 2);
  set('bd_phi_override', false);
  for (let i = 0; i < 3; i++) {
    set(`bd_mat_${i}`, ['Stabilgrus SGII 0-32', 'Bundsikringssand', data.materialer[0].navn][i]);
    set(`bd_t_${i}`, [300, 400, 200][i]);
    set(`bd_phi_m_${i}`, PHI_BASIS);
    set(`bd_korn_m_${i}`, 32);
    set(`bd_lt_m_${i}`, 'Bærelag');
    if (!data.materialer.some((m) => m.navn === result[`bd_mat_${i}`]))
      result[`bd_mat_${i}`] = MANUAL_MATERIAL;
    result[`bd_t_${i}`] = Math.max(200, Number(result[`bd_t_${i}`]));
  }
  return result;
}
export function dimensioningInput(values: FormValues, data: DataState): DimensioningInput {
  const w = dimensioningValues(values, data);
  const standard = w.tilstand === 'Standard',
    prefix = standard ? 'std' : 'bd';
  const materials: Material[] = [];
  if (!standard)
    for (let i = 0; i < Number(w.bd_antal_lag); i++) {
      const source = data.materialer.find((m) => m.navn === w[`bd_mat_${i}`]);
      materials.push({
        navn: String(w[`bd_mat_${i}`]),
        phi: source?.phi ?? Number(w[`bd_phi_m_${i}`]),
        max_korn: source ? source.max_korn : Number(w[`bd_korn_m_${i}`]),
        lagtype: source?.lagtype ?? String(w[`bd_lt_m_${i}`]),
        tykkelse_mm: Number(w[`bd_t_${i}`]),
        pct: null,
        krav_maskestoerrelse_mm: source?.krav_maskestoerrelse_mm ?? null,
      });
    }
  return {
    tilstand: standard ? 'Standard' : 'Brugerdefineret',
    eu: String(w[`${prefix}_eu_mode`]).startsWith('Cv')
      ? cv_til_eu(Number(w[`${prefix}_cv_slider`]))!
      : Number(w[`${prefix}_eu_slider`]),
    grundlag:
      w[`${prefix}_grundlag`] === 'Trafikklasse'
        ? { type: 'trafikklasse', t_klasse: String(w[`${prefix}_valgt_tklasse`]) }
        : { type: 'belastningsklasse', klasse: Number(w[`${prefix}_valgt_klasse`]) },
    geonet_navn: w[`${prefix}_geonet`] == null ? undefined : String(w[`${prefix}_geonet`]),
    materialer: materials,
    phi_manuel: w.bd_phi_override
      ? Number(w.bd_phi_man ?? pythonRound(phi_fra_materialer(materials), 1))
      : null,
    ...aktivt_beregningsgrundlag(data),
  };
}
export function calculateForm(values: FormValues, data: DataState) {
  return dimensioner(dimensioningInput(values, data));
}
export function resetDimensioning(values: FormValues): FormValues {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key]) => !['std_', 'bd_', 'opbygning_geonet_valg'].some((prefix) => key.startsWith(prefix)),
    ),
  );
}
