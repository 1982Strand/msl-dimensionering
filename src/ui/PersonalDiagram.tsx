import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Data, Layout } from 'plotly.js';
import { byg_designdiagram, personalDiagramInput } from '../engine/personal-diagram';
import type { DimensioningResult } from '../engine/construction';
import type { ProductRow } from '../engine/products';
import type { BasisTable } from '../engine/types';
import { pythonFixed } from '../engine/python-numbers';

export function PersonalDiagram({
  result,
  products,
  table,
  showInput,
  showEndpoints,
  onChange,
}: {
  result: DimensioningResult;
  products: { one: ProductRow[]; two: ProductRow[] };
  table?: BasisTable | null;
  showInput: boolean;
  showEndpoints: boolean;
  onChange: (key: string, value: boolean) => void;
}) {
  const id = useId(),
    ref = useRef<HTMLDivElement>(null);
  const renderQueue = useRef(Promise.resolve());
  const [failure, setFailure] = useState<string | null>(null);
  const args = useMemo(
    () => personalDiagramInput(result, products, table ?? undefined, showInput, showEndpoints),
    [result, products, table, showInput, showEndpoints],
  );
  useEffect(() => {
    const node = ref.current;
    return () => {
      if (node)
        void renderQueue.current.then(async () => {
          const { default: Plotly } = await import('plotly.js-basic-dist-min');
          Plotly.purge(node);
        });
    };
  }, []);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let closed = false,
      observer: ResizeObserver | undefined;
    let clearFailed = () => {};
    setFailure(null);
    renderQueue.current = renderQueue.current
      .then(async () => {
        const { default: Plotly } = await import('plotly.js-basic-dist-min');
        if (closed) return;
        clearFailed = () => Plotly.purge(node);
        const spec = byg_designdiagram(args);
        await Plotly.react(node, spec.data as Data[], spec.layout as Partial<Layout>, {
          displayModeBar: false,
          responsive: true,
        });
        if (closed) return;
        observer = new ResizeObserver(() => {
          void Promise.resolve(Plotly.Plots.resize(node)).catch(() => {});
        });
        observer.observe(node);
      })
      .catch((error: unknown) => {
        if (!closed) {
          clearFailed();
          setFailure(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      closed = true;
      observer?.disconnect();
    };
  }, [args]);
  const custom = result.tilstand === 'Brugerdefineret';
  const basis =
    result.grundlag_type === 'trafikklasse'
      ? `Trafikklasse ${result.t_klasse}`
      : `Belastningsklasse ${result.valgt_klasse}`;
  return (
    <section className="section-card settings-card" aria-labelledby={`${id}-heading`}>
      <div className="construction-heading">
        <h2 id={`${id}-heading`}>Designdiagram</h2>
      </div>
      <p className="settings-note">
        Eₒ = {pythonFixed(result.eo, 0)} MPa · {basis}
        {custom ? ` · φᵥ = ${pythonFixed(result.phi, 1).replace('.', ',')}°` : ''} ·{' '}
        {result.geonet_navn}
      </p>
      {custom && (
        <div className="flex flex-wrap gap-5 mb-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInput}
              disabled={!result.materialer.length}
              onChange={(e) => onChange('bd_dd_vis_din_prik', e.target.checked)}
            />
            Vis indtastet opbygning
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showEndpoints}
              onChange={(e) => onChange('bd_dd_vis_lag_prikker', e.target.checked)}
            />
            Vis endepunkter for 1 og 2 lag geonet
          </label>
        </div>
      )}
      {failure && (
        <p role="alert" className="warning-banner">
          Kunne ikke generere designdiagram: {failure}
        </p>
      )}
      <div
        ref={ref}
        style={{ height: 380, width: '100%' }}
        role="img"
        aria-label="Personligt designdiagram"
      />
    </section>
  );
}
