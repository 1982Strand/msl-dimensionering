import { useId, useMemo } from 'react';
import { constructionData, type DimensioningResult } from '../engine/construction';
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
  // B-074: på skærmen er blokkene bredere, så materialenavne som »Stabilgrus SGII 0-32« står på
  // én linje. Rapportens tegning (R6) bruger standardmålene.
  const svg = useMemo(
    () => constructionSvg(data, id, { blokbredde: 148, navnebredde: 20 }),
    [data, id],
  );
  return (
    <section className="section-card construction-card" aria-labelledby={`${id}-heading`}>
      <div className="construction-heading">
        <h2 id={`${id}-heading`}>Opbygning</h2>
      </div>
      <p className="figure-note">
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
      {/* B-074: placeringsbeskederne står i statuslinjens kort over resultatet (B-066). */}
    </section>
  );
}
