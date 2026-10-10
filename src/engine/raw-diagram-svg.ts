/** Udkast: råtabellens punkter i M5's SVG-model, uden ændringer af rawDiagram. */
import type { rawDiagram } from './table-presentation.ts';
import type { DiagramRole, PersonalDiagramModel } from './personal-diagram-svg.ts';

export function rawDiagramModel(
  spec: NonNullable<ReturnType<typeof rawDiagram>>,
): PersonalDiagramModel {
  return {
    x: [spec.layout.xaxis.range[0], spec.layout.xaxis.range[1]],
    y: [spec.layout.yaxis.range[0], spec.layout.yaxis.range[1]],
    xTitel: spec.layout.xaxis.title.text,
    yTitel: spec.layout.yaxis.title.text,
    linjer: spec.data.map((trace) => {
      const rolle: DiagramRole = /Ustabil/.test(trace.name)
        ? 'ustab'
        : /1 lag/.test(trace.name)
          ? 'lag1'
          : /2 lag/.test(trace.name)
            ? 'lag2'
            : 'neutral';
      return {
        navn: trace.name,
        rolle,
        optimal: false,
        pts: trace.x.map((x, i) => [x, trace.y[i]]),
      };
    }),
    baand: [],
    punkter: [],
    lodret: [],
  };
}
