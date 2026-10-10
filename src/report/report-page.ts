import type { DimensioningResult } from '../engine/construction.ts';
import type { CalculationResult } from '../engine/types.ts';
import { laengde } from '../engine/enhed.ts';
import { pythonFixed } from '../engine/python-numbers.ts';
import {
  grundlag_linjer,
  resultat_linjer,
  reconcileReportLines,
  type ReportLineKey,
  type ReportLineEdit,
  type CalculatedReportLine,
  SECTION_KEYS,
  SECTION_TITLER,
  STANDARD_TEKSTER,
  STANDARD_MATERIALER_RAPPORT,
  type ReportChoices,
  type ReportMetadata,
} from './report-data.ts';
import type { ReportFigureChoices } from './report-figures.ts';
import { employeeErrors, type Employee } from './company-profile.ts';

export const REPORT_TITLE = 'Rapport';
/** Originalens undertekst; Word-eksporten udgår (B-026), så teksten er ændret efter B-043. */
export const REPORT_INTRO_ORIGINAL =
  'Dokumentation af beregningen til projektmateriale. Rapporten samler forudsætninger, resultat og udførelseskrav i ét dokument i Word og PDF. Standardteksterne kan redigeres pr. rapport.';
export const REPORT_INTRO =
  'Dokumentation af beregningen til projektmateriale. Rapporten samler forudsætninger, resultat og udførelseskrav i ét PDF-dokument. Standardteksterne kan redigeres pr. rapport.';
export const REPORT_NO_CALCULATION =
  'Der skal først foretages en dimensionering med et valgt geonet, før rapporten kan genereres.\n\nDimensioneringen udføres under **Dimensionering**, i Standard eller Brugerdefineret. Rapporten bygger på den seneste dimensionering.';
export const REPORT_FORMAT_HELP =
  'Formatering: `**fed**`, `*kursiv*` og • eller - efterfulgt af mellemrum for punkter. Indryk punkter med Indrykning for underpunkter. Tomme linjer starter et nyt afsnit.';
export const PROJECT_FIELDS = [
  ['projekt', 'Projekt'],
  ['omfang', 'Omfang'],
  ['sagsbehandler', 'Sagsbehandler'],
  ['sagsbehandler_mail', 'Sagsbehandler-mail'],
  ['kontrol', 'Kvalitetssikring'],
  ['beskrivelse', 'Beskrivelse'],
  ['udfoeres_for', 'Udføres for'],
  ['sagsbehandler_initialer', 'Sagsbehandler-initialer'],
  ['sagsbehandler_telefon', 'Sagsbehandler-telefon'],
  ['kontrol_initialer', 'Kvalitetssikring-initialer'],
  ['kontrol_mail', 'Kvalitetssikring-mail'],
  ['kontrol_telefon', 'Kvalitetssikring-telefon'],
] as const;
export const PERSON_FIELDS = {
  sagsbehandler: [
    'sagsbehandler',
    'sagsbehandler_initialer',
    'sagsbehandler_mail',
    'sagsbehandler_telefon',
  ],
  kontrollant: ['kontrol', 'kontrol_initialer', 'kontrol_mail', 'kontrol_telefon'],
} as const;
export function selectReportEmployee(role: keyof typeof PERSON_FIELDS, employee: Employee) {
  if (Object.keys(employeeErrors(employee)).length) return {};
  return Object.fromEntries(
    PERSON_FIELDS[role].map((key, i) => [
      `rap_${key}`,
      [employee.navn, employee.initialer, employee.mail, employee.telefon][i],
    ]),
  );
}
export function resetProjectFields() {
  return {
    ...Object.fromEntries(PROJECT_FIELDS.map(([key]) => [`rap_${key}`, ''])),
    rap_kontrollant_i_bunden: false,
  };
}
export type ReportValues = Readonly<Record<string, unknown>>;
export interface ReportWidget {
  kind: 'text_input' | 'text_area' | 'date_input' | 'checkbox' | 'button';
  key: string;
  label: string;
  value: string | boolean;
  disabled: boolean;
  help: string | null;
}
export type ReportNode =
  | {
      kind: 'table_line';
      key: ReportLineKey;
      visibilityKey: string;
      label: string;
      value: string;
      shown: boolean;
      calculated: ReportLineEdit;
    }
  | { kind: 'employee_select'; key: keyof typeof PERSON_FIELDS; label: string }
  | { kind: 'caption'; text: string }
  | { kind: 'info'; text: string }
  | { kind: 'success'; text: string }
  | ReportWidget
  | { kind: 'text_toolbar'; key: string }
  | { kind: 'expander'; key: string; title: string; children: ReportNode[] }
  | {
      kind: 'figure';
      key: 'visualisering' | 'designdiagram';
      title: string;
      note: string;
      children?: ReportNode[];
    }
  | { kind: 'divider' };
export interface ReportStep {
  number: number;
  title: string;
  summary: string;
  children: ReportNode[];
}

export function localReportDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function reportFilename(metadata: ReportMetadata): string {
  // Python strip / slicing i Unicode-kodepunkter / rstrip(" -").
  const strip = (s: string) =>
    s.replace(
      /^[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0009-\u000d\u001c-\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/g,
      '',
    );
  const project =
    [...strip(metadata.projekt || 'MSL-rapport').replace(/[\\/]/g, '-')].slice(0, 60).join('') ||
    'MSL-rapport';
  return `Dimensionering - ${project} - ${metadata.dato ?? ''}`.replace(/[ -]+$/, '') + '.pdf';
}
const widget = (
  kind: ReportWidget['kind'],
  key: string,
  label: string,
  value: string | boolean = false,
  disabled = false,
  help: string | null = null,
): ReportWidget => ({ kind, key, label, value, disabled, help });
const caption = (text: string): ReportNode => ({ kind: 'caption', text });
const mpa = (n: number) => `${pythonFixed(n, 0)} MPa`;
const degrees = (n: number) => `${pythonFixed(n, 1).replace('.', ',')}°`;

export function reportPage(
  dim: DimensioningResult | null,
  values: ReportValues = {},
  date = localReportDate(),
  unit = 'mm',
) {
  const string = (key: string, fallback = '') =>
    typeof values[key] === 'string' ? (values[key] as string) : fallback;
  const bool = (key: string, fallback: boolean) =>
    typeof values[key] === 'boolean' ? (values[key] as boolean) : fallback;
  const metadata: ReportMetadata = {
    ...Object.fromEntries(PROJECT_FIELDS.map(([key]) => [key, string(`rap_${key}`)])),
    dato: date,
    kontrollant_i_bunden: bool('rap_kontrollant_i_bunden', false),
  };
  const texts = Object.fromEntries(
    SECTION_KEYS.map((key) => [key, string(`rap_tekst_${key}`, STANDARD_TEKSTER[key])]),
  );
  const choices: ReportChoices = {
    medtag_afsnit: Object.fromEntries(
      SECTION_KEYS.map((key) => [key, bool(`rap_medtag_${key}`, true)]),
    ),
    enhed: unit,
    standard_materialer: STANDARD_MATERIALER_RAPPORT.map((name, i) =>
      string(`rap_std_materiale_${i}`, name),
    ),
    grundlag_linjer: {},
    resultat_linjer: {},
    linje_rettelser: {},
  };
  const resetLines: { key: ReportLineKey; label: string }[] = [];
  const figureChoices: ReportFigureChoices = {};
  const steps: ReportStep[] = [];
  const base = {
    title: REPORT_TITLE,
    intro: REPORT_INTRO,
    metadata,
    texts,
    choices,
    figureChoices,
    resetLines,
    steps,
  };
  if (!dim?.geonet)
    return {
      ...base,
      available: false,
      banner: { kind: 'info' as const, text: REPORT_NO_CALCULATION },
      emptyAction: widget('button', 'dimensionering', 'Gå til Dimensionering'),
    };
  const basis =
    dim.grundlag_type === 'trafikklasse'
      ? `Trafikklasse ${dim.t_klasse ?? '—'} (Eₒ,ækv = ${mpa(dim.eo!)})`
      : `Klasse ${dim.valgt_klasse} (Eₒ = ${mpa(dim.eo!)})`;
  const banner = {
    kind: 'success' as const,
    text: `**Rapport baseret på:**  ${dim.tilstand || 'Brugerdefineret'}  ·  Eᵤ = ${mpa(dim.eu)}  ·  ${basis}  ·  Produkt: **${dim.geonet_navn}**  ·  φᵥ = ${degrees(dim.phi)}`,
  };
  steps.push({
    number: 1,
    title: 'Sagsoplysninger',
    summary: metadata.projekt || 'Ikke udfyldt',
    children: [
      caption(
        'Felterne huskes automatisk til næste gang. Brug **Nulstil felter** for at rydde dem.',
      ),
      widget(
        'button',
        'reset-fields',
        'Nulstil felter',
        false,
        false,
        'Rydder alle projekt-oplysninger og glemmer de gemte værdier.',
      ),
      ...PROJECT_FIELDS.map(([key, label]) =>
        widget(
          key === 'beskrivelse' ? 'text_area' : 'text_input',
          `rap_${key}`,
          label,
          string(`rap_${key}`),
        ),
      ),
      widget('date_input', 'rap_dato', 'Dato', date),
      { kind: 'employee_select', key: 'sagsbehandler', label: 'Vælg fra kartotek …' },
      { kind: 'employee_select', key: 'kontrollant', label: 'Vælg fra kartotek …' },
      widget(
        'checkbox',
        'rap_kontrollant_i_bunden',
        'Kvalitetssikring i bunden af rapporten',
        metadata.kontrollant_i_bunden,
      ),
      { kind: 'divider' },
    ],
  });
  const entered = dim.materialer.some((m) => !!m.tykkelse_mm);
  choices.vis_indtastet = entered ? bool('rap_vis_indtastet', true) : false;
  const basisLines = grundlag_linjer(dim, choices);
  const resultLines = resultat_linjer(dim, choices);
  const calculated: CalculatedReportLine[] = [
    ...basisLines.map(([key, label, value]): CalculatedReportLine => [
      `basis_${key}`,
      label,
      value,
    ]),
    ...resultLines.map(([key, label, value]): CalculatedReportLine => [
      `resultat_${key}`,
      label,
      value,
    ]),
  ];
  for (const [key, value] of Object.entries(values)) {
    if (!key.startsWith('rap_linje_') || !value || typeof value !== 'object') continue;
    const edit = value as Record<string, unknown>;
    if (
      ['beregnet_tekst', 'beregnet_vaerdi', 'tekst', 'vaerdi'].every(
        (field) => typeof edit[field] === 'string',
      )
    )
      choices.linje_rettelser![key.slice(10) as ReportLineKey] = edit as unknown as ReportLineEdit;
  }
  const reconciled = reconcileReportLines(calculated, choices.linje_rettelser);
  choices.linje_rettelser = reconciled.active;
  resetLines.push(...reconciled.reset);
  function lineNode(
    key: ReportLineKey,
    label: string,
    value: string,
    visibilityKey: string,
    fallback = true,
  ): ReportNode {
    const edit = choices.linje_rettelser![key];
    return {
      kind: 'table_line',
      key,
      visibilityKey,
      label: edit?.tekst ?? label,
      value: edit?.vaerdi ?? value,
      shown: bool(visibilityKey, fallback),
      calculated: { beregnet_tekst: label, beregnet_vaerdi: value, tekst: label, vaerdi: value },
    };
  }
  const basisWidgets = basisLines.map(([key, label, value]) => {
    choices.grundlag_linjer![key] = bool(`rap_grundlag_${key}`, true);
    return lineNode(`basis_${key}`, label, value, `rap_grundlag_${key}`);
  });
  const resultWidgets = resultLines.map(([key, label, value]) => {
    const fallback = key === 'indtastet' ? choices.vis_indtastet! : true;
    choices.resultat_linjer![key] = bool(`rap_resultat_${key}`, fallback);
    return lineNode(`resultat_${key}`, label, value, `rap_resultat_${key}`, fallback);
  });
  const basisChildren: ReportNode[] = [
    caption(
      'Linjerne i rapportens tabel Grundlag for beregning. Fravalgte linjer udelades af rapporten; beregningen berøres ikke. Er alle linjer fravalgt, udelades tabellen og dens overskrift.',
    ),
    ...basisWidgets.filter((_, i) => i % 2 === 0),
    ...basisWidgets.filter((_, i) => i % 2 === 1),
  ];
  if (dim.tilstand === 'Standard')
    basisChildren.push(
      caption(
        'Standard-beregningen regnes med designdiagrammernes referencemateriale. Linjen Materialeopbygning angiver de materialer, opbygningen udføres i; navnene har ingen betydning for beregningen.',
      ),
      ...['Øverste lag', 'Nederste lag'].map((label, i) =>
        widget(
          'text_input',
          `rap_std_materiale_${i}`,
          label,
          choices.standard_materialer![i]!,
          choices.grundlag_linjer!.materialer === false,
          `Standard: ${STANDARD_MATERIALER_RAPPORT[i]}.`,
        ),
      ),
    );
  const content: ReportNode[] = [
    caption(
      "Standardteksterne fra BG Byggros' eksempelrapport er forudfyldt. Teksterne kan redigeres pr. rapport eller nulstilles til standard.",
    ),
  ];
  for (const key of SECTION_KEYS) {
    content.push({
      kind: 'expander',
      key,
      title: SECTION_TITLER[key],
      children: [
        widget('button', `reset-${key}`, 'Nulstil'),
        widget('checkbox', `rap_medtag_${key}`, 'Medtag i rapporten', choices.medtag_afsnit![key]!),
        { kind: 'text_toolbar', key: `rap_tekst_${key}` },
        widget('text_area', `rap_tekst_${key}`, 'Tekst', texts[key]),
        caption(REPORT_FORMAT_HELP),
      ],
    });
    if (key === 'oplyste_forudsaetninger')
      content.push({
        kind: 'expander',
        key: 'basis',
        title: 'Grundlag for beregning',
        children: basisChildren,
      });
    if (key === 'generelle_forudsaetninger')
      content.push({
        kind: 'expander',
        key: 'results',
        title: 'Dimensioneringsresultat',
        children: [
          caption('Linjerne kan tilpasses og fravælges i rapporten; beregningen berøres ikke.'),
          ...resultWidgets,
        ],
      });
  }
  content.push({ kind: 'divider' });
  steps.push({ number: 2, title: 'Indhold', summary: '7 afsnit', children: content });
  const r1 = dim.res_1 as CalculationResult,
    r2 = dim.res_2 as CalculationResult;
  const t1 = r1.fejl ? null : r1.t_armeret_mm;
  const diagramPossible = !!dim.geonet.navn;
  function check(
    key: keyof ReportFigureChoices,
    label: string,
    possible: boolean,
    help: string | null = null,
    fallback = possible,
  ) {
    const value = possible ? bool(key, fallback) : fallback;
    figureChoices[key] = value;
    return widget('checkbox', key, label, value, !possible, help);
  }
  const preview: ReportNode[] = [
    check(
      'rap_vis_indtastet',
      'Indtastet opbygning',
      entered,
      entered ? null : 'Ingen brugerindtastede lagtykkelser at vise.',
    ),
    check(
      'rap_vis_uarm',
      'Ustabiliseret opbygning',
      dim.t_uarmeret_mm != null,
      dim.t_uarmeret_mm != null
        ? null
        : 'Ustabiliseret tykkelse er ikke defineret for denne Eᵤ/Eₒ-kombination.',
    ),
    check('rap_vis_1lag', '1 lag geonet', t1 != null),
    check(
      'rap_vis_2lag',
      '2 lag geonet',
      t1 != null && t1 >= 500,
      t1 != null && t1 >= 500
        ? null
        : `2 lag geonet anvendes kun ved opbygninger ≥ ${laengde(500, unit)} (beregnet 1-lag tykkelse) — derfor ikke relevant her.`,
    ),
  ];
  const diagramChoices: ReportNode[] = [
    check(
      'rap_vis_designdiagram',
      'Personligt designdiagram',
      diagramPossible,
      diagramPossible
        ? 'Tegner designkurverne (ustabiliseret, 1 lag og 2 lag) tilpasset de valgte materialer og det valgte geonet, med den indtastede opbygning og E-værdi som referencer. Formen svarer til de oprindelige designdiagrammer.'
        : 'Vælg et specifikt geonet under Dimensionering for at få kurverne med produktets net-korrektion.',
    ),
  ];
  diagramChoices.push(
    check(
      'rap_dd_vis_din_prik',
      "Vis 'Indtastet opbygning'-prik i designdiagram",
      !!figureChoices.rap_vis_designdiagram,
      null,
      true,
    ),
    check(
      'rap_dd_vis_lag_prikker',
      'Vis endepunkter for 1/2 lag i designdiagram',
      !!figureChoices.rap_vis_designdiagram,
      null,
      true,
    ),
  );
  choices.vis_indtastet = figureChoices.rap_vis_indtastet;
  if (
    figureChoices.rap_vis_indtastet ||
    figureChoices.rap_vis_uarm ||
    (figureChoices.rap_vis_1lag && t1 != null) ||
    (figureChoices.rap_vis_2lag && !r2.fejl && r2.t_armeret_mm != null)
  )
    preview.push({
      kind: 'figure',
      key: 'visualisering',
      title: 'Opbygning',
      note: 'Snit i samme lodrette skala · forhåndsvisning fra dimensioneringen',
    });
  preview.push({
    kind: 'figure',
    key: 'designdiagram',
    title: 'Designdiagram',
    note: `Eₒ = ${mpa(dim.eo!)} · ${basis} · φᵥ = ${degrees(dim.phi)} · ${dim.geonet_navn || 'referencenet'}`,
    children: diagramChoices,
  });
  preview.push({ kind: 'divider' });
  steps.push({ number: 3, title: 'Gennemsyn', summary: 'Sådan bliver siderne', children: preview });
  const ready = preview.some((n) => n.kind === 'figure' && n.key === 'visualisering');
  steps.push({
    number: 4,
    title: 'Generér',
    summary: '',
    children: [
      widget('button', 'generate', 'Generér rapport', false, !ready),
      ...(!ready ? [caption('Vælg mindst ét snit for at kunne generere rapporten.')] : []),
    ],
  });
  return { ...base, available: true, banner, emptyAction: null };
}

/** Kun rapporttekster og valg. Projektfelter, dato og øvrige sessionsværdier berøres ikke. */
export function resetReportChoices(values: ReportValues): Record<string, null> {
  return Object.fromEntries(
    Object.keys(values)
      .filter((key) =>
        /^rap_(tekst_|medtag_|grundlag_|resultat_|linje_|std_materiale_|vis_|dd_vis_)/.test(key),
      )
      .map((key) => [key, null]),
  );
}
