/** Standalone SVG renderer shared by the screen and future report export. */
import type { Construction } from './construction.ts';
import { laengde } from './enhed.ts';

const palette = {
  baerelag: '#D9DDD9',
  bundsikring: '#EDEFED',
  earth: '#8B7355',
  ink: '#15211A',
  muted: '#7A857D',
  net: '#B42318',
  green: '#1B6B34',
  warning: '#A8600B',
};
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
function wrap(text: string, limit: number): string[] {
  return text.split('\n').flatMap((paragraph) => {
    const lines: string[] = [];
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (lines.length && lines.at(-1)!.length + word.length + 1 <= limit)
        lines[lines.length - 1] += ` ${word}`;
      else lines.push(word);
    }
    return lines;
  });
}
export function constructionSvg(data: Construction, id = 'construction'): string {
  const prefix = id.replace(/[^a-zA-Z0-9_-]/g, '');
  const maximum = Math.max(
    data.reference_mm || 0,
    ...data.kolonner.flatMap((c) => [c.total_mm || 0, c.best_case_mm || 0]),
  );
  if (!maximum) return '';
  const columnWidth = data.geonet_paaskrift ? 340 : 285,
    width = columnWidth * data.kolonner.length;
  const top = 70,
    body = 275,
    scale = body / maximum,
    base = top + body,
    earth = body * 0.11;
  const statusLines = data.kolonner.map((c) => wrap(c.status[0], 37));
  const statusHeight = Math.max(0, ...statusLines.map((l) => l.length)) * 17;
  const legendY = base + earth + statusHeight + 48;
  const height = data.vis_signatur ? legendY + 62 : base + earth + statusHeight + 35;
  const parts: string[] = [];
  const text = (
    x: number,
    y: number,
    lines: string[],
    size = 12,
    color = palette.ink,
    anchor = 'middle',
    weight = 400,
  ) =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}">${lines.map((line, i) => `<tspan x="${x}" dy="${i ? size * 1.3 : 0}">${escape(line)}${i < lines.length - 1 ? ' ' : ''}</tspan>`).join('')}</text>`;
  const line = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    strokeWidth = 1,
    dash = '',
  ) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  const tooltip = (label: string, bodySvg: string, kind: string) =>
    `<g data-kind="${kind}" tabindex="0" aria-label="${escape(label)}"><title>${escape(label)}</title>${bodySvg}</g>`;
  data.kolonner.forEach((column, i) => {
    const materialLabels: string[] = [];
    const left = i * columnWidth,
      center = left + (data.geonet_paaskrift ? 182 : 125),
      x = center - 62,
      rectWidth = 124;
    const titles = wrap(column.titel, 31);
    parts.push(`<g data-column="${i}" data-total-mm="${column.total_mm ?? ''}">`);
    parts.push(text(center, 24, titles, 13, palette.ink, 'middle', 600));
    if (!column.total_mm) {
      parts.push(
        `<rect x="${x}" y="${top}" width="${rectWidth}" height="${body + earth}" fill="white" stroke="#DCE1DD" stroke-dasharray="3 4"/>`,
      );
      const empty = wrap(column.tom_tekst, 18);
      parts.push(text(center, top + body / 2 - (empty.length - 1) * 8, empty, 12, palette.muted));
    } else {
      parts.push(
        `<rect data-kind="subgrade" x="${x}" y="${base}" width="${rectWidth}" height="${earth}" fill="url(#${prefix}-soil)"/>`,
      );
      if (column.underbund_tekst)
        parts.push(
          text(center, base + earth / 2 + 4, wrap(column.underbund_tekst, 30), 10, '#FFFFFF'),
        );
      let bottom = 0;
      for (const [name, mm, type] of [...column.lag].reverse()) {
        const y = base - (bottom + mm) * scale,
          h = mm * scale;
        const full = wrap(name, 16),
          short = [name.split(/\s+/)[0]];
        let label: string[] = [];
        for (const candidate of [full, short, []]) {
          const lines = [...candidate, laengde(mm, data.enhed)];
          if (h >= lines.length * 15 + 6) {
            label = lines;
            break;
          }
        }
        parts.push(
          tooltip(
            `${name} · ${laengde(mm, data.enhed)}`,
            `<rect data-thickness-mm="${mm}" x="${x}" y="${y}" width="${rectWidth}" height="${h}" fill="${palette[type]}" stroke="${type === 'baerelag' ? '#B9C0BA' : '#C4CAC5'}"/>`,
            'material',
          ),
        );
        materialLabels.push(
          `<g pointer-events="none" stroke="${palette[type]}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${text(center, y + h / 2 - (label.length - 1) * 7.8 + 4, label)}</g>`,
        );
        bottom += mm;
      }
      const yTop = base - column.total_mm * scale,
        measureX = center + 88;
      if (data.vis_maal_streg)
        parts.push(
          `<g data-kind="dimension-line">${line(measureX, yTop, measureX, base, palette.muted)}${line(measureX - 5, yTop, measureX + 5, yTop, palette.muted)}${line(measureX - 5, base, measureX + 5, base, palette.muted)}</g>`,
        );
      if (data.vis_maal_tal)
        parts.push(
          `<g data-kind="dimension-value">${text(measureX + (data.vis_maal_streg ? 9 : 0), (yTop + base) / 2 + 4, [laengde(column.total_mm, data.enhed)], 12, palette.ink, 'start', 500)}</g>`,
        );
      for (const elevation of column.geonet_mm) {
        const y = base - elevation * scale;
        let net = line(x - 8, y, x + rectWidth + 8, y, palette.net, 2.5);
        if (data.geonet_paaskrift) {
          const label = wrap(data.geonet_maerkat || data.geonet_navn, 14);
          net += text(x - 14, y - (label.length - 1) * 6.5 + 3, label, 10, palette.net, 'end');
        }
        parts.push(
          `<g data-elevation-mm="${elevation}">${tooltip(`${data.geonet_navn} · ${laengde(column.total_mm - elevation, data.enhed)} fra overkant`, net, 'geonet')}</g>`,
        );
      }
      if (column.best_case_mm && column.best_case_mm < column.total_mm) {
        const y = base - column.best_case_mm * scale;
        parts.push(
          tooltip(
            column.best_case_note ||
              `Optimal korrektion · ${laengde(column.best_case_mm, data.enhed)}`,
            line(x - 4, y, x + rectWidth + 4, y, palette.green, 1.5, '2 4') +
              `<rect x="${x - 4}" y="${y - 7}" width="${rectWidth + 8}" height="14" fill="transparent"/>`,
            'optimal',
          ),
        );
      }
    }
    if (data.reference_mm) {
      const y = base - data.reference_mm * scale;
      parts.push(
        tooltip(
          `Indtastet niveau · ${laengde(data.reference_mm, data.enhed)}`,
          line(left + 10, y, left + columnWidth - 10, y, '#9AA39C', 1.5, '7 5'),
          'reference',
        ),
      );
    }
    parts.push(...materialLabels);
    const statusColor = {
      neutral: palette.muted,
      gron: palette.green,
      advarsel: palette.warning,
      kritisk: palette.net,
    }[column.status[1]];
    parts.push(text(left + columnWidth / 2, base + earth + 23, statusLines[i], 12, statusColor));
    parts.push('</g>');
  });
  if (data.vis_signatur) {
    const legend: [string, string, string][] = [
      ['Bærelag', palette.baerelag, 'fill'],
      ['Bundsikring', palette.bundsikring, 'fill'],
    ];
    if (data.kolonner.some((c) => c.geonet_mm.length))
      legend.push([data.geonet_navn || 'Geonet', palette.net, '']);
    if (data.kolonner.some((c) => c.best_case_mm && c.total_mm && c.best_case_mm < c.total_mm))
      legend.push(['Optimal korrektion', palette.green, '2 4']);
    if (data.reference_mm) legend.push(['Indtastet niveau', '#9AA39C', '7 5']);
    let x = 20,
      y = legendY;
    parts.push('<g data-kind="legend">');
    for (const [label, color, style] of legend) {
      const size = label.length * 6.4 + 58;
      if (x + size > width - 10) {
        x = 20;
        y += 27;
      }
      parts.push(
        style === 'fill'
          ? `<rect x="${x}" y="${y - 10}" width="22" height="12" fill="${color}" stroke="#B9C0BA"/>`
          : line(x, y - 4, x + 24, y - 4, color, 2, style),
      );
      parts.push(text(x + 32, y, [label], 12, palette.ink, 'start'));
      x += size;
    }
    parts.push('</g>');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="${prefix}-title ${prefix}-description" style="font-family:Arial,Helvetica,sans-serif;background:white"><title id="${prefix}-title">Opbygningssnit · ${escape(data.geonet_navn)}</title><desc id="${prefix}-description">Snittene vises i samme lodrette skala. ${escape(data.kolonner.map((c) => `${c.titel}: ${c.total_mm ? laengde(c.total_mm, data.enhed) : c.tom_tekst}`).join('. '))}</desc><defs><pattern id="${prefix}-soil" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${palette.earth}"/><path d="M-1,1 L1,-1 M0,6 L6,0 M5,7 L7,5" stroke="#6E5A42" stroke-width="1"/></pattern></defs>${parts.join('')}</svg>`;
}
