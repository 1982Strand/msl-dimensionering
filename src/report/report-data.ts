/** Rapportdata fra core/rapport.py ved a330cfd; ingen genberegning eller billeder.
 * app.py's _standard_til_rapport er allerede porteret i engine/dimensionering.ts.
 */
import type { DimensioningResult } from '../engine/construction.ts';
import type { CalculationResult } from '../engine/types.ts';
import { PHI_BASIS } from '../engine/data.ts';
import { normaliser as afrunding, eksakt_navn, er_oprundet } from '../engine/afrunding.ts';
import { normaliser as enhed, laengde } from '../engine/enhed.ts';
import { pythonFixed } from '../engine/python-numbers.ts';
import { parseReportText, type FormattedText } from './text-format.ts';

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
export const SECTION_TITLER: Readonly<Record<SectionKey, string>> = {
  oplyste_forudsaetninger: 'Oplyste forudsætninger',
  generelle_forudsaetninger: 'Generelle dimensioneringsforudsætninger for MSL opbygning',
  krav_komprimering: 'Krav til komprimering',
  dim_sikkerhed: 'Dimensionering og sikkerhed',
  udfoerelse: 'Udførelse',
  kontrolplan: 'Kontrolplan',
  projekteringsansvar: 'Projekteringsansvar',
};

// Ordlyd, indrykninger og linjeskift fra originalen, også FUND-005/A-006.
// Standardteksterne tilpasses aldrig til beregningssagen.
export const STANDARD_TEKSTER: Readonly<Record<SectionKey, string>> = {
  oplyste_forudsaetninger:
    '   • Dimensionsgivende trafikbelastning: T6\n' +
    '   • Vingestyrke, Cv, skønnet i planum: > 100 kPa\n' +
    '   • Grundvandsspejl: ikke oplyst/ikke relevant\n' +
    '   • Bærelagsmaterialer:\n' +
    '           o Genbrugsstabil',
  generelle_forudsaetninger:
    'Dimensioneringen af MSL opbygningen (mekanisk stabiliseret bærelag) er ' +
    'baseret på resultaterne fra mere en 20 års feltforsøg udført i ' +
    'Skandinavien. Det ubundne bærelag fastholdes af et eller flere lag ' +
    'geonet, som låser og fastholder bærelaget hvormed trykspredningsvinklen ' +
    'forøges i lighed. I praksis betyder det, at bærelaget kan reduceres i ' +
    'forhold til den ikke-stabiliserede ubundne opbygning. Alternativt vil ' +
    'der kunne opnås en betydelig forøgelse af bæreevne for en MSL opbygning ' +
    'i forhold til en traditionel opbygning.\n\n' +
    'Differenssætninger vil i stort omfang blive udjævnet, ligesom den ' +
    'stabiliserede randzone for specielt flerlagsopbygninger vil blive ' +
    'mindre sårbar i forhold til sætninger. Selvom erfaringerne viser ' +
    'betydelige reduktioner i sætninger, så vil der kun sjældent kunne ' +
    'opnås en sætningsfri ombygning. Ligeledes bør der tages højde for evt. ' +
    'frostfølsomhed, selvom MSL-opbygningen vil udjævne eventuelle ' +
    'hævninger.\n\n' +
    'MSL-løsninger kan kombineres med letfyld, som dermed kan være med til ' +
    'at kompensere for eventuelle sætninger.\n\n' +
    'MSL-løsninger kan ligeledes håndtere og kompensere for bæreevnesvigt ' +
    'forårsaget af midlertidig kortvarig vandpåvirkning, eksempelvis i ' +
    'forbindelse med LAR-opbygninger.\n\n' +
    'For særligt sætningsgivende bundforhold vil det være en fordel at ' +
    'afvente med belægningsarbejde til sætningsforløbet har stabiliseret ' +
    'sig. Tidshorisonten er variabel, og kan vare op til et år.',
  krav_komprimering:
    'Det forudsættes, at der ved indbygning af de ubundne bærelag opnås og ' +
    'eftervises en komprimeringsgrad på middel 95 % og mindst 92 % målt ved ' +
    'Vibrationsforsøg.',
  dim_sikkerhed:
    'Dimensionering og kontrol af bæreevne kan være forbundet med en nogen ' +
    'måleusikkerhed.\n\n' +
    'Ved kontrol af bæreevnen for MSL opbygningen vil en eventuel negativ ' +
    'variation normalt være maksimalt 10 %.',
  udfoerelse:
    'MSL-opbygninger kan udføres hele året. I visse situationer kan det ' +
    'være en fordel at arbejdet tilrettelægges således, at det udføres i ' +
    'frostperioder, hvor fremkommeligheden i terrænet kan være mere ' +
    'gunstig.\n\n' +
    'Geonettenes formstabile struktur nødvendiggør at udlægningen sker på ' +
    'et relativt jævnt underlag. Eventuelt bevoksning skal som udgangspunkt ' +
    'fjernes. På meget sætningsgivende blød underbund kan rødder fra træer ' +
    'og buske med fordel blive stående, ligesom intakt tørv bør bevares. ' +
    'Det er dog vigtigt, at rødder og stubbe skæres helt ned, således at ' +
    'der maksimalt er en terrænforskel på +/- 5 cm.\n\n' +
    'Overlæg på geonet bør være minimum 0,4 m. Anlæg på udvendige skråninger ' +
    'bør normalt udføres med maksimalt anlæg 1,5.',
  kontrolplan:
    'Det anbefales at udføre supplerende geoteknisk sondering og indmåling ' +
    'af E-modul på planum, således at eventuelt behov for korrektion af ' +
    'opbygning kan foretages før indbygning.\n\n' +
    'Kontrol af bæreevne på oversiden af de indbyggede bærelag kan ske ved ' +
    'pladebelastningsforsøg suppleret med dynamisk minifaldlodsmåling.\n\n' +
    'Omfanget af kontrolplan vurderes på det enkelte projekt.',
  projekteringsansvar:
    'Såfremt der foreligger skriftligt aftale med præcisering af omfang og ' +
    'krav til konstruktionen samt honorar og ansvarsforpligtelse for ' +
    'projekteringen, kan ansvaret for dimensioneringen være omfattet af ' +
    'vores rådgiveransvarsforsikring.\n\n' +
    'Såfremt der ikke foreligger en skriftlige aftale omkring ansvarsforhold, ' +
    'og dersom dimensioneringen i tillæg er udarbejdet som en vederlagsfri ' +
    'service, fraskriver Byggros sig ansvaret for anvendelsen af ' +
    'beregninger, konstruktionsforslag og anden relateret rådgivning.',
};

export const STANDARD_MATERIALER_RAPPORT = ['Stabilgrus SG II', 'Bundsikring BL II'] as const;
export type BasisLineKey = 'eu' | 'grundlag' | 'eo_aekv' | 'yderomraade' | 'materialer' | 'phi';
export interface ReportChoices {
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
  overskrift: 'Grundlag for beregning';
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
}

// Python str.strip(): JS trim() fjerner også BOM og overser U+001C–001F/U+0085.
const strip = (s: string): string =>
  s.replace(
    /^[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/g,
    '',
  );

export function _format_dato_dk(iso_dato: string): string {
  const chars = [...iso_dato]; // Python måler og slicer Unicode-kodepunkter.
  if (!iso_dato || chars.length !== 10 || chars[4] !== '-' || chars[7] !== '-') return iso_dato;
  return `${chars.slice(8, 10).join('')}/${chars.slice(5, 7).join('')}/${chars.slice(0, 4).join('')}`;
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
export function _materiale_resume(materialer: readonly ReportMaterial[], unit = 'mm'): string {
  if (!materialer.length) return '—';
  return materialer
    .map((m, i) => {
      const dele = [`Lag ${i + 1}: ${m.navn ?? '?'}`];
      if (m.phi != null) dele.push(`φᵢ = ${grader(m.phi)}`);
      if (m.tykkelse_mm != null) dele.push(laengde(m.tykkelse_mm, unit));
      else if (m.pct != null) dele.push(`${pythonFixed(m.pct, 0)} %`);
      return dele.join(' · ');
    })
    .join('\n');
}

export function _yderomraade_tekst(dim: DimensioningResult, unit = 'mm'): string | null {
  if (dim.zone !== 'under' && dim.zone !== 'over') return null;
  const tal = (v: number, dec = 0) =>
    pythonFixed(v, dec, true).replaceAll(',', 'X').replace('.', ',').replaceAll('X', '.');
  const retning =
    dim.zone === 'over' ? 'over diagrammets øverste kurve' : 'under diagrammets laveste kurve';
  const yder = dim.yder ?? {};
  const afv = yder.afvigelse_pct;
  if (afv == null) {
    if (typeof dim.skala !== 'number') return null;
    return (
      `VejDims krav ligger ${tal(Math.abs(dim.skala - 1.0) * 100, 1)} % ${retning}. Den ` +
      'ustabiliserede tykkelse er VejDims, og reduktionen er aflæst på randkurven.'
    );
  }
  let tekst =
    `VejDims krav ligger ${tal(Number(afv), 1)} % ${retning}, ` +
    `${yder.inden_tolerance ? 'inden for' : 'uden for'} tolerancen på ${tal(Number(yder.tolerance_pct || 0), 1)} %. `;
  if (yder.handling === 'vejdim') {
    tekst +=
      `Den ustabiliserede tykkelse er sat til VejDims ${laengde(Number(yder.t_vejdim_mm || 0), unit)}, og ` +
      `reduktionen er aflæst på kurven Eₒ = ${tal(Number(yder.eo_rand || 0))} MPa`;
    tekst += yder.inden_tolerance ? '.' : ' og dermed ekstrapoleret.';
  } else if (yder.handling === 'laveste') {
    tekst +=
      `Der er regnet med diagrammets laveste kurve, Eₒ = ${tal(Number(yder.eo_rand || 0))} MPa, på ` +
      `${laengde(Number(yder.t_rand_mm || 0), unit)}.`;
  }
  return tekst;
}

export function grundlag_linjer(
  dim: DimensioningResult,
  valg: ReportChoices = {},
): [BasisLineKey, string, string][] {
  const unit = enhed(valg.enhed);
  const rows: [BasisLineKey, string, string][] = [
    ['eu', 'Underbundens E-modul (Eᵤ)', `${pythonFixed(dim.eu, 0)} MPa`],
  ];
  if (dim.grundlag_type === 'trafikklasse') {
    rows.push(['grundlag', 'Dimensioneringsgrundlag', `Trafikklasse ${dim.t_klasse} (VejDim)`]);
    if (typeof dim.eo_aekv === 'number')
      rows.push(['eo_aekv', 'Ækvivalent Eₒ (Eₒ,ækv)', `${pythonFixed(dim.eo_aekv, 0)} MPa`]);
    const yder = _yderomraade_tekst(dim, unit);
    if (yder) rows.push(['yderomraade', 'Uden for diagrammets område', yder]);
  } else rows.push(['grundlag', 'Belastningsklasse', String(dim.valgt_klasse)]);
  let materiale: string;
  if (dim.tilstand === 'Standard') {
    const navne = (valg.standard_materialer ?? STANDARD_MATERIALER_RAPPORT)
      .filter((n) => strip(n || ''))
      .map((n) => strip(n!));
    materiale = navne.length ? navne.join(' og ') : 'Designdiagrammernes referencemateriale';
  } else materiale = _materiale_resume(dim.materialer, unit);
  rows.push(['materialer', 'Materialeopbygning', materiale]);
  rows.push([
    'phi',
    'Vægtet friktionsvinkel (φᵥ)',
    grader(dim.phi ?? PHI_BASIS, afrunding(dim.afrunding).phi_afrunding === 'ingen' ? 1 : 0),
  ]);
  return rows;
}

export function formatér_dimensioneringsgrundlag(
  dim: DimensioningResult,
  valg: ReportChoices = {},
): [string, string][] {
  return grundlag_linjer(dim, valg)
    .filter(
      ([lid]) =>
        (valg.grundlag_linjer?.[lid] ?? true) &&
        (lid !== 'yderomraade' || (valg.vis_yderomraade ?? true)),
    )
    .map(([, etiket, vaerdi]) => [etiket, vaerdi]);
}

export function formatér_dimensioneringsresultat(
  dim: DimensioningResult,
  valg: ReportChoices = {},
): [string, string][] {
  const res1 = dim.res_1,
    res2 = dim.res_2;
  const unit = enhed(valg.enhed);
  const mm = (v: number | null | undefined) => (typeof v === 'number' ? laengde(v, unit) : '—');
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
  let uarm = '—';
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
  const rows: [string, string][] = [
    ['Valgt geonet', dim.geonet?.navn ?? '—'],
    ['Ustabiliseret referenceopbygning', uarm],
  ];
  if (valg.vis_indtastet ?? true) rows.push(['Samlet tykkelse af valgt opbygning', mm(indtastet)]);
  rows.push(
    ['Stabiliseret tykkelse — 1 lag', mmRes(res1, 't_armeret_mm')],
    ['Stabiliseret tykkelse — 2 lag', mmRes(res2, 't_armeret_mm')],
  );
  return rows;
}

/** Dataækvivalent til originalens fjernelse af den tomme Word-tabel/overskrift.
 * dim_grundlag forbliver [] i context, ligesom originalens render-kontekst.
 */
export function _fjern_tomt_grundlag(rows: ReportRow[]): ReportBasis | null {
  return rows.length ? { overskrift: 'Grundlag for beregning', rows } : null;
}

export function reportData(
  dim: DimensioningResult,
  metadata: ReportMetadata = {},
  valg: ReportChoices = {},
  tekster: EditedTexts = {},
): ReportData {
  const rows = (par: [string, string][]) => par.map(([label, vaerdi]) => ({ label, vaerdi }));
  const tekst = (key: SectionKey) => tekster[key] ?? STANDARD_TEKSTER[key];
  const context: ReportContext = {
    projekt: strip(metadata.projekt || ''),
    beskrivelse: strip(metadata.beskrivelse || ''),
    omfang: strip(metadata.omfang || ''),
    udfoeres_for: strip(metadata.udfoeres_for || ''),
    sagsbehandler: strip(metadata.sagsbehandler || ''),
    sagsbehandler_mail: strip(metadata.sagsbehandler_mail || ''),
    kontrol: strip(metadata.kontrol || ''),
    dato: _format_dato_dk(metadata.dato ?? ''),
    dim_grundlag: rows(formatér_dimensioneringsgrundlag(dim, valg)),
    dim_resultat: rows(formatér_dimensioneringsresultat(dim, valg)),
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
        context.sagsbehandler_mail,
        strip(metadata.sagsbehandler_telefon || ''),
      ].filter(Boolean),
      kontrollant: metadata.kontrollant_i_bunden
        ? [
            context.kontrol,
            strip(metadata.kontrol_telefon || ''),
            strip(metadata.kontrol_mail || ''),
          ].filter(Boolean)
        : null,
    },
    sections: { ...SECTION_TITLER },
    formattedTexts: Object.fromEntries(
      SECTION_KEYS.filter((key) => valg.medtag_afsnit?.[key] !== false).map((key) => [
        key,
        parseReportText(context[`tekst_${key}`]),
      ]),
    ),
    grundlag: _fjern_tomt_grundlag(context.dim_grundlag),
  };
}
