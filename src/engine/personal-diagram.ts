/** Exact port of core.diagram.byg_designdiagram (a330cfd), including hover.
 * Axes intentionally remain cm / MPa irrespective of the construction unit (MPa = MN/m², B-084).
 */
import { slaa_op_interp } from './calculator.ts';
import { T_BASIS_TABLE, K_PHI, PHI_BASIS } from './data.ts';
import { pythonFixed } from './python-numbers.ts';
import template from './personal-diagram-template.json' with { type: 'json' };
import type { BasisTable, Product } from './types.ts';
import type { ProductRow } from './products.ts';
import type { DimensioningResult } from './construction.ts';

type Curve = 'uarmeret' | '1_lag' | '2_lag';
export interface PersonalDiagramInput {
  eu: number;
  eo: number;
  phi: number;
  geonet: Product | null;
  t_indtastet_mm: number | null;
  t_basis_table: BasisTable;
  t_1_lag_mm?: number | null;
  t_2_lag_mm?: number | null;
  t_1_lag_best_mm?: number | null;
  t_2_lag_best_mm?: number | null;
  skala?: number;
  phi_kurver?: Partial<Record<Curve, number | null>> | null;
}
export interface PersonalDiagramSpec {
  data: Record<string, unknown>[];
  layout: Record<string, unknown>;
}
const hover = '%{x:.0f} cm · Eᵤ %{y:.1f} MPa<extra>%{fullData.name}</extra>';
const colors = ['#15211A', '#1F4E9C', '#7B1FA2'];

export function byg_designdiagram(input: PersonalDiagramInput): PersonalDiagramSpec {
  const {
    eu,
    eo,
    phi,
    geonet,
    t_indtastet_mm,
    t_basis_table,
    t_1_lag_mm,
    t_2_lag_mm,
    t_1_lag_best_mm,
    t_2_lag_best_mm,
    skala = 1,
    phi_kurver = {},
  } = input;
  const euValues = Object.keys(t_basis_table)
    .map(Number)
    .sort((a, b) => a - b);
  // Preserve original failure for an empty table rather than invent default curves.
  if (!euValues.length) throw new Error('max() iterable argument is empty');
  const phiCorrection = (curve: Curve) => K_PHI * ((phi_kurver?.[curve] ?? phi) - PHI_BASIS);
  const net = Number(geonet?.korrektion ?? 0);
  const best = geonet?.korrektion_interval?.[0] ?? null;
  const curve = (mode: Curve, factor: number) => {
    const x: number[] = [],
      y: number[] = [];
    for (const value of euValues) {
      const thickness = slaa_op_interp(value, eo, mode, t_basis_table);
      if (thickness !== null) {
        x.push(thickness * factor * skala);
        y.push(value);
      }
    }
    return { x, y };
  };
  const data: Record<string, unknown>[] = [];
  const unreinforced = curve('uarmeret', 1 + phiCorrection('uarmeret'));
  if (unreinforced.x.length)
    data.push({
      ...unreinforced,
      type: 'scatter',
      mode: 'lines',
      name: `Ustabiliseret${Math.abs(skala - 1) > 1e-9 ? ' · VejDims tal' : ''}`,
      line: { color: colors[0], width: 2 },
      hovertemplate: hover,
    });
  for (const [index, mode] of (['1_lag', '2_lag'] as const).entries()) {
    const color = colors[index + 1],
      name = `${index + 1} lag geonet`;
    const conservative = curve(mode, 1 + phiCorrection(mode) + net);
    if (!conservative.x.length) continue;
    if (best !== null) {
      const optimal = curve(mode, 1 + phiCorrection(mode) + best);
      if (
        optimal.x.length &&
        optimal.y.every((v, i) => v === conservative.y[i]) &&
        optimal.y.length === conservative.y.length
      ) {
        data.push({
          x: [...optimal.x, ...conservative.x.toReversed()],
          y: [...optimal.y, ...conservative.y.toReversed()],
          type: 'scatter',
          fill: 'toself',
          fillcolor: color,
          opacity: 0.1,
          line: { width: 0 },
          hoverinfo: 'skip',
          showlegend: false,
        });
        data.push({
          ...optimal,
          type: 'scatter',
          mode: 'lines',
          name: `${name} (optimal)`,
          line: { color, width: 1.2, dash: 'dot' },
          hovertemplate: hover,
        });
      }
    }
    data.push({
      ...conservative,
      type: 'scatter',
      mode: 'lines',
      name,
      line: { color, width: 2 },
      hovertemplate: hover,
    });
  }
  for (const [i, thickness] of [t_1_lag_mm, t_2_lag_mm].entries()) {
    if (thickness)
      data.push({
        x: [thickness / 10],
        y: [eu],
        type: 'scatter',
        mode: 'markers',
        name: `${i + 1} lag geonet`,
        showlegend: false,
        marker: { color: colors[i + 1], size: 9, line: { color: '#FFFFFF', width: 1.5 } },
        hovertemplate: hover,
      });
  }
  for (const [i, thickness] of [t_1_lag_best_mm, t_2_lag_best_mm].entries()) {
    if (thickness)
      data.push({
        x: [thickness / 10],
        y: [eu],
        type: 'scatter',
        mode: 'markers',
        name: `${i + 1} lag geonet (optimal)`,
        showlegend: false,
        marker: { color: 'rgba(0,0,0,0)', size: 10, line: { color: colors[i + 1], width: 2 } },
        hovertemplate: hover,
      });
  }
  const shapes =
    t_indtastet_mm && t_indtastet_mm > 0
      ? [
          {
            type: 'line',
            x0: t_indtastet_mm / 10,
            x1: t_indtastet_mm / 10,
            y0: 0,
            y1: eu,
            line: { color: '#B42318', width: 1, dash: 'dash' },
          },
        ]
      : [];
  if (shapes.length)
    data.push({
      x: [t_indtastet_mm! / 10],
      y: [eu],
      type: 'scatter',
      mode: 'markers',
      name: `Indtastet opbygning (${pythonFixed(t_indtastet_mm! / 10, 0)} cm)`,
      showlegend: true,
      marker: { color: '#B42318', size: 11, line: { color: '#FFFFFF', width: 1.5 } },
      hovertemplate: hover,
    });
  const allX = [...unreinforced.x];
  for (const thickness of [
    t_indtastet_mm,
    t_1_lag_mm,
    t_2_lag_mm,
    t_1_lag_best_mm,
    t_2_lag_best_mm,
  ])
    if (thickness) allX.push(thickness / 10);
  const axis = {
    gridcolor: '#EDEFED',
    zeroline: false,
    linecolor: '#DCE1DD',
    ticks: 'outside',
    tickcolor: '#DCE1DD',
    tickfont: { size: 10 },
  };
  return {
    data,
    layout: {
      template: structuredClone(template),
      ...(shapes.length ? { shapes } : {}),
      height: 380,
      margin: { l: 60, r: 20, t: 10, b: 60 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: {
        family: 'IBM Plex Sans, Segoe UI, system-ui, sans-serif',
        size: 11,
        color: '#15211A',
      },
      hovermode: 'closest',
      legend: {
        orientation: 'v',
        yanchor: 'top',
        y: 0.98,
        xanchor: 'right',
        x: 0.99,
        font: { size: 10 },
        bgcolor: 'rgba(255,255,255,0.85)',
        bordercolor: '#DCE1DD',
        borderwidth: 1,
      },
      xaxis: {
        ...axis,
        title: { text: 'Bærelagstykkelse [cm]' },
        range: [0, Math.max(allX.length ? Math.max(...allX) * 1.08 : 160, 80)],
      },
      yaxis: {
        ...axis,
        title: { text: 'Bundmodul Eᵤ [MPa]' },
        range: [0, Math.max(Math.max(...euValues) * 1.05, eu * 1.2, 50)],
      },
    },
  };
}

/** app.py _tegn_designdiagram/_phi_kurver: use interval-enriched products,
 * and preserve the original coupling between endpoint visibility and phi curves.
 */
export function personalDiagramInput(
  result: DimensioningResult,
  products: { one: ProductRow[]; two: ProductRow[] },
  table: BasisTable = T_BASIS_TABLE,
  showInput = true,
  showEndpoints = true,
): PersonalDiagramInput {
  const custom = result.tilstand === 'Brugerdefineret';
  const rows = [products.one, products.two].map((rows) =>
    custom && !showEndpoints
      ? null
      : (rows.find((p) => p.navn === result.geonet_navn && !p.fejl) ?? null),
  );
  let phiCurves: PersonalDiagramInput['phi_kurver'] = null;
  if (rows.some((r) => r?.phi_regel)) {
    phiCurves = {};
    const unreinforced = rows.find((r) => r?.phi_uarmeret != null)?.phi_uarmeret;
    if (unreinforced != null) phiCurves.uarmeret = unreinforced;
    rows.forEach((r, i) => {
      if (r?.phi != null) phiCurves![i === 0 ? '1_lag' : '2_lag'] = r.phi;
    });
  }
  return {
    eu: result.eu,
    eo: result.eo,
    phi: result.phi,
    geonet: result.geonet,
    t_basis_table: table,
    t_indtastet_mm:
      custom && showInput
        ? result.materialer.reduce((total, r) => total + (r.tykkelse_mm ?? 0), 0)
        : null,
    t_1_lag_mm: rows[0]?.t_armeret_eksakt_mm ?? rows[0]?.t_armeret_mm ?? null,
    t_2_lag_mm: rows[1]?.t_armeret_eksakt_mm ?? rows[1]?.t_armeret_mm ?? null,
    t_1_lag_best_mm: rows[0]?.t_armeret_eksakt_mm_min ?? rows[0]?.t_armeret_mm_min ?? null,
    t_2_lag_best_mm: rows[1]?.t_armeret_eksakt_mm_min ?? rows[1]?.t_armeret_mm_min ?? null,
    skala: result.skala,
    phi_kurver: phiCurves,
  };
}
