/** Indstillinger, afsnit 3: opbygninger for det valgte fordelingsvalg. */
import type { DataState } from './auto-edit.ts';
import { constructionData } from './construction.ts';
import { dimensioner } from './dimensionering.ts';
import { dimensioningInput, dimensioningValues, type FormValues } from './dimensioning-form.ts';
import { resultProducts } from './dimensioning-page.ts';
import { laengde, normaliser as unitOf, tal } from './enhed.ts';
import { pythonFixed } from './python-numbers.ts';

export interface DistributionImpactRow {
  label: string;
  cells: string[];
  empty: boolean;
}
export interface DistributionImpactModel {
  context: string;
  columns: string[];
  rows: DistributionImpactRow[];
  notes: string[];
}

export function distributionImpact(
  values: FormValues,
  data: DataState,
): DistributionImpactModel | null {
  const normalized = dimensioningValues(values, data);
  const standard = normalized.tilstand === 'Standard';
  const calculationValues = standard ? { ...normalized, tilstand: 'Brugerdefineret' } : normalized;
  const input = dimensioningInput(calculationValues, data);
  if (!input.materialer?.length) return null;
  const result = dimensioner(input);
  if (!result) return null;
  const products = resultProducts(input, result);
  const display = data.indstillinger.opbygning;
  const unit = unitOf(display.enhed);
  const construction = constructionData(
    result,
    products,
    display,
    data.indstillinger.lagfordeling.netplacering,
  );
  const materials = input.materialer.slice(0, 3).map((material) => material.navn);
  const rows = construction.kolonner.map((column) => {
    const label = column.titel.startsWith('Indtastet')
      ? 'Indtastet'
      : column.titel.startsWith('Ustabiliseret')
        ? 'Uden geonet'
        : column.titel;
    if (column.total_mm === null) return { label, cells: [column.tom_tekst], empty: true };

    const used = new Set<number>();
    const layerValues = materials.map((name) => {
      const index = column.lag.findIndex(([layerName], i) => layerName === name && !used.has(i));
      if (index < 0) return '–';
      used.add(index);
      return tal(column.lag[index][1], unit);
    });
    return { label, cells: [...layerValues, laengde(column.total_mm, unit)], empty: false };
  });
  const basis =
    input.grundlag.type === 'trafikklasse'
      ? `trafikklasse ${input.grundlag.t_klasse}`
      : `belastningsklasse ${input.grundlag.klasse}`;
  const notes = standard
    ? ['Dimensioneringen står i Standard. Eksemplet viser opbygningen fra Brugerdefineret.']
    : [];
  return {
    context: `Brugerdefineret · ${basis} · Eᵤ = ${pythonFixed(input.eu, 0, true).replaceAll(',', '.')} MPa · ${result.geonet_navn}`,
    columns: [...materials, 'I alt'],
    rows,
    notes,
  };
}
