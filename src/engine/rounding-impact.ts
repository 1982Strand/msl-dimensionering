/** Indstillinger, afsnit 1: afrundingsvalgenes konsekvens for den aktuelle dimensionering. */
import type { DataState } from './auto-edit.ts';
import { er_oprundet, normaliser as roundingOf, rund_op } from './afrunding.ts';
import { K_PHI, PHI_BASIS } from './data.ts';
import { dimensioner, phi_fra_materialer } from './dimensionering.ts';
import { dimensioningInput, type FormValues } from './dimensioning-form.ts';
import { resultCardValues, resultProducts } from './dimensioning-page.ts';
import { standard_indstillinger } from './editing.ts';
import { normaliser as lagfordelingOf } from './lagfordeling.ts';
import { fortegn, laengde, normaliser as unitOf } from './enhed.ts';
import { pythonFixed } from './python-numbers.ts';

export interface RoundingImpactRow {
  label: string;
  selected: string;
  standard: string;
  difference: string;
}
export interface RoundingImpactModel {
  context: string;
  rows: RoundingImpactRow[];
  notes: string[];
}

const AFRUNDINGSVALG = ['trin_mm', 'reduktion_eksakt', 'vis_eksakt', 'phi_afrunding'] as const;
const dk = (v: number, digits: number) =>
  pythonFixed(v, digits).replace('.', ',').replace('-', '−');
const signed = (v: number, digits: number, suffix: string) => {
  const text = dk(v, digits);
  if (/^[−0,]+$/.test(text)) return `${dk(0, digits)}${suffix}`;
  return `${text.startsWith('−') ? text : `+${text}`}${suffix}`;
};

function calculate(values: FormValues, data: DataState) {
  const input = dimensioningInput(values, data),
    result = dimensioner(input);
  if (!result) return null;
  const cards = resultCardValues(
    input.tilstand === 'Standard',
    result,
    resultProducts(input, result),
  );
  if (cards.unreinforced === null) return null;
  const weighted = input.phi_manuel ?? phi_fra_materialer(input.materialer ?? []);
  return { input, result, cards, weighted };
}
type Calculation = NonNullable<ReturnType<typeof calculate>>;

/** Uden gyldigt resultat returneres null, og siden viser i stedet eksemplet med 532 mm. */
export function roundingImpact(values: FormValues, data: DataState): RoundingImpactModel | null {
  const defaults = standard_indstillinger().afrunding;
  const chosen = roundingOf(data.indstillinger.afrunding);
  const standardData = structuredClone(data);
  standardData.indstillinger.afrunding = {
    ...standardData.indstillinger.afrunding,
    trin_mm: defaults.trin_mm,
    reduktion_eksakt: defaults.reduktion_eksakt,
    vis_eksakt: defaults.vis_eksakt,
    phi_afrunding: defaults.phi_afrunding,
  };
  const selected = calculate(values, data),
    baseline = calculate(values, standardData);
  if (!selected || !baseline) return null;
  const unit = unitOf(data.indstillinger.opbygning.enhed);
  const thickness = (t: number | null, exact: number | null, showExact: boolean) =>
    t === null
      ? 'uden for diagrammet'
      : `${laengde(t, unit)}${showExact && er_oprundet(t, exact) ? ` (beregnet ${laengde(exact, unit)})` : ''}`;
  const rows: RoundingImpactRow[] = [];
  const thicknessRow = (
    label: string,
    pick: (c: Calculation['cards']) => [number | null, number | null],
  ) => {
    const [a, aExact] = pick(selected.cards),
      [b, bExact] = pick(baseline.cards);
    rows.push({
      label,
      selected: thickness(a, aExact, chosen.vis_eksakt),
      standard: thickness(b, bExact, false),
      difference: a !== null && b !== null ? fortegn(a - b, unit) : '',
    });
  };
  thicknessRow('Nødvendig uden geonet', (c) => [c.unreinforced, c.unreinforcedExact]);
  for (const i of [0, 1])
    thicknessRow(`${i + 1} lag geonet`, (c) => [
      c.layers[i]?.t ?? null,
      c.layers[i]?.exact ?? null,
    ]);
  for (const i of [0, 1]) {
    const a = selected.cards.layers[i],
      b = baseline.cards.layers[i];
    const reduction = (l: typeof a) =>
      l
        ? `${laengde(l.reduktion_mm, unit)} (${dk(l.reduktion_pct * 100, 1)} %)`
        : 'uden for diagrammet';
    rows.push({
      label: `Reduktion ved ${i + 1} lag`,
      selected: reduction(a),
      standard: reduction(b),
      difference:
        a && b
          ? `${fortegn(a.reduktion_mm - b.reduktion_mm, unit)} · ${signed((a.reduktion_pct - b.reduktion_pct) * 100, 1, ' procentpoint')}`
          : '',
    });
  }
  const input = selected.input;
  const notes: string[] = [];
  if (input.tilstand === 'Standard')
    notes.push(
      'Standard regnes med referencematerialet, φᵥ = 37°, og berøres ikke af φᵥ-afrundingen.',
    );
  else {
    const phiA = selected.result.phi,
      phiB = baseline.result.phi;
    rows.push(
      {
        label: `φᵥ for den indtastede opbygning${input.phi_manuel != null ? ' (manuel)' : ''}`,
        selected: `${dk(phiA, 2)}°${Math.abs(phiA - selected.weighted) >= 0.005 ? ` (beregnet ${dk(selected.weighted, 2)}°)` : ''}`,
        standard: `${dk(phiB, 2)}°`,
        difference: signed(phiA - phiB, 2, '°'),
      },
      {
        label: 'kφ for den indtastede opbygning',
        selected: `${dk(K_PHI * (phiA - PHI_BASIS) * 100, 2)} %`,
        standard: `${dk(K_PHI * (phiB - PHI_BASIS) * 100, 2)} %`,
        difference: signed(K_PHI * (phiA - phiB) * 100, 2, ' procentpoint'),
      },
    );
    if (lagfordelingOf(data.indstillinger.lagfordeling).phi_regel !== 'indtastet')
      notes.push(
        'Efter valget i afsnit 5 kan de enkelte opbygninger regnes med en anden φᵥ end den indtastede opbygnings. Tykkelserne i tabellen følger resultatkortene.',
      );
  }
  if (AFRUNDINGSVALG.every((key) => chosen[key] === defaults[key]))
    notes.push('De valgte indstillinger svarer til standardindstillingerne.');
  const basis =
    input.grundlag.type === 'trafikklasse'
      ? `trafikklasse ${input.grundlag.t_klasse}`
      : `belastningsklasse ${input.grundlag.klasse}`;
  return {
    context: `${input.tilstand} · ${basis} · Eᵤ = ${pythonFixed(input.eu, 0, true).replaceAll(',', '.')} MPa · ${selected.result.geonet_navn}`,
    rows,
    notes,
  };
}

/** Eksemplet, der vises uden et gyldigt dimensioneringsresultat. */
export function roundingExample(trin_mm: number, vis_eksakt: boolean): string {
  const rounded = rund_op(532, trin_mm);
  return er_oprundet(rounded, 532)
    ? `Eksempel: en beregnet lagtykkelse på 532 mm angives som ${rounded} mm${vis_eksakt ? ' (532 mm)' : ''}.`
    : 'Eksempel: en beregnet lagtykkelse på 532 mm angives uændret.';
}
