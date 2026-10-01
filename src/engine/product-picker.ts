/** B-054: præsentation af den eksisterende valgliste, uden ændret produktvalg. */
import { GEONET_DB, format_klasse_interval } from './data.ts';
import schema from './dimensioning-ui.json' with { type: 'json' };
import {
  trafikklasser_for_belastningsklasser,
  format_trafikklasse_interval,
} from './correlation.ts';
import type { BasisTable } from './types.ts';
import type { TrafficRuns } from './traffic.ts';

export interface ProductPickerContext {
  selectedClass: number | null;
  selectedTraffic?: string | null;
  trafficEu?: number | null;
  runs?: TrafficRuns | null;
  table?: BasisTable | null;
  rules?: unknown;
}
export interface ProductPickerItem {
  name: string;
  series: string;
  recommended: boolean;
  badges: { text: string; tone: 'green' | 'yellow' | 'neutral' }[];
  searchText: string;
}
export interface ProductPickerGroup {
  series: string;
  items: ProductPickerItem[];
}

export function productPicker(
  names: string[],
  context: ProductPickerContext,
): ProductPickerGroup[] {
  const groups: ProductPickerGroup[] = [];
  for (const name of names) {
    const product = GEONET_DB.find((p) => p.navn === name);
    const label =
      schema.fields.find((f) => f.key === 'std_geonet')?.options?.find((o) => o.value === name)
        ?.label ?? name;
    const classes = product?.klasser ?? [];
    const traffic =
      context.trafficEu == null
        ? null
        : trafikklasser_for_belastningsklasser(
            classes,
            context.trafficEu,
            context.runs,
            context.table,
            context.rules,
          );
    const recommended =
      traffic === null
        ? context.selectedClass === null || classes.includes(context.selectedClass)
        : traffic.includes(context.selectedTraffic ?? '');
    const classText =
      traffic === null
        ? `Belastningsklasse ${format_klasse_interval(classes).replaceAll('-', '–')}`
        : `Trafikklasse ${format_trafikklasse_interval(traffic).replaceAll('-', '–')}`;
    const badges: ProductPickerItem['badges'] = [
      { text: classText, tone: recommended ? 'green' : 'yellow' },
    ];
    // Bevar originalens fortegn, herunder forskellen på '-' og '−'.
    const correction = label.match(/Net-korrektion: ([+−-]?\d+ %)/)?.[1];
    const optimal = label.match(/opt\. ([+−-]?\d+ %)/)?.[1];
    if (correction) badges.push({ text: `Net-korrektion ${correction}`, tone: 'neutral' });
    if (optimal) badges.push({ text: `Optimalt ${optimal}`, tone: 'neutral' });
    if (label.includes('· Referencenet')) badges.push({ text: 'Referencenet', tone: 'neutral' });
    const series = product?.serie ?? '';
    let group = groups.find((g) => g.series === series);
    if (!group) {
      group = { series, items: [] };
      groups.push(group);
    }
    group.items.push({
      name,
      series,
      recommended,
      badges,
      searchText:
        `${name} ${series} ${classText} ${traffic?.join(' ') ?? classes.join(' ')}`.toLocaleLowerCase(
          'da',
        ),
    });
  }
  return groups;
}

export function filterProductPicker(
  groups: ProductPickerGroup[],
  query: string,
  onlyRecommended: boolean,
): ProductPickerGroup[] {
  const terms = query.toLocaleLowerCase('da').trim().split(/\s+/).filter(Boolean);
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (!onlyRecommended || item.recommended) &&
          terms.every((term) => item.searchText.includes(term)),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
