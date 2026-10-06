import { useId, useMemo } from 'react';
import { rawDiagram } from '../engine/table-presentation';
import { rawDiagramModel } from '../engine/raw-diagram-svg';
import { dk, renderPersonalDiagramSvg } from '../engine/personal-diagram-svg';
import type { DesignDiagram } from '../engine/editing';
import { DiagramCanvas, type DiagramTooltipFormat } from './DiagramCanvas';
import { Notice } from './Notice';

// Kolonnen er ca. 400 px bred; tegningen vises derfor næsten i fuld størrelse med originalens højde.
const SIZE = { width: 420, height: 290 } as const;
const TITLE = 'Optegnet af tabellens værdier';
const tooltipFormat: DiagramTooltipFormat = {
  xText: (x) => `${dk(x, 1)} cm`,
  euText: (y) => `Eᵤ ${dk(y)} MPa`,
};

/** Udkast: fælles SVG- og hoverstil; aktive tabelændringer slår straks igennem. */
export function RawChart({ diagram }: { diagram: DesignDiagram }) {
  const id = useId();
  const uid = `raw-diagram-${id.replace(/[^A-Za-z0-9_-]/g, '')}`;
  const chart = useMemo(() => {
    const spec = rawDiagram(diagram);
    if (!spec) return null;
    // B-083: enheden vises som MPa (= MN/m²); originalens diagramopsætning er uændret.
    const model = { ...rawDiagramModel(spec), yTitel: 'Bundmodul Eᵤ [MPa]' };
    return {
      model,
      svg: renderPersonalDiagramSvg(model, {
        ...SIZE,
        markers: true,
        idPrefix: uid,
        ariaLabel: TITLE,
      }),
    };
  }, [diagram, uid]);
  return (
    <div className="raw-chart">
      {chart ? (
        <DiagramCanvas
          m={chart.model}
          svg={chart.svg}
          uid={uid}
          size={SIZE}
          tooltipFormat={tooltipFormat}
          ariaLabel={`${TITLE}. Brug piletasterne for at aflæse punkter på kurverne.`}
          flipAt={0.45}
        />
      ) : (
        <Notice kind="warning" className="message warning">
          Diagrammet kan ikke optegnes, da tabellen ikke indeholder aflæste værdier.
        </Notice>
      )}
    </div>
  );
}
