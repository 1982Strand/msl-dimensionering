import {
  constructionData,
  type Construction,
  type DimensioningResult,
} from '../engine/construction.ts';
import { constructionSvg } from '../engine/construction-svg.ts';
import { lag_til_fordeling, lagspec } from '../engine/dimensionering.ts';
import { normaliser_opbygning } from '../engine/editing.ts';
import { fordel_lag, rund_op } from '../engine/afrunding.ts';
import { fordel_soejle } from '../engine/lagfordeling.ts';
import { check_geonet_placement, type Placement } from '../engine/placement.ts';
import { byg_designdiagram, type PersonalDiagramInput } from '../engine/personal-diagram.ts';
import { diagramModel, renderPersonalDiagramSvg } from '../engine/personal-diagram-svg.ts';
import { K_PHI, PHI_BASIS } from '../engine/data.ts';
import { pythonFixed } from '../engine/python-numbers.ts';
import type { BasisTable, CalculationResult, DistributedLayer } from '../engine/types.ts';
import type { ProductRow } from '../engine/products.ts';

export interface ReportFigureChoices {
  rap_vis_uarm?: boolean;
  rap_vis_1lag?: boolean;
  rap_vis_2lag?: boolean;
  rap_vis_indtastet?: boolean;
  rap_vis_signatur?: boolean;
  rap_vis_designdiagram?: boolean;
  rap_dd_vis_din_prik?: boolean;
  rap_dd_vis_lag_prikker?: boolean;
}
export interface ReportSection {
  titel: string;
  t_baerelag_mm: number;
  geonet_y_fracs: number[];
  sub_lag: DistributedLayer[] | null;
  ikke_defineret_tekst: null;
  best_case_mm: number | null;
  best_case_note: string | null;
  placement: Placement | null;
  er_krav_soejle: boolean;
  t_indtastet_mm: number | null;
  status_tekst: string | null;
  status_farve: string | null;
  phi_vaegtet: boolean;
}
export interface ReportConstructionCall {
  eu: number;
  snit_liste: ReportSection[];
  geonet_label: string;
  materialer: DimensioningResult['materialer'];
  reference_mm: number | null;
  dpi: number;
  figsize: [number, number];
  geonet_paaskrift: boolean;
  geonet_maerkat: null;
  vis_maal_streg: boolean;
  vis_maal_tal: boolean;
  vis_signatur: boolean;
  enhed: string;
}
export interface ReportDiagramCall extends PersonalDiagramInput {
  klasse: number | null;
  grundlag_label: string | null;
  dpi: number;
  figsize: [number, number];
}
export interface FigureExport {
  width: number;
  height: number;
  scale: number;
  margin: { l: number; r: number; t: number; b: number };
  title?: {
    text: string;
    x: number;
    xanchor: string;
    y: number;
    yanchor: string;
    font: { size: number };
  };
}
export interface ReportFigure {
  svg: string;
  export: FigureExport;
  /** Bredde i rapporten. */
  width_mm: number;
}
/** Originalens Plotly-eksport var 1000 px bred og blev sat 16 cm bred (Cm(16)), dvs. 0,16 mm/px. */
export const FIGUR_MM_PR_PX = 0.16;
export const FIGUR_MAKS_MM = 160;
export interface ReportFigures {
  constructionCall: ReportConstructionCall | null;
  diagramCall: ReportDiagramCall | null;
  visualisering: ReportFigure | null;
  designdiagram: ReportFigure | null;
}
const xml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
const validThickness = (r: CalculationResult): number | null =>
  !r.fejl ? (r.t_armeret_mm ?? null) : null;

export function reportFigures(
  dim: DimensioningResult,
  settings: { opbygning?: unknown; lagfordeling?: unknown },
  table: BasisTable,
  choices: ReportFigureChoices = {},
): ReportFigures {
  const display = normaliser_opbygning(settings.opbygning);
  const visSignatur = choices.rap_vis_signatur ?? display.signatur;
  const netplacering =
    (settings.lagfordeling as { netplacering?: string } | undefined)?.netplacering ?? 'laggraense';
  const res = [dim.res_1, dim.res_2] as CalculationResult[];
  const totals = res.map(validThickness);
  const materials = dim.materialer;
  const enteredLayers = materials
    .filter((m) => (m.tykkelse_mm || 0) > 0)
    .map((m) => ({ navn: m.navn, tykkelse_mm: m.tykkelse_mm! }));
  const entered = enteredLayers.reduce((n, l) => n + l.tykkelse_mm, 0) || null;
  const activeEntered = (choices.rap_vis_indtastet ?? !!entered) && entered !== null;
  const reference = activeEntered ? entered : null;
  const unit = display.enhed;
  const rows = res.map(
    (r, i) =>
      ({
        ...r,
        navn: dim.geonet_navn,
        t_armeret_mm_min: i ? dim.t_2_lag_best_mm : dim.t_1_lag_best_mm,
        t_armeret_eksakt_mm_min: i ? dim.t_2_lag_best_eksakt_mm : dim.t_1_lag_best_eksakt_mm,
        phi_min: i ? dim.phi_2_lag_best : dim.phi_1_lag_best,
        korrektion_min: dim.geonet?.korrektion_interval?.[0],
      }) as ProductRow,
  );
  // Genbrug kun den allerede porterede note/status-dannelse, ingen beregning.
  const screen = constructionData(
    dim,
    { one: [rows[0]], two: [rows[1]] },
    settings.opbygning,
    netplacering,
  );
  const uarm =
    res[0].t_uarmeret_phi_kor_mm ||
    res[1].t_uarmeret_phi_kor_mm ||
    (dim.t_uarmeret_mm == null
      ? null
      : rund_op(dim.t_uarmeret_mm * (1 + K_PHI * (dim.phi - PHI_BASIS)), dim.afrunding.trin_mm));
  function layers(
    total: number,
    uarmRef: number | null = null,
    reinforced = false,
  ): DistributedLayer[] | null {
    if (!materials.length && 'standard_opdeling' in dim && dim.standard_opdeling) {
      const s = dim.standard_opdeling;
      if (
        !s.spec ||
        (s.under_minimum === 'ubundet' && s.stabilgrus_mm && total < s.stabilgrus_mm - 0.5)
      )
        return null;
      const sub = fordel_soejle(s.spec, total, dim.afrunding.trin_mm);
      return sub.length ? sub : null;
    }
    const spec = 'fordeling' in dim && dim.fordeling ? lagspec(materials, dim.fordeling) : null;
    const sub = spec
      ? fordel_soejle(spec, total, dim.afrunding.trin_mm, uarmRef, reinforced)
      : fordel_lag(lag_til_fordeling(materials), total, dim.afrunding.trin_mm);
    const count = materials.filter((m) => (m.tykkelse_mm || 0) > 0 || (m.pct || 0) > 0).length;
    return sub.length >= 2 || (sub.length && count >= 2) ? sub : null;
  }
  const snit: ReportSection[] = [];
  function section(
    title: string,
    total: number,
    sub: DistributedLayer[] | null,
    index: number | null,
    input = false,
  ) {
    const column = screen.kolonner.find((c) => c.titel === title);
    const placement =
      index == null
        ? null
        : check_geonet_placement({
            lag_mode: `${index + 1}_lag`,
            total_mm: total,
            geonet: dim.geonet,
            sub_lag: sub,
            placering: netplacering,
          });
    const state = reference !== null && !input ? column?.status : null;
    snit.push({
      titel: title,
      t_baerelag_mm: total,
      geonet_y_fracs: placement?.geonet_y_fracs ?? [],
      sub_lag: sub,
      ikke_defineret_tekst: null,
      best_case_mm:
        index == null ? null : ((index ? dim.t_2_lag_best_mm : dim.t_1_lag_best_mm) ?? null),
      best_case_note: index == null ? null : (column?.best_case_note ?? null),
      placement,
      er_krav_soejle: !sub,
      t_indtastet_mm: reference,
      status_tekst: state?.[0] || null,
      status_farve: state?.[0]
        ? { neutral: 'neutral', gron: 'success', advarsel: 'warning', kritisk: 'danger' }[state[1]]
        : null,
      phi_vaegtet: !!entered,
    });
  }
  if (activeEntered) section('Indtastet opbygning', entered!, enteredLayers, null, true);
  if (
    (choices.rap_vis_uarm ?? dim.t_uarmeret_mm !== null) &&
    dim.t_uarmeret_mm !== null &&
    uarm !== null
  )
    section(
      entered ? 'Ustabiliseret bærelagstykkelse (φᵥ-korrigeret)' : 'Ustabiliseret bærelagstykkelse',
      uarm,
      layers(uarm),
      null,
    );
  if ((choices.rap_vis_1lag ?? totals[0] !== null) && totals[0] !== null)
    section('1 lag geonet', totals[0], layers(totals[0], uarm, true), 0);
  if (
    (choices.rap_vis_2lag ?? (totals[0] !== null && totals[0] >= 500)) &&
    totals[0] !== null &&
    totals[0] >= 500 &&
    totals[1] !== null
  )
    section('2 lag geonet', totals[1], layers(totals[1], uarm, true), 1);
  const constructionCall: ReportConstructionCall | null = snit.length
    ? {
        eu: dim.eu,
        snit_liste: snit,
        geonet_label: dim.geonet?.navn ?? 'Geonet',
        materialer: materials,
        reference_mm: reference,
        dpi: 200,
        figsize: [10, 3.4],
        geonet_paaskrift: display.geonet_paaskrift,
        geonet_maerkat: null,
        vis_maal_streg: display.maal_streg,
        vis_maal_tal: display.maal_tal,
        vis_signatur: visSignatur,
        enhed: unit,
      }
    : null;
  let visualisering: ReportFigure | null = null;
  if (constructionCall) {
    const data: Construction = {
      ...screen,
      vis_signatur: visSignatur,
      reference_mm: reference,
      kolonner: snit.map((s, i) => ({
        titel: s.titel,
        total_mm: s.t_baerelag_mm,
        lag: s.sub_lag
          ? s.sub_lag.map((l) => [
              l.navn,
              l.tykkelse_mm,
              (materials.find((m) => m.navn === l.navn)?.lagtype ?? l.lagtype ?? l.navn)
                .toLowerCase()
                .startsWith('bunds')
                ? 'bundsikring'
                : 'baerelag',
            ])
          : [['Ubunden opbygning', s.t_baerelag_mm, 'baerelag']],
        geonet_mm: s.geonet_y_fracs.map((f) => s.t_baerelag_mm * (1 - f)),
        tom_tekst: '',
        best_case_mm: s.best_case_mm,
        best_case_note: s.best_case_note,
        status:
          reference !== null
            ? (screen.kolonner.find((c) => c.titel === s.titel)?.status ?? ['', 'neutral'])
            : ['', 'neutral'],
        ...(i === 0 ? { underbund_tekst: `Underbund Eᵤ = ${pythonFixed(dim.eu, 0)} MPa` } : {}),
      })),
    };
    const exp = {
      width: 1000,
      height: visSignatur ? 386 : 340,
      scale: 2,
      margin: { l: 10, r: 10, t: 34, b: visSignatur ? 96 : 50 },
    };
    // Originalens eksportflade (Plotly 1000 × 386) registreres i `export` og kontrolleres i
    // testen. Den fælles renderer (B-025) har egne proportioner og en bredde, der følger antallet
    // af snit. Figuren sættes derfor i originalens målestok (0,16 mm/px, højst 16 cm), så
    // teksten får originalens størrelse uanset antallet af snit.
    const svg = constructionSvg(data, 'report-construction');
    const naturalWidth = Number(/width="([\d.]+)"/.exec(svg)![1]);
    visualisering = {
      export: exp,
      svg,
      width_mm: Math.min(FIGUR_MAKS_MM, naturalWidth * FIGUR_MM_PR_PX),
    };
  }
  let diagramCall: ReportDiagramCall | null = null;
  let designdiagram: ReportFigure | null = null;
  if ((choices.rap_vis_designdiagram ?? !!dim.geonet?.navn) && dim.geonet?.navn) {
    const selected = res.map((r, i) => (totals[i] !== null ? r : null));
    let phi_kurver: PersonalDiagramInput['phi_kurver'] = null;
    if (selected.some((r) => r?.phi_regel)) {
      phi_kurver = {};
      const u = selected.find((r) => r?.phi_uarmeret != null)?.phi_uarmeret;
      if (u != null) phi_kurver.uarmeret = u;
      selected.forEach((r, i) => {
        if (r?.phi != null) phi_kurver![i ? '2_lag' : '1_lag'] = r.phi;
      });
    }
    const dots = choices.rap_dd_vis_lag_prikker ?? true;
    diagramCall = {
      eu: dim.eu,
      eo: dim.eo,
      klasse: dim.valgt_klasse,
      grundlag_label: dim.grundlag_type === 'trafikklasse' ? `Trafikklasse ${dim.t_klasse}` : null,
      phi: dim.phi,
      geonet: dim.geonet,
      t_indtastet_mm: (choices.rap_dd_vis_din_prik ?? true) ? entered : null,
      t_basis_table: table,
      t_1_lag_mm: dots && totals[0] !== null ? (res[0].t_armeret_eksakt_mm ?? totals[0]) : null,
      t_2_lag_mm: dots && totals[1] !== null ? (res[1].t_armeret_eksakt_mm ?? totals[1]) : null,
      t_1_lag_best_mm: dots ? dim.t_1_lag_best_eksakt_mm || dim.t_1_lag_best_mm || null : null,
      t_2_lag_best_mm: dots ? dim.t_2_lag_best_eksakt_mm || dim.t_2_lag_best_mm || null : null,
      skala: dim.skala,
      dpi: 300,
      figsize: [9, 5.5],
      phi_kurver,
    };
    const label =
      diagramCall.grundlag_label ||
      (dim.valgt_klasse !== null ? `Klasse ${dim.valgt_klasse}` : `Eₒ = ${pythonFixed(dim.eo, 0)}`);
    const title = {
      text: `Eₒ = ${pythonFixed(dim.eo, 0)} MPa · ${label} · φᵥ = ${pythonFixed(dim.phi, 1).replace('.', ',')}° · ${dim.geonet.navn || 'referencenet'}`,
      x: 0,
      xanchor: 'left',
      y: 0.98,
      yanchor: 'top',
      font: { size: 13 },
    };
    const exp = {
      width: 900,
      height: 550,
      scale: 3,
      margin: { l: 70, r: 20, t: 70, b: 60 },
      title,
    };
    // Den fælles SVG har faste interne margener 58/18/18/46. En ydre SVG
    // tilfører rapporttitlen og oversætter fladen til rapportens 70/20/70/60.
    const inner = renderPersonalDiagramSvg(diagramModel(byg_designdiagram(diagramCall)), {
      width: 886,
      height: 484,
      fontFamily: 'Carlito',
      idPrefix: 'report-diagram',
    }).replace('<svg ', '<svg x="12" y="52" ');
    designdiagram = {
      export: exp,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="550" viewBox="0 0 900 550"><rect width="900" height="550" fill="white"/><text x="0" y="26" font-family="Carlito" font-size="13" fill="#263a32">${xml(title.text)}</text>${inner}</svg>`,
      // Originalens rapport satte diagrammet i fuld figurbredde (Cm(16)).
      width_mm: FIGUR_MAKS_MM,
    };
  }
  return { constructionCall, diagramCall, visualisering, designdiagram };
}
