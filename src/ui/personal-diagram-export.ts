import type { PersonalDiagramSpec } from '../engine/personal-diagram.ts';
import {
  diagramModel,
  renderPersonalDiagramSvg,
  type DiagramSvgOptions,
} from '../engine/personal-diagram-svg.ts';

/** Samme SVG som på skærmen, uden DOM, tekstmåling eller Plotly. */
export function personalDiagramSvg(
  spec: PersonalDiagramSpec,
  options: DiagramSvgOptions = {},
): string {
  return renderPersonalDiagramSvg(diagramModel(spec), options);
}
