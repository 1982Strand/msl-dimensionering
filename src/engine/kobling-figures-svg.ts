/** Standalone variant 4 SVG. No DOM, font measurements or browser dependencies. */
import { TEMA, type DiagramPair } from './personal-diagram-svg.ts';
import type { CouplingFigureModel } from './kobling-figures.ts';

export const COUPLING_SVG_SIZE = { width: 480, height: 340 } as const;
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );

export function couplingSvgScales(
  m: CouplingFigureModel,
  size: { width: number; height: number } = COUPLING_SVG_SIZE,
) {
  if (
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width < 240 ||
    size.height < 200
  )
    throw new Error('M1-figurens SVG-mål er ugyldige.');
  const pl = { x0: 54, x1: size.width - 16, y0: 16, y1: size.height - 46 };
  const fraction = (v: number, axis: CouplingFigureModel['x']) =>
    ((axis.log ? Math.log(v) : v) - axis.range[0]) / (axis.range[1] - axis.range[0]);
  return {
    pl,
    sx: (v: number) => pl.x0 + fraction(v, m.x) * (pl.x1 - pl.x0),
    sy: (v: number) => pl.y1 - fraction(v, m.y) * (pl.y1 - pl.y0),
  };
}

export function renderCouplingFigureSvg(
  m: CouplingFigureModel,
  options: {
    idPrefix?: string;
    fontFamily?: string;
    width?: number;
    height?: number;
  } = {},
): string {
  const size = {
    width: options.width ?? COUPLING_SVG_SIZE.width,
    height: options.height ?? COUPLING_SVG_SIZE.height,
  };
  const { pl, sx, sy } = couplingSvgScales(m, size);
  const clip = `${(options.idPrefix ?? 'kobling').replace(/[^A-Za-z0-9_-]/g, '')}-plot`;
  const n = (v: number) => {
    if (!Number.isFinite(v)) throw new Error('M1-figurens SVG-koordinat er ugyldig.');
    return +v.toFixed(2);
  };
  const path = (pts: DiagramPair[]) =>
    pts.map(([x, y], i) => `${i ? 'L' : 'M'}${n(sx(x))} ${n(sy(y))}`).join('');
  const text = (x: number, y: number, s: string, extra = '', color: string = TEMA.tekst2) =>
    `<text x="${n(x)}" y="${n(y)}" font-size="11" fill="${color}" ${extra}>${esc(s)}</text>`;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size.width} ${size.height}" width="${size.width}" height="${size.height}" font-family="${esc(options.fontFamily ?? TEMA.skrift)}" role="img" aria-label="${esc(m.title)}">`,
    `<rect width="${size.width}" height="${size.height}" fill="${TEMA.flade}"/>`,
    `<defs><clipPath id="${clip}"><rect x="${pl.x0}" y="${pl.y0}" width="${pl.x1 - pl.x0}" height="${pl.y1 - pl.y0}"/></clipPath></defs>`,
  ];
  for (const tick of m.x.ticks) {
    const x = n(sx(tick.value));
    out.push(
      `<line x1="${x}" y1="${pl.y0}" x2="${x}" y2="${pl.y1}" stroke="${TEMA.gitter}" stroke-width="1"/>`,
      text(x, pl.y1 + 17, tick.label, 'text-anchor="middle"'),
    );
  }
  for (const tick of m.y.ticks) {
    const y = n(sy(tick.value));
    out.push(
      `<line x1="${pl.x0}" y1="${y}" x2="${pl.x1}" y2="${y}" stroke="${TEMA.gitter}" stroke-width="1"/>`,
      text(pl.x0 - 8, y + 4, tick.label, 'text-anchor="end"'),
    );
  }
  out.push(
    `<path d="M${pl.x0} ${pl.y0}V${pl.y1}H${pl.x1}" fill="none" stroke="${TEMA.akse}"/>`,
    text(
      (pl.x0 + pl.x1) / 2,
      size.height - 8,
      m.x.title,
      'data-axis-title="x" text-anchor="middle"',
    ),
    `<text data-axis-title="y" transform="translate(15 ${(pl.y0 + pl.y1) / 2}) rotate(-90)" text-anchor="middle" font-size="11" fill="${TEMA.tekst2}">${esc(m.y.title)}</text>`,
    `<g clip-path="url(#${clip})">`,
  );
  for (const [i, c] of m.curves.entries()) {
    if (c.points.length < 2) continue;
    out.push(
      `<path data-curve="${i}" data-name="${esc(c.name)}" d="${path(c.points)}" fill="none" stroke="${TEMA.serie[c.role]}" stroke-width="${c.dashed ? 1.2 : 2}"${c.dashed ? ' stroke-dasharray="4 3"' : ''} stroke-linecap="round" stroke-linejoin="round"/>`,
    );
    if (c.dots)
      for (const [j, [x, y]] of c.points.entries())
        out.push(
          `<circle data-run="${j}" cx="${n(sx(x))}" cy="${n(sy(y))}" r="3.2" fill="${TEMA.serie[c.role]}"/>`,
        );
  }
  for (const g of m.guides)
    out.push(
      `<path d="${path([g.from, g.to])}" fill="none" stroke="${TEMA.serie[g.role]}" stroke-width="1" stroke-dasharray="3 3"/>`,
    );
  for (const [i, p] of m.points.entries())
    out.push(
      `<circle data-point="${i}" data-name="${esc(p.name)}" cx="${n(sx(p.x))}" cy="${n(sy(p.y))}" r="${p.hollow ? 4.5 : 5}" fill="${p.hollow ? TEMA.flade : TEMA.serie[p.role]}" stroke="${p.hollow ? TEMA.serie[p.role] : TEMA.flade}" stroke-width="2"/>`,
    );
  out.push('</g>');
  for (const l of m.labels)
    out.push(
      text(
        Math.min(pl.x1 - 6, Math.max(pl.x0 + 6, sx(l.at[0]) + l.side * 6)),
        sy(l.at[1]) - 7,
        l.text,
        `text-anchor="${l.side < 0 ? 'end' : 'start'}"`,
        TEMA.serie[l.role],
      ),
    );

  // Same signature box as M5; entries retain the original's text and point/ring semantics.
  const row = 18,
    pad = 9,
    key = 20;
  const bw = Math.min(
    pl.x1 - pl.x0 - 16,
    2 * pad + key + 6 + Math.max(0, ...m.legend.map((e) => e.text.length)) * 5.5,
  );
  const bx = pl.x1 - 8 - bw,
    by = pl.y0 + 8;
  if (m.legend.length)
    out.push(
      `<g data-legend="true"><rect x="${n(bx)}" y="${by}" width="${n(bw)}" height="${2 * pad + m.legend.length * row - 4}" rx="6" fill="${TEMA.flade}" fill-opacity="0.9" stroke="${TEMA.akse}"/>`,
    );
  for (const [i, e] of m.legend.entries()) {
    const ly = by + pad + i * row + 6.5;
    out.push(
      `<circle cx="${n(bx + pad + key / 2)}" cy="${ly}" r="4" fill="${e.hollow ? TEMA.flade : TEMA.serie[e.role]}" stroke="${TEMA.serie[e.role]}" stroke-width="1.5"/>`,
      text(bx + pad + key + 6, ly + 4, e.text, '', TEMA.tekst),
    );
  }
  if (m.legend.length) out.push('</g>');
  out.push('</svg>');
  return out.join('');
}
