/** B-034/B-035: neutral model og ren SVG fra den godkendte variant 4-demo. */
import type { PersonalDiagramSpec } from './personal-diagram.ts';

export const TEMA = {
  flade: '#ffffff',
  tekst: '#263a32',
  tekst2: '#65736d',
  gitter: '#edf0ec',
  akse: '#dce3dd',
  skrift: "'Segoe UI', Carlito, system-ui, sans-serif",
  serie: {
    ustab: '#263a32',
    lag1: '#2a78d6',
    lag2: '#7b1fa2',
    ind: '#b42318',
    neutral: '#65736d',
    // M1-figurerne: brugerens Eᵤ som originalens kørselsfigur (grøn) og Eᵤ-hjælpelinjen som originalens diagramfigur (grå).
    bruger: '#1b6b34',
    hjaelp: '#9aa39c',
  },
} as const;

export type DiagramRole = keyof typeof TEMA.serie;
export type DiagramPair = [number, number];
export interface DiagramCurve {
  navn: string;
  rolle: DiagramRole;
  optimal: boolean;
  pts: DiagramPair[];
}
export interface DiagramPoint {
  navn: string;
  rolle: DiagramRole;
  x: number;
  y: number;
  hul: boolean;
  iForklaring: boolean;
}
export interface PersonalDiagramModel {
  x: DiagramPair;
  y: DiagramPair;
  xTitel: string;
  yTitel: string;
  linjer: DiagramCurve[];
  baand: { rolle: DiagramRole; pts: DiagramPair[] }[];
  punkter: DiagramPoint[];
  lodret: { x: number; y0: number; y1: number }[];
}

function rolle(navn: string): DiagramRole {
  if (/Ustabil/.test(navn)) return 'ustab';
  if (/1 lag/.test(navn)) return 'lag1';
  if (/2 lag/.test(navn)) return 'lag2';
  if (/Indtastet/.test(navn)) return 'ind';
  return 'neutral';
}
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
const navn = (value: unknown) => (typeof value === 'string' ? value : '');
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
function par(t: Record<string, unknown>): DiagramPair[] {
  const xs = Array.isArray(t.x) ? t.x : [],
    ys = Array.isArray(t.y) ? t.y : [];
  return xs.flatMap((x, i) => (finite(x) && finite(ys[i]) ? [[x, ys[i]] as DiagramPair] : []));
}
function range(value: unknown): DiagramPair {
  if (!Array.isArray(value) || !finite(value[0]) || !finite(value[1]) || value[1] <= value[0])
    throw new Error('Designdiagrammets akseinterval er ugyldigt.');
  return [value[0], value[1]];
}

export function diagramModel(spec: PersonalDiagramSpec): PersonalDiagramModel {
  const linjer: DiagramCurve[] = [],
    baand: PersonalDiagramModel['baand'] = [],
    punkter: DiagramPoint[] = [];
  const farveTilRolle = new Map<unknown, DiagramRole>();
  for (const t of spec.data) {
    if (t.mode !== 'lines') continue;
    const r = rolle(navn(t.name));
    const color = record(t.line).color;
    if (typeof color === 'string') farveTilRolle.set(color, r);
    linjer.push({
      navn: navn(t.name),
      rolle: r,
      optimal: /optimal/.test(navn(t.name)),
      pts: par(t),
    });
  }
  for (const t of spec.data) {
    if (t.fill === 'toself')
      baand.push({ rolle: farveTilRolle.get(t.fillcolor) ?? 'neutral', pts: par(t) });
    else if (t.mode === 'markers') {
      for (const [x, y] of par(t))
        punkter.push({
          navn: navn(t.name),
          rolle: rolle(navn(t.name)),
          x,
          y,
          hul: record(t.marker).color === 'rgba(0,0,0,0)',
          iForklaring: t.showlegend === true,
        });
    }
  }
  const L = spec.layout,
    xaxis = record(L.xaxis),
    yaxis = record(L.yaxis);
  const shapes = Array.isArray(L.shapes) ? L.shapes : [];
  const lodret = shapes.flatMap((value) => {
    const s = record(value);
    return s.type === 'line' && finite(s.x0) && finite(s.y0) && finite(s.y1)
      ? [{ x: s.x0, y0: s.y0, y1: s.y1 }]
      : [];
  });
  return {
    x: range(xaxis.range),
    y: range(yaxis.range),
    xTitel: navn(record(xaxis.title).text),
    yTitel: navn(record(yaxis.title).text),
    linjer,
    baand,
    punkter,
    lodret,
  };
}

export const dk = (v: number, d = 0) => v.toFixed(d).replace('.', ',');
export function inddeling(min: number, max: number, maal = 6): number[] {
  const raa = (max - min) / maal;
  if (!Number.isFinite(raa) || raa <= 0) return [];
  const p = 10 ** Math.floor(Math.log10(raa));
  const trin = [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => raa <= k)!;
  const ud: number[] = [];
  for (let v = Math.ceil(min / trin) * trin; v <= max + 1e-9; v += trin) ud.push(+v.toFixed(6));
  return ud;
}
export function forklaring(m: PersonalDiagramModel) {
  return [
    ...m.linjer.map((l) => ({ navn: l.navn, rolle: l.rolle, type: l.optimal ? 'prik' : 'linje' })),
    ...m.punkter
      .filter((p) => p.iForklaring)
      .map((p) => ({ navn: p.navn, rolle: p.rolle, type: 'punkt' })),
  ];
}

export const SVG_SIZE = { width: 680, height: 400 } as const;
export interface DiagramSize {
  width: number;
  height: number;
}
export interface DiagramSvgOptions {
  width?: number;
  height?: number;
  fontFamily?: string;
  /** Unikt præfiks til SVG-id'er, når flere diagrammer vises på samme side. */
  idPrefix?: string;
  /** Rådiagrammets billedtekst; M5 beholder sin godkendte standard. */
  ariaLabel?: string;
  /** Vis tabellens datapunkter som små prikker på kurverne. */
  markers?: boolean;
}
export function svgScales(m: PersonalDiagramModel, size: DiagramSize = SVG_SIZE) {
  if (!finite(size.width) || !finite(size.height) || size.width <= 76 || size.height <= 64)
    throw new Error('Designdiagrammets SVG-mål er ugyldige.');
  const pl = { x0: 58, x1: size.width - 18, y0: 18, y1: size.height - 46 };
  // En råtabel kan indeholde udelukkende nuller. Bevar dens interval og undgå 0/0.
  const xSpan = m.x[1] - m.x[0] || 1;
  const ySpan = m.y[1] - m.y[0] || 1;
  const sx = (x: number) => pl.x0 + ((x - m.x[0]) / xSpan) * (pl.x1 - pl.x0);
  const sy = (y: number) => pl.y1 - ((y - m.y[0]) / ySpan) * (pl.y1 - pl.y0);
  const iy = (py: number) => m.y[0] + ((pl.y1 - py) / (pl.y1 - pl.y0)) * (m.y[1] - m.y[0]);
  return { pl, sx, sy, iy };
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );

export function renderPersonalDiagramSvg(
  m: PersonalDiagramModel,
  options: DiagramSvgOptions = {},
): string {
  const tema = { ...TEMA, skrift: options.fontFamily ?? TEMA.skrift };
  const clipId = `${(options.idPrefix ?? 'personal-diagram').replace(/[^A-Za-z0-9_-]/g, '')}-plot`;
  const maal = { b: options.width ?? SVG_SIZE.width, h: options.height ?? SVG_SIZE.height };
  const { pl, sx, sy } = svgScales(m, { width: maal.b, height: maal.h });
  const f = tema.serie;
  const tal = (v: number) => +v.toFixed(2);
  const sti = (pts: DiagramPair[]) =>
    pts.map(([x, y], i) => `${i ? 'L' : 'M'}${tal(sx(x))} ${tal(sy(y))}`).join('');
  const ud: string[] = [];
  ud.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maal.b} ${maal.h}" width="${maal.b}" height="${maal.h}" font-family="${esc(tema.skrift)}" role="img" aria-label="${esc(options.ariaLabel ?? 'Personligt designdiagram')}">`,
  );
  ud.push(`<rect width="${maal.b}" height="${maal.h}" fill="${tema.flade}"/>`);
  ud.push(
    `<defs><clipPath id="${clipId}"><rect x="${pl.x0}" y="${pl.y0}" width="${pl.x1 - pl.x0}" height="${pl.y1 - pl.y0}"/></clipPath></defs>`,
  );

  // Gitter og akser: hårfine, recessive.
  for (const v of inddeling(m.x[0], m.x[1], 8)) {
    const x = tal(sx(v));
    ud.push(
      `<line x1="${x}" y1="${pl.y0}" x2="${x}" y2="${pl.y1}" stroke="${tema.gitter}" stroke-width="1"/>`,
    );
    ud.push(
      `<text x="${x}" y="${pl.y1 + 16}" font-size="11" fill="${tema.tekst2}" text-anchor="middle">${String(v).replace('.', ',')}</text>`,
    );
  }
  for (const v of inddeling(m.y[0], m.y[1], 5)) {
    const y = tal(sy(v));
    ud.push(
      `<line x1="${pl.x0}" y1="${y}" x2="${pl.x1}" y2="${y}" stroke="${tema.gitter}" stroke-width="1"/>`,
    );
    ud.push(
      `<text x="${pl.x0 - 8}" y="${y + 4}" font-size="11" fill="${tema.tekst2}" text-anchor="end">${String(v).replace('.', ',')}</text>`,
    );
  }
  ud.push(
    `<line x1="${pl.x0}" y1="${pl.y1}" x2="${pl.x1}" y2="${pl.y1}" stroke="${tema.akse}" stroke-width="1"/>`,
  );
  ud.push(
    `<text data-axis-title="x" x="${(pl.x0 + pl.x1) / 2}" y="${maal.h - 8}" font-size="12" fill="${tema.tekst2}" text-anchor="middle">${esc(m.xTitel)}</text>`,
  );
  ud.push(
    `<text data-axis-title="y" transform="translate(16 ${(pl.y0 + pl.y1) / 2}) rotate(-90)" font-size="12" fill="${tema.tekst2}" text-anchor="middle">${esc(m.yTitel)}</text>`,
  );

  // Data: bånd (10 % vask) under kurverne, derefter kurver og punkter.
  ud.push(`<g clip-path="url(#${clipId})">`);
  for (const [i, b] of m.baand.entries())
    ud.push(
      `<path data-band="${i}" d="${sti(b.pts)}${b.pts.length ? 'Z' : ''}" fill="${f[b.rolle]}" fill-opacity="0.1"/>`,
    );
  for (const [i, l] of m.linjer.entries()) {
    const streg = l.optimal ? `stroke-width="2" stroke-dasharray="0.1 4.5"` : `stroke-width="2"`;
    ud.push(
      `<path data-curve="${i}" data-name="${esc(l.navn)}" d="${sti(l.pts)}" fill="none" stroke="${f[l.rolle]}" ${streg} stroke-linecap="round" stroke-linejoin="round"/>`,
    );
    if (options.markers)
      l.pts.forEach(([x, y], j) =>
        ud.push(
          `<circle data-curve-marker="${i}" data-index="${j}" cx="${tal(sx(x))}" cy="${tal(sy(y))}" r="2.5" fill="${f[l.rolle]}"/>`,
        ),
      );
  }
  for (const s of m.lodret) {
    ud.push(
      `<line x1="${tal(sx(s.x))}" y1="${tal(sy(s.y0))}" x2="${tal(sx(s.x))}" y2="${tal(sy(s.y1))}" stroke="${f.ind}" stroke-width="1.5" stroke-dasharray="4 3"/>`,
    );
  }
  ud.push(`</g>`);
  for (const [i, p] of m.punkter.entries()) {
    const fyld = p.hul ? tema.flade : f[p.rolle];
    const kant = p.hul
      ? `stroke="${f[p.rolle]}" stroke-width="2"`
      : `stroke="${tema.flade}" stroke-width="2"`;
    ud.push(
      `<circle data-point="${i}" data-name="${esc(p.navn)}" cx="${tal(sx(p.x))}" cy="${tal(sy(p.y))}" r="${p.hul ? 4.5 : 5}" fill="${fyld}" ${kant}/>`,
    );
  }

  // Signaturforklaring som boks øverst til højre i plotområdet, som i originalen (variant 1).
  // Stregnøgler og tekst i tekstfarven; boksen er let gennemsigtig, så gitteret anes bagved.
  const poster = forklaring(m);
  const raekke = 17,
    pad = 9,
    noegle = 20,
    fs = 11;
  const bB = pad * 2 + noegle + 6 + Math.max(0, ...poster.map((e) => e.navn.length)) * fs * 0.5;
  const bH = pad * 2 + poster.length * raekke - 4;
  const bx = pl.x1 - 8 - bB,
    by = pl.y0 + 8;
  if (poster.length)
    ud.push(
      `<g data-legend="true"><rect x="${tal(bx)}" y="${by}" width="${tal(bB)}" height="${bH}" rx="6" fill="${tema.flade}" fill-opacity="0.9" stroke="${tema.akse}" stroke-width="1"/>`,
    );
  poster.forEach((e, i) => {
    const ly = by + pad + i * raekke + 6.5;
    const lx = bx + pad;
    const farve = f[e.rolle];
    if (e.type === 'punkt')
      ud.push(
        `<circle cx="${tal(lx + noegle / 2)}" cy="${ly}" r="4.5" fill="${farve}" stroke="${tema.flade}" stroke-width="2"/>`,
      );
    else
      ud.push(
        `<line x1="${tal(lx)}" y1="${ly}" x2="${tal(lx + noegle)}" y2="${ly}" stroke="${farve}" stroke-width="2" stroke-linecap="round"${e.type === 'prik' ? ' stroke-dasharray="0.1 4.5"' : ''}/>`,
      );
    ud.push(
      `<text x="${tal(lx + noegle + 6)}" y="${ly + 4}" font-size="${fs}" fill="${tema.tekst}">${esc(e.navn)}</text>`,
    );
  });
  if (poster.length) ud.push('</g>');
  ud.push('</svg>');
  return ud.join('');
}
