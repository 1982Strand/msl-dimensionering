import type { DimensioningResult } from '../engine/construction.ts';
import type { CalculationResult } from '../engine/types.ts';
import { PHI_BASIS } from '../engine/data.ts';
import { normaliser as afrunding, eksakt_navn, er_oprundet } from '../engine/afrunding.ts';
import { normaliser as enhed, laengde } from '../engine/enhed.ts';
import { pythonFixed } from '../engine/python-numbers.ts';
import { parseReportText, type FormattedText } from './text-format.ts';
import { formatPhone } from './phone-format.ts';
import {
  reportStrings,
  SECTION_TITLER,
  STANDARD_MATERIALER_RAPPORT,
  STANDARD_TEKSTER,
  type ReportLanguage,
  type ReportStrings,
} from './report-sprog.ts';

export { SECTION_TITLER, STANDARD_MATERIALER_RAPPORT, STANDARD_TEKSTER };

export const SECTION_KEYS = [
  'oplyste_forudsaetninger',
  'generelle_forudsaetninger',
  'krav_komprimering',
  'dim_sikkerhed',
  'udfoerelse',
  'kontrolplan',
  'projekteringsansvar',
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export type BasisLineKey = 'eu' | 'grundlag' | 'eo_aekv' | 'yderomraade' | 'materialer' | 'phi';
export type ResultLineKey = 'geonet' | 'uarmeret' | 'indtastet' | '1lag' | '2lag';
export type ReportLineKey = `basis_${BasisLineKey}` | `resultat_${ResultLineKey}`;
export interface ReportLineEdit {
  beregnet_tekst: string;
  beregnet_vaerdi: string;
  tekst: string;
  vaerdi: string;
}
export type ReportLineEdits = Partial<Record<ReportLineKey, ReportLineEdit>>;
export type CalculatedReportLine = [ReportLineKey, string, string];
/** Kun rettelser med samme beregnede tekst OG værdi kan anvendes. */
export function reconcileReportLines(lines: CalculatedReportLine[], edits: ReportLineEdits = {}) {
  const active: ReportLineEdits = {};
  const reset: { key: ReportLineKey; label: string }[] = [];
  for (const [key, edit] of Object.entries(edits) as [ReportLineKey, ReportLineEdit][]) {
    const current = lines.find(([id]) => id === key);
    if (current && current[1] === edit.beregnet_tekst && current[2] === edit.beregnet_vaerdi)
      active[key] = edit;
    else reset.push({ key, label: edit.beregnet_tekst });
  }
  return { active, reset };
}
function applyLineEdit(
  key: ReportLineKey,
  label: string,
  value: string,
  valg: ReportChoices,
): [string, string] {
  const edit = valg.linje_rettelser?.[key];
  return edit && edit.beregnet_tekst === label && edit.beregnet_vaerdi === value
    ? [edit.tekst, edit.vaerdi]
    : [label, value];
}
export interface ReportChoices {
  sprog?: ReportLanguage;
  linje_rettelser?: ReportLineEdits;
  resultat_linjer?: Partial<Record<ResultLineKey, boolean>>;
  /** B-046: fravalg er adskilt fra bevidst tom tekst. */
  medtag_afsnit?: Partial<Record<SectionKey, boolean>>;
  enhed?: string | null;
  grundlag_linjer?: Partial<Record<BasisLineKey, boolean>> | null;
  standard_materialer?: readonly (string | null)[] | null;
  vis_yderomraade?: boolean;
  vis_indtastet?: boolean;
}
export interface ReportMetadata {
  projekt?: string | null;
  beskrivelse?: string | null;
  omfang?: string | null;
  udfoeres_for?: string | null;
  sagsbehandler?: string | null;
  sagsbehandler_mail?: string | null;
  kontrol?: string | null;
  dato?: string;
  /** B-048: ekstra lag; originalens context bevarer sine felter og værdier. */
  sagsbehandler_initialer?: string | null;
  sagsbehandler_telefon?: string | null;
  kontrol_initialer?: string | null;
  kontrol_mail?: string | null;
  kontrol_telefon?: string | null;
  kontrollant_i_bunden?: boolean;
}
export type EditedTexts = Partial<Record<SectionKey, string | null>>;
export interface ReportRow {
  label: string;
  vaerdi: string;
}
export type ReportContext = Required<{
  [
    K in Exclude<
      keyof ReportMetadata,
      | 'sagsbehandler_initialer'
      | 'sagsbehandler_telefon'
      | 'kontrol_initialer'
      | 'kontrol_mail'
      | 'kontrol_telefon'
      | 'kontrollant_i_bunden'
    >
  ]: string;
}> &
  Record<`tekst_${SectionKey}`, string> & {
    dim_grundlag: ReportRow[];
    dim_resultat: ReportRow[];
  };
export interface ReportBasis {
  overskrift: string;
  rows: ReportRow[];
}
export interface ReportData {
  /** B-048: viste initialer med fallback og underskriftens ikke-tomme linjer. */
  medarbejdere: {
    udfoert_af: string;
    kontrol: string;
    sagsbehandler: string[];
    kontrollant: string[] | null;
  };
  context: ReportContext;
  sections: Record<SectionKey, string>;
  /** Kun medtagne tekster. Rå kontekststrenge bevares til referencekontrol. */
  formattedTexts: Partial<Record<SectionKey, FormattedText>>;
  /** R3 skal udelade både tabel og overskrift, når grundlag er null. */
  grundlag: ReportBasis | null;
  /** Faste etiketter til den konstante Typst-skabelon. */
  sprog: {
    projekt: string;
    beskrivelse: string;
    omfang: string;
    udfoeres_for: string;
    udfoert_af: string;
    kvalitetssikring: string;
    dimensioneringsgrundlag: string;
    forudsaetninger: string;
    generelle_forudsaetninger: string;
    dimensioneringsresultat: string;
    resultat_intro: string;
    by_dato_suffix: string;
    kolon: string;
    side_af_prefix: string;
    side_af_separator: string;
    typst_language: string;
  };
}

// Python str.strip(): JS trim() fjerner også BOM og overser U+001C–001F/U+0085.
const strip = (s: string): string =>
  s.replace(
    /^[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/g,
    '',
  );

export function _format_dato_dk(iso_dato: string, t: ReportStrings = reportStrings()): string {
  return t.dato(iso_dato);
}

export function upper_geonet_frac_for_sub_lag(
  sub_lag: readonly { tykkelse_mm?: number | null }[] | null,
): number {
  const sl = (sub_lag ?? []).filter((l) => (l.tykkelse_mm || 0) > 0);
  if (sl.length < 2) return 0.5;
  const total = sl.reduce((sum, l) => sum + l.tykkelse_mm!, 0);
  if (total <= 0) return 0.5;
  return Math.max(0.05, Math.min(0.95, sl[0].tykkelse_mm! / total));
}

type ReportMaterial = {
  navn?: string;
  phi?: number | null;
  tykkelse_mm?: number | null;
  pct?: number | null;
};
const grader = (v: number, decimaler = 1) => `${pythonFixed(v, decimaler)}°`.replace('.', ',');
export function _materiale_resume(
  materialer: readonly ReportMaterial[],
  unit = 'mm',
  t: ReportStrings = reportStrings(),
): string {
  if (!materialer.length) return t.tom;
  return materialer
    .map((m, i) => {
      const dele = [t.materiale_lag(i + 1, m.navn ?? '?')];
      if (m.phi != null) dele.push(t.materiale_phi(grader(m.phi)));
      if (m.tykkelse_mm != null) dele.push(laengde(m.tykkelse_mm, unit));
      else if (m.pct != null) dele.push(`${pythonFixed(m.pct, 0)} %`);
      return dele.join(t.materiale_separator);
    })
    .join('\n');
}

export function _yderomraade_tekst(
  dim: DimensioningResult,
  unit = 'mm',
  t: ReportStrings = reportStrings(),
): string | null {
  if (dim.zone !== 'under' && dim.zone !== 'over') return null;
  const tal = (v: number, dec = 0) =>
    pythonFixed(v, dec, true).replaceAll(',', 'X').replace('.', ',').replaceAll('X', '.');
  const retning = dim.zone === 'over' ? t.yderomraade.over : t.yderomraade.under;
  const yder = dim.yder ?? {};
  const afv = yder.afvigelse_pct;
  if (afv == null) {
    if (typeof dim.skala !== 'number') return null;
    return t.yderomraade.uden_afvigelse(tal(Math.abs(dim.skala - 1.0) * 100, 1), retning);
  }
  let tekst = t.yderomraade.med_afvigelse(
    tal(Number(afv), 1),
    retning,
    tal(Number(yder.tolerance_pct || 0), 1),
    yder.inden_tolerance ? t.yderomraade.inden : t.yderomraade.uden,
  );
  if (yder.handling === 'vejdim') {
    tekst += t.yderomraade.vejdim(
      laengde(Number(yder.t_vejdim_mm || 0), unit),
      tal(Number(yder.eo_rand || 0)),
    );
    tekst += yder.inden_tolerance ? '.' : t.yderomraade.ekstrapoleret;
  } else if (yder.handling === 'laveste') {
    tekst += t.yderomraade.rand(
      tal(Number(yder.eo_rand || 0)),
      laengde(Number(yder.t_rand_mm || 0), unit),
    );
  }
  return tekst;
}

export function grundlag_linjer(
  dim: DimensioningResult,
  valg: ReportChoices = {},
  t: ReportStrings = reportStrings(valg.sprog),
): [BasisLineKey, string, string][] {
  const unit = enhed(valg.enhed);
  const rows: [BasisLineKey, string, string][] = [
    ['eu', t.grundlag.eu, `${pythonFixed(dim.eu, 0)} MPa`],
  ];
  if (dim.grundlag_type === 'trafikklasse') {
    rows.push([
      'grundlag',
      t.grundlag.trafikklasse_label,
      t.grundlag.trafikklasse(dim.t_klasse as string),
    ]);
    if (typeof dim.eo_aekv === 'number')
      rows.push(['eo_aekv', t.grundlag.eo_aekv, `${pythonFixed(dim.eo_aekv, 0)} MPa`]);
    const yder = _yderomraade_tekst(dim, unit, t);
    if (yder) rows.push(['yderomraade', t.grundlag.yderomraade, yder]);
  } else rows.push(['grundlag', t.grundlag.belastningsklasse, String(dim.valgt_klasse)]);
  let materiale: string;
  if (dim.tilstand === 'Standard') {
    const navne = (valg.standard_materialer ?? t.standard_materialer)
      .filter((n) => strip(n || ''))
      .map((n) => strip(n!));
    materiale = navne.length ? navne.join(t.og) : t.grundlag.standardmaterialer;
  } else materiale = _materiale_resume(dim.materialer, unit, t);
  rows.push(['materialer', t.grundlag.materialeopbygning, materiale]);
  rows.push([
    'phi',
    t.grundlag.phi,
    grader(dim.phi ?? PHI_BASIS, afrunding(dim.afrunding).phi_afrunding === 'ingen' ? 1 : 0),
  ]);
  return rows;
}

export function formatér_dimensioneringsgrundlag(
  dim: DimensioningResult,
  valg: ReportChoices = {},
  t: ReportStrings = reportStrings(valg.sprog),
): [string, string][] {
  return grundlag_linjer(dim, valg, t)
    .filter(
      ([lid]) =>
        (valg.grundlag_linjer?.[lid] ?? true) &&
        (lid !== 'yderomraade' || (valg.vis_yderomraade ?? true)),
    )
    .map(([key, etiket, vaerdi]) => applyLineEdit(`basis_${key}`, etiket, vaerdi, valg));
}

export function resultat_linjer(
  dim: DimensioningResult,
  valg: ReportChoices = {},
  t: ReportStrings = reportStrings(valg.sprog),
): [ResultLineKey, string, string][] {
  const res1 = dim.res_1,
    res2 = dim.res_2;
  const unit = enhed(valg.enhed);
  const mm = (v: number | null | undefined) => (typeof v === 'number' ? laengde(v, unit) : t.tom);
  type Felt = 't_armeret_mm' | 't_uarmeret_phi_kor_mm' | 't_uarmeret_mm';
  type Lengths = Pick<
    CalculationResult,
    'fejl' | Felt | 't_armeret_eksakt_mm' | 't_uarmeret_phi_kor_eksakt_mm' | 't_uarmeret_eksakt_mm'
  >;
  const mmRes = (res: Lengths, felt: Felt) => {
    const v = res[felt];
    let tekst = mm(v);
    if (afrunding(dim.afrunding).vis_eksakt && typeof v === 'number') {
      const exact =
        res[
          eksakt_navn(felt) as
            't_armeret_eksakt_mm' | 't_uarmeret_phi_kor_eksakt_mm' | 't_uarmeret_eksakt_mm'
        ];
      if (er_oprundet(v, exact ?? null)) tekst += ` (${mm(exact)})`;
    }
    return tekst;
  };
  let uarm = t.tom;
  const candidates: [Lengths, Felt][] = [
    [res1, 't_uarmeret_phi_kor_mm'],
    [res2, 't_uarmeret_phi_kor_mm'],
    [res1, 't_uarmeret_mm'],
    [res2, 't_uarmeret_mm'],
  ];
  for (const [res, felt] of candidates) {
    if (res[felt]) {
      uarm = mmRes(res, felt);
      break;
    }
  }
  const indtastet = dim.materialer.reduce((sum, m) => sum + (m.tykkelse_mm || 0), 0) || null;
  const rows: [ResultLineKey, string, string][] = [
    ['geonet', t.resultat.geonet, dim.geonet?.navn ?? t.tom],
    ['uarmeret', t.resultat.uarmeret, uarm],
    ['indtastet', t.resultat.indtastet, mm(indtastet)],
  ];
  rows.push(
    ['1lag', t.resultat.lag1, mmRes(res1, 't_armeret_mm')],
    ['2lag', t.resultat.lag2, mmRes(res2, 't_armeret_mm')],
  );
  return rows;
}

export function formatér_dimensioneringsresultat(
  dim: DimensioningResult,
  valg: ReportChoices = {},
  t: ReportStrings = reportStrings(valg.sprog),
): [string, string][] {
  return resultat_linjer(dim, valg, t)
    .filter(
      ([key]) =>
        valg.resultat_linjer?.[key] ?? (key === 'indtastet' ? (valg.vis_indtastet ?? true) : true),
    )
    .map(([key, label, value]) => applyLineEdit(`resultat_${key}`, label, value, valg));
}

/** Dataækvivalent til originalens fjernelse af den tomme Word-tabel/overskrift.
 * dim_grundlag forbliver [] i context, ligesom originalens render-kontekst.
 */
export function _fjern_tomt_grundlag(
  rows: ReportRow[],
  t: ReportStrings = reportStrings(),
): ReportBasis | null {
  return rows.length ? { overskrift: t.grundlag_for_beregning, rows } : null;
}

export function reportData(
  dim: DimensioningResult,
  metadata: ReportMetadata = {},
  valg: ReportChoices = {},
  tekster: EditedTexts = {},
): ReportData {
  const t = reportStrings(valg.sprog);
  return reportDataWithStrings(dim, metadata, valg, tekster, t);
}

/** Bygger data med en eksplicit tabel, så samme model kan bruges til tekstkontrol og nye sprog. */
export function reportDataWithStrings(
  dim: DimensioningResult,
  metadata: ReportMetadata = {},
  valg: ReportChoices = {},
  tekster: EditedTexts = {},
  t: ReportStrings = reportStrings(valg.sprog),
): ReportData {
  const rows = (par: [string, string][]) => par.map(([label, vaerdi]) => ({ label, vaerdi }));
  const tekst = (key: SectionKey) => tekster[key] ?? t.standard_tekster[key];
  const context: ReportContext = {
    projekt: strip(metadata.projekt || ''),
    beskrivelse: strip(metadata.beskrivelse || ''),
    omfang: strip(metadata.omfang || ''),
    udfoeres_for: strip(metadata.udfoeres_for || ''),
    sagsbehandler: strip(metadata.sagsbehandler || ''),
    sagsbehandler_mail: strip(metadata.sagsbehandler_mail || ''),
    kontrol: strip(metadata.kontrol || ''),
    dato: _format_dato_dk(metadata.dato ?? '', t),
    dim_grundlag: rows(formatér_dimensioneringsgrundlag(dim, valg, t)),
    dim_resultat: rows(formatér_dimensioneringsresultat(dim, valg, t)),
    tekst_oplyste_forudsaetninger: tekst('oplyste_forudsaetninger'),
    tekst_generelle_forudsaetninger: tekst('generelle_forudsaetninger'),
    tekst_krav_komprimering: tekst('krav_komprimering'),
    tekst_dim_sikkerhed: tekst('dim_sikkerhed'),
    tekst_udfoerelse: tekst('udfoerelse'),
    tekst_kontrolplan: tekst('kontrolplan'),
    tekst_projekteringsansvar: tekst('projekteringsansvar'),
  };
  return {
    context,
    medarbejdere: {
      udfoert_af: strip(metadata.sagsbehandler_initialer || '') || context.sagsbehandler,
      kontrol: strip(metadata.kontrol_initialer || '') || context.kontrol,
      sagsbehandler: [
        context.sagsbehandler,
        formatPhone(metadata.sagsbehandler_telefon || ''),
        context.sagsbehandler_mail,
      ].filter(Boolean),
      kontrollant: metadata.kontrollant_i_bunden
        ? [
            context.kontrol,
            formatPhone(metadata.kontrol_telefon || ''),
            strip(metadata.kontrol_mail || ''),
          ].filter(Boolean)
        : null,
    },
    sections: { ...t.section_titles },
    formattedTexts: Object.fromEntries(
      SECTION_KEYS.filter((key) => valg.medtag_afsnit?.[key] !== false).map((key) => [
        key,
        parseReportText(context[`tekst_${key}`]),
      ]),
    ),
    grundlag: _fjern_tomt_grundlag(context.dim_grundlag, t),
    sprog: {
      projekt: t.projekt,
      beskrivelse: t.beskrivelse,
      omfang: t.omfang,
      udfoeres_for: t.udfoeres_for,
      udfoert_af: t.udfoert_af,
      kvalitetssikring: t.kvalitetssikring,
      dimensioneringsgrundlag: t.dimensioneringsgrundlag,
      forudsaetninger: t.forudsaetninger,
      generelle_forudsaetninger: t.section_titles.generelle_forudsaetninger + ':',
      dimensioneringsresultat: t.dimensioneringsresultat,
      resultat_intro: t.resultat_intro,
      by_dato_suffix: t.by_dato_suffix,
      kolon: t.kolon,
      side_af_prefix: t.side_af_prefix,
      side_af_separator: t.side_af_separator,
      typst_language: t.typst_language,
    },
  };
}
