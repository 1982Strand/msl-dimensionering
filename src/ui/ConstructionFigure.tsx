import { useId, useMemo } from 'react';
import {
  constructionData,
  constructionWarnings,
  type DimensioningResult,
} from '../engine/construction';
import { constructionSvg } from '../engine/construction-svg';
import type { ProductRow } from '../engine/products';
import { laengde } from '../engine/enhed';

export function ConstructionFigure({
  result,
  products,
  display,
  netplacering,
}: {
  result: DimensioningResult;
  products: { one: ProductRow[]; two: ProductRow[] };
  display: unknown;
  netplacering: string;
}) {
  const id = useId();
  const data = useMemo(
    () => constructionData(result, products, display, netplacering),
    [result, products, display, netplacering],
  );
  const svg = useMemo(() => constructionSvg(data, id), [data, id]);
  const warnings = constructionWarnings(data, result, netplacering);
  return (
    <section className="section-card construction-card" aria-labelledby={`${id}-heading`}>
      <div className="construction-heading">
        <h2 id={`${id}-heading`}>Opbygning</h2>
      </div>
      <p className="settings-note">
        Snit i samme lodrette skala
        {data.reference_mm
          ? ` · stiplet linje = indtastet ${laengde(data.reference_mm, data.enhed)}`
          : 'standard_opdeling' in result && result.standard_opdeling.spec
            ? ' · stabilgrus og bundsikring viser en typisk opbygning; beregningen er ført med referencematerialet φ = 37°'
            : ' · uden materialelag vises kravet som ét ubundet lag'}
        .
      </p>
      <div
        className="construction-scroll"
        tabIndex={0}
        role="region"
        aria-label="Opbygningsfigurer, vandret rulning på små skærme"
      >
        <div
          className="construction-drawing"
          style={{ minWidth: data.kolonner.length * 280 }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      {warnings.map((w) => (
        <p
          className={w.recommendation ? 'info-banner' : 'warning-banner'}
          key={`${w.lag}-${w.message}`}
        >
          {w.lag} lag geonet: {w.message}
        </p>
      ))}
    </section>
  );
}
