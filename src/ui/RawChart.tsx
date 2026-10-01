import { useEffect, useRef, useState } from 'react';
import type { Data, Layout } from 'plotly.js';
import { rawDiagram } from '../engine/table-presentation';
import type { DesignDiagram } from '../engine/editing';
import { Notice } from './Notice';
export function RawChart({ diagram }: { diagram: DesignDiagram }) {
  const ref = useRef<HTMLDivElement>(null),
    [failed, setFailed] = useState(false);
  const empty = !diagram.rows.some((r) =>
    [r.t_uarmeret_cm, r.t_1_lag_cm, r.t_2_lag_cm].some((v) => v != null),
  );
  useEffect(() => {
    const node = ref.current;
    if (!node || empty) return;
    let closed = false;
    let cleanup = () => {};
    import('plotly.js-basic-dist-min')
      .then(async ({ default: Plotly }) => {
        if (closed) return;
        const spec = rawDiagram(diagram)!;
        await Plotly.react(node, spec.data as Data[], spec.layout as Partial<Layout>, {
          displayModeBar: false,
          responsive: true,
        });
        if (closed) {
          Plotly.purge(node);
          return;
        }
        const observer = new ResizeObserver(() => {
          void Promise.resolve(Plotly.Plots.resize(node)).catch(() => {});
        });
        observer.observe(node);
        cleanup = () => {
          observer.disconnect();
          Plotly.purge(node);
        };
      })
      .catch(() => {
        if (!closed) setFailed(true);
      });
    return () => {
      closed = true;
      cleanup();
    };
  }, [diagram, empty]);
  if (empty)
    return (
      <Notice kind="warning" className="message warning">
        Diagrammet kan ikke optegnes, da tabellen ikke indeholder aflæste værdier.
      </Notice>
    );
  if (failed) return <p role="alert">Diagrammet kunne ikke vises. Tabelværdierne er bevaret.</p>;
  return (
    <div ref={ref} className="raw-chart" role="img" aria-label="Optegnet af tabellens værdier" />
  );
}
