import type { Data, Layout } from 'plotly.js';
import type { PersonalDiagramSpec } from '../engine/personal-diagram';

const loadedFonts = new Map<string, Promise<void>>();

/** Vector export from the same Plotly specification, without mutating screen data. */
export async function personalDiagramSvg(
  spec: PersonalDiagramSpec,
  options: {
    width?: number;
    height?: number;
    fontFamily?: string;
    fontUrl?: string;
  } = {},
): Promise<string> {
  const { default: Plotly } = await import('plotly.js-basic-dist-min');
  const { width = 1000, height = 380, fontFamily, fontUrl } = options;
  if (fontFamily && fontUrl) {
    const key = `${fontFamily}:${fontUrl}`;
    if (!loadedFonts.has(key))
      loadedFonts.set(
        key,
        (async () => {
          const face = await new FontFace(fontFamily, `url(${JSON.stringify(fontUrl)})`).load();
          document.fonts.add(face);
        })().catch((error) => {
          loadedFonts.delete(key);
          throw error;
        }),
      );
    await loadedFonts.get(key);
    await document.fonts.load(`11px ${JSON.stringify(fontFamily)}`);
  }
  const node = document.createElement('div');
  Object.assign(node.style, {
    position: 'fixed',
    left: '-10000px',
    width: `${width}px`,
    height: `${height}px`,
  });
  document.body.append(node);
  try {
    const copy = structuredClone(spec);
    if (fontFamily) copy.layout.font = { ...(copy.layout.font as object), family: fontFamily };
    await Plotly.newPlot(node, copy.data as Data[], copy.layout as Partial<Layout>, {
      displayModeBar: false,
    });
    const url = await Plotly.toImage(node, { format: 'svg', width, height });
    const comma = url.indexOf(',');
    if (!url.startsWith('data:image/svg+xml') || comma < 0)
      throw new Error('Diagrammet kunne ikke eksporteres som SVG.');
    return url.slice(0, comma).includes(';base64')
      ? atob(url.slice(comma + 1))
      : decodeURIComponent(url.slice(comma + 1));
  } finally {
    Plotly.purge(node);
    node.remove();
  }
}
