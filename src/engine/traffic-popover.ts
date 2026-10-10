import { defaults } from './data.ts';
import type { DimensioningInput } from './dimensionering.ts';
import { laengde, normaliser } from './enhed.ts';
import { pythonFixed, pythonRound } from './python-numbers.ts';
import { correlationRows } from './table-presentation.ts';
import { trafik_opslag, VEJDIM_KOERSLER } from './traffic.ts';

export interface TrafficPopoverTable {
  type: 'dataframe';
  columns: string[];
  index: string[];
  rows: string[][];
  column_config: Record<string, never>;
  activeRow: number | null;
  activeColumn: number | null;
  // Styler overwrites earlier styles when highlighting the selected row/cell.
  styles: ('plain' | 'boundary' | 'row' | 'cell')[][];
}
export interface TrafficPopoverText {
  type: 'markdown' | 'caption';
  body: string;
}
export interface TrafficPopover {
  label: 'Se korrelationstabel';
  open: false;
  children: [TrafficPopoverText, TrafficPopoverTable, TrafficPopoverText];
}

const introduction =
  '**Hvilken diagramkurve slås der op i?**\n\n' +
  'Trafikklassen har intet eget designdiagram. Tallet er den kurve ' +
  '— Eₒ i MPa — hvis lagtykkelse uden geonet svarer til VejDims ' +
  'krav. Det er et opslagspunkt, ikke et forventet E-modul for opbygningen.';
const zones =
  '**under** / **over** = VejDim kræver en tyndere henholdsvis tykkere ' +
  'opbygning end diagrammets kurver, og beregningen afvises · ' +
  '\\* = uden for kurverne, men inden for tolerancen; der regnes på ' +
  'randkurven · † = uden for tolerancen; der regnes efter valget i ' +
  'Indstillinger, afsnit 8 · tallet i parentes er afvigelsen fra ' +
  'randkurven i procent af dennes tykkelse, + over og − under. Randkurven ' +
  'er Eₒ = 30 (belastningsklasse 1) eller Eₒ = 150 (belastningsklasse 6).';
const mpa = (value: number | null) =>
  value === null ? '—' : `${pythonFixed(value, 0, true).replaceAll(',', '.')} MPa`;

export function trafficPopover(input: DimensioningInput): TrafficPopover | null {
  if (input.grundlag.type !== 'trafikklasse') return null;
  const traffic = input.grundlag.t_klasse;
  const eu = input.eu;
  const runs = input.koersler ?? VEJDIM_KOERSLER;
  const rules = input.indstillinger?.yderomraade;
  const unit = normaliser(
    (input.indstillinger as { opbygning?: { enhed?: string } } | undefined)?.opbygning?.enhed,
  );
  const length = (value: number | null) => laengde(value, unit);
  // Adapt the active runs to the existing pivot renderer, including legacy numeric cells.
  const runRows = Object.entries(runs).flatMap(([T, values]) =>
    Object.entries(values).map(([e, cell]) => ({
      T,
      eu: Number(e),
      t_SG_mm: typeof cell === 'number' ? cell : cell.sg || 0,
      t_BL_mm: typeof cell === 'number' ? 0 : cell.bl || 0,
    })),
  );
  const pivot = correlationRows(runRows, input.t_basis_table, rules);
  const points = [...new Set(defaults.VEJDIM_KOERSLER_STANDARD_RAEKKER.map((r) => r.eu))].sort(
    (a, b) => a - b,
  );
  const columns = points.map((e) => `Eᵤ ${e}`);
  const index = pivot.map((r) => String(r.Trafikklasse));
  const rows = pivot.map((r) => columns.map((c) => String(r[c])));
  const rounded = pythonRound(eu);
  // Original's precise tabulated-point test; this is not a comparison tolerance.
  const column = Math.abs(eu - rounded) < 1e-9 ? points.indexOf(rounded) : -1;
  const row = index.indexOf(traffic);
  const table: TrafficPopoverTable = {
    type: 'dataframe',
    columns,
    index,
    rows,
    column_config: {},
    activeRow: row < 0 ? null : row,
    activeColumn: column < 0 ? null : column,
    styles: rows.map((cells, r) =>
      cells.map((text, c) =>
        r === row ? (c === column ? 'cell' : 'row') : /[*†]/.test(text) ? 'boundary' : 'plain',
      ),
    ),
  };
  const lookup = trafik_opslag(traffic, eu, runs, input.t_basis_table, rules);
  const ub = lookup.t_vejdim_mm;
  const prefix = `**${traffic} ved Eᵤ = ${mpa(eu)}:** VejDim kræver ${length(ub)} ubundet, `;
  let note = 'Den markerede celle er den, dimensioneringen slår op i.';
  if (ub !== null) {
    if (lookup.zone === 'ok') note = prefix + `hvilket svarer til kurven Eₒ = ${mpa(lookup.eo)}.`;
    else if (['under', 'over'].includes(lookup.zone)) {
      const over = lookup.zone === 'over';
      note =
        prefix +
        `${pythonFixed(lookup.afvigelse_pct!, 1).replace('.', ',').replace('-', '−')} % ` +
        (over ? 'over diagrammets øverste kurve.' : 'under diagrammets laveste kurve.');
      if (lookup.eo === null) note += ' Beregningen afvises efter Indstillinger, afsnit 8.';
      else if (lookup.handling === 'vejdim')
        note += ` Den ustabiliserede tykkelse er ${over ? 'løftet' : 'sat ned'} til VejDims ${length(ub)}; geonettets reduktion er aflæst på kurven Eₒ = ${mpa(lookup.eo_rand)}.`;
      else if (lookup.handling === 'laveste')
        note += ` Der regnes med diagrammets laveste kurve, Eₒ = ${mpa(lookup.eo_rand)}, på ${length(lookup.t_rand_mm)}.`;
    } else note = prefix + 'hvilket falder uden for diagrammernes område.';
  }
  if (column < 0)
    note += ' Eᵤ ligger mellem tabellens punkter, og værdien interpoleres mellem nabokolonnerne.';
  return {
    label: 'Se korrelationstabel',
    open: false,
    children: [
      { type: 'markdown', body: introduction },
      table,
      {
        type: 'caption',
        body: `${note} ${zones} Se *Trafikklasse-korrelation* i menuen for metode og datagrundlag.`,
      },
    ],
  };
}
