import { defaults } from './data.ts';
import { koersler_fra_raekker, type RunRow } from './editing.ts';
import { korrelation_opslag } from './correlation.ts';
import { pythonFixed } from './python-numbers.ts';
import type { BasisTable } from './types.ts';

/** Original _yder_omfang and _yder_afvigelsestabel, applied to active data. */
export function outsideDetails(
  rows: RunRow[],
  table: BasisTable | null = null,
  rules: unknown = null,
) {
  const lookup = korrelation_opslag(koersler_fra_raekker(rows), table, rules);
  const classes = Object.keys(defaults.TRAFIKKLASSER);
  const points = [...new Set(defaults.VEJDIM_KOERSLER_STANDARD_RAEKKER.map((r) => r.eu))].sort(
    (a, b) => a - b,
  );
  const dk = (n: number) => pythonFixed(n, 1).replace('.', ',').replace('-', '−');
  const scope = (zone: string, inside: boolean) => {
    const values = classes
      .flatMap((t) =>
        points.flatMap((eu) => {
          const c = lookup[t]?.[eu];
          return c &&
            'afvigelse_pct' in c &&
            c.zone === zone &&
            c.afvigelse_pct !== null &&
            Boolean(c.inden_tolerance) === inside
            ? [c.afvigelse_pct]
            : [];
        }),
      )
      .sort((a, b) => a - b);
    const prefix = inside ? 'Inden for tolerancen' : 'Uden for tolerancen';
    if (!values.length) return `${prefix}: ingen af de kørte punkter.`;
    if (values.length === 1) return `${prefix}: 1 kørt punkt, ${dk(values[0])} %.`;
    const range =
      values[0] === values.at(-1)
        ? `${dk(values[0])} %`
        : `${dk(values[0])}–${dk(values.at(-1)!)} %`;
    return `${prefix}: ${values.length} kørte punkter, ${range}.`;
  };
  const cells = Object.fromEntries(
    classes.map((t) => [
      t,
      Object.fromEntries(
        points.map((eu) => {
          const c = lookup[t]?.[eu];
          if (
            !c ||
            !('afvigelse_pct' in c) ||
            c.afvigelse_pct === null ||
            !['under', 'over'].includes(c.zone)
          )
            return [`Eᵤ ${eu}`, ''];
          const signed = (c.zone === 'under' ? -1 : 1) * c.afvigelse_pct;
          const percent = `${signed >= 0 ? '+' : ''}${dk(signed)} %`;
          const action =
            c.eo === null
              ? 'afvist'
              : (c.handling === 'laveste' ? 'laveste kurve' : 'VejDim') +
                (c.inden_tolerance ? '*' : '†');
          return [`Eᵤ ${eu}`, `${percent} · ${action}`];
        }),
      ),
    ]),
  );
  return {
    captions: [
      scope('over', true),
      scope('over', false),
      scope('under', true),
      scope('under', false),
    ],
    cells,
  };
}
