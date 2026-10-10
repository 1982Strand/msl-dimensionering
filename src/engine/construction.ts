import { dimensioner, lag_til_fordeling, lagspec } from './dimensionering.ts';
import { fordel_lag, rund_op, tillaeg } from './afrunding.ts';
import { fordel_soejle } from './lagfordeling.ts';
import { check_geonet_placement } from './placement.ts';
import { laengde, konverter_tekst } from './enhed.ts';
import { K_PHI, PHI_BASIS } from './data.ts';
import { pythonFixed, pythonRound } from './python-numbers.ts';
import { normaliser_opbygning } from './editing.ts';
import type { ProductRow } from './products.ts';
import type { CalculationResult, DistributedLayer } from './types.ts';

export type DimensioningResult = NonNullable<ReturnType<typeof dimensioner>>;
export interface ConstructionColumn {
  titel: string;
  lag: [string, number, 'baerelag' | 'bundsikring'][];
  geonet_mm: number[];
  total_mm: number | null;
  tom_tekst: string;
  best_case_mm: number | null;
  best_case_note: string | null;
  status: [string, 'neutral' | 'gron' | 'advarsel' | 'kritisk'];
  underbund_tekst?: string;
}
export interface Construction {
  kolonner: ConstructionColumn[];
  reference_mm: number | null;
  geonet_navn: string;
  geonet_maerkat: string;
  geonet_paaskrift: boolean;
  vis_maal_streg: boolean;
  vis_maal_tal: boolean;
  vis_signatur: boolean;
  enhed: string;
}
/** Placement checks use the same material boundaries as the drawn columns. */
export function constructionWarnings(
  data: Construction,
  result: DimensioningResult,
  netplacering: string,
) {
  return data.kolonner.slice(-2).flatMap((column, i) => {
    if (!column.total_mm) return [];
    const placement = check_geonet_placement({
      lag_mode: `${i + 1}_lag`,
      total_mm: column.total_mm,
      geonet: result.geonet,
      sub_lag:
        column.lag.length >= 2
          ? column.lag.map(([navn, tykkelse_mm]) => ({ navn, tykkelse_mm }))
          : null,
      placering: netplacering,
    });
    return placement.placeringsadvarsler.map((message) => ({
      message: konverter_tekst(`${result.geonet_navn}: ${message}`, data.enhed),
      lag: i + 1,
      recommendation: message.includes('Anbefalingen for bedst effekt'),
    }));
  });
}
function status(
  input: number | null,
  required: number | null,
  best: number | null,
  unit: string,
): ConstructionColumn['status'] {
  if (input === null || required === null) return ['', 'neutral'];
  const diff = input - required,
    optimal = best !== null && best < required ? input - best : null;
  if (diff >= 0)
    return [
      `${laengde(diff, unit)} i overskud${optimal !== null && optimal > diff ? `\n(${laengde(optimal, unit)} optimalt)` : ''}`,
      'gron',
    ];
  if (optimal !== null && optimal >= 0)
    return [
      `${laengde(-diff, unit)} for lidt (optimalt ${laengde(optimal, unit)} i overskud)`,
      'advarsel',
    ];
  return [
    `${laengde(-diff, unit)} for lidt${optimal !== null ? `\n(${laengde(-optimal, unit)} optimalt)` : ''}`,
    'kritisk',
  ];
}
const pct = (value: number, decimals = 0) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${pythonFixed(Math.abs(value * 100), decimals).replace('.', ',')} %`;
function optimalNote(
  p: ProductRow | undefined,
  result: DimensioningResult,
  unit: string,
): string | null {
  if (
    !p ||
    p.fejl ||
    p.t_armeret_mm == null ||
    p.t_armeret_mm_min == null ||
    p.korrektion_min == null ||
    p.t_basis_arm_mm == null
  )
    return null;
  const best = p.t_armeret_mm_min,
    exact = p.t_armeret_eksakt_mm_min ?? best;
  const unreinforced = p.t_uarmeret_eksakt_mm ?? p.t_uarmeret_mm ?? null;
  const index = String(result.geonet?.effektindeks ?? '')
    .split('–')
    .at(-1)!;
  const phi = p.phi_min || p.phi || result.phi,
    phiCorrection = K_PHI * (phi - PHI_BASIS);
  const net = pythonRound(p.t_basis_arm_mm * p.korrektion_min),
    phiMm = pythonRound(p.t_basis_arm_mm * phiCorrection);
  const lines: [string, string, number | null][] = [
    ['', 'Ustabiliseret bærelagstykkelse', unreinforced],
    [
      '−',
      'Basisreduktion, referencenet',
      Math.abs(unreinforced === null ? 0 : pythonRound(unreinforced - p.t_basis_arm_mm)),
    ],
    [net < 0 ? '−' : '+', `Net-korrektion, indeks ${index}`, Math.abs(net)],
  ];
  if (Math.abs(phiCorrection) > 0.0005)
    lines.push([phiMm < 0 ? '−' : '+', `φᵥ-korrektion, ${pct(phiCorrection, 1)}`, Math.abs(phiMm)]);
  const step = p.afrunding_trin_mm || result.afrunding.trin_mm;
  const additions = tillaeg(best, exact, step, p.t_min_mm);
  [
    `Oprunding til nærmeste ${laengde(step, unit)}`,
    'Tillæg til minimumstykkelse',
    'Tillæg for mindste lagtykkelse',
  ].forEach((label, i) => {
    if (pythonRound(additions[i]) > 0) lines.push(['+', label, pythonRound(additions[i])]);
  });
  return [
    `Optimal korrektion · effektindeks ${index} · net-korrektion ${pct(p.korrektion_min)}`,
    ...lines.map(([sign, label, mm]) => `${sign} ${label}: ${laengde(mm, unit)}`.trim()),
    `= Stabiliseret bærelagstykkelse: ${laengde(best, unit)}`,
  ].join('\n');
}

export function constructionData(
  result: DimensioningResult,
  products: { one: ProductRow[]; two: ProductRow[] },
  display: unknown,
  netplacering = 'laggraense',
): Construction {
  const settings = normaliser_opbygning(display),
    unit = settings.enhed;
  const materials = result.materialer,
    step = result.afrunding.trin_mm;
  const selected = [products.one, products.two].map((rows) =>
    rows.find((p) => p.navn === result.geonet_navn),
  );
  const reference = [result.res_1, result.res_2].find(
    (r) => !r.fejl && (r as CalculationResult).t_uarmeret_mm != null,
  ) as CalculationResult | undefined;
  const raw = reference?.t_uarmeret_mm ?? null;
  const enteredLayers = materials
    .filter((m) => (m.tykkelse_mm || 0) > 0)
    .map((m) => ({ navn: m.navn, tykkelse_mm: m.tykkelse_mm! }));
  const entered = enteredLayers.length
    ? enteredLayers.reduce((sum, l) => sum + l.tykkelse_mm, 0)
    : null;
  const unreinforced =
    raw === null
      ? null
      : (reference?.t_uarmeret_phi_kor_mm ??
        (entered ? rund_op(raw * (1 + K_PHI * (result.phi - PHI_BASIS)), step) : raw));
  const split = 'standard_opdeling' in result ? result.standard_opdeling : null;
  const distribution = 'fordeling' in result ? result.fordeling : null;
  function layers(
    total: number | null,
    unreinforcedReference: number | null = null,
  ): DistributedLayer[] | null {
    if (!total) return null;
    if (!materials.length && split) {
      if (
        !split.spec ||
        (split.under_minimum === 'ubundet' &&
          split.stabilgrus_mm &&
          total < split.stabilgrus_mm - 0.5)
      )
        return null;
      const distributed = fordel_soejle(split.spec, total, step);
      return distributed.length ? distributed : null;
    }
    const spec = distribution ? lagspec(materials, distribution) : null;
    const distributed = spec
      ? fordel_soejle(spec, total, step, unreinforcedReference)
      : fordel_lag(lag_til_fordeling(materials), total, step);
    const count = materials.filter((m) => (m.tykkelse_mm || 0) > 0 || (m.pct || 0) > 0).length;
    return distributed.length >= 2 || (distributed.length && count >= 2) ? distributed : null;
  }
  const columns: ConstructionColumn[] = [];
  function column(
    title: string,
    total: number | null,
    sub: DistributedLayer[] | null,
    net: number[],
    best: number | null = null,
    note: string | null = null,
    state: ConstructionColumn['status'] = ['', 'neutral'],
    empty = 'Ikke defineret',
  ) {
    const lag: ConstructionColumn['lag'] = sub?.length
      ? sub.map((l) => {
          const material = materials.find((m) => m.navn === l.navn);
          const type = material
            ? String(material.lagtype || '')
                .toLowerCase()
                .startsWith('bunds')
            : l.navn.toLowerCase().includes('bundsikring');
          return [l.navn, l.tykkelse_mm, type ? 'bundsikring' : 'baerelag'];
        })
      : total
        ? [['Ubunden opbygning', total, 'baerelag']]
        : [];
    columns.push({
      titel: title,
      lag,
      geonet_mm: net,
      total_mm: total,
      tom_tekst: empty,
      best_case_mm: best,
      best_case_note: note,
      status: state,
    });
  }
  if (entered) column('Indtastet opbygning', entered, enteredLayers, []);
  column(
    entered && unreinforced !== null
      ? 'Ustabiliseret bærelagstykkelse (φᵥ-korrigeret)'
      : 'Ustabiliseret bærelagstykkelse',
    unreinforced,
    layers(unreinforced),
    [],
    null,
    null,
    status(entered, unreinforced, null, unit),
    unreinforced === null
      ? `Ustabiliseret bærelag ikke defineret for Eᵤ = ${pythonFixed(result.eu, 0)} MPa`
      : 'Ikke defineret',
  );
  selected.forEach((p, i) => {
    const total = p && !p.fejl ? (p.t_armeret_mm ?? null) : null;
    const best = p && !p.fejl ? (p.t_armeret_mm_min ?? null) : null;
    const sub = layers(total, unreinforced);
    const placement = check_geonet_placement({
      lag_mode: `${i + 1}_lag`,
      total_mm: total,
      geonet: result.geonet,
      sub_lag: sub,
      placering: netplacering,
    });
    column(
      `${i + 1} lag geonet`,
      total,
      sub,
      total ? placement.geonet_y_fracs.map((frac) => total * (1 - frac)) : [],
      best,
      optimalNote(p, result, unit),
      status(entered, total, best, unit),
      total === null ? 'Ikke gyldigt for denne kombination' : 'Ikke defineret',
    );
  });
  columns[0].underbund_tekst = `Underbund Eᵤ = ${pythonFixed(result.eu, 0)} MPa`;
  return {
    kolonner: columns,
    reference_mm: entered,
    geonet_navn: result.geonet_navn,
    geonet_maerkat: result.geonet_navn,
    geonet_paaskrift: settings.geonet_paaskrift,
    vis_maal_streg: settings.maal_streg,
    vis_maal_tal: settings.maal_tal,
    vis_signatur: settings.signatur,
    enhed: unit,
  };
}
