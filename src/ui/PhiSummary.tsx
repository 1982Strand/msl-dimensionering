import { phiSummary } from '../engine/phi-summary';
import type { DimensioningInput } from '../engine/dimensionering';
import { Notice } from './Notice';

export function PhiSummary({ input }: { input: DimensioningInput }) {
  const summary = phiSummary(input);
  if (!summary.visible) return null;
  return (
    <aside className="phi-summary" aria-label="φᵥ-korrektion">
      <h3>φᵥ-korrektion</h3>
      <div className="phi-summary-block">
        <h4>Vægtet friktionsvinkel</h4>
        <pre>{summary.code}</pre>
      </div>
      <div className="phi-summary-block">
        <h4>φᵥ-korrektionsfaktor</h4>
        <div dangerouslySetInnerHTML={{ __html: summary.factor_html! }} />
      </div>
      <Notice>Korrektionen anvendes på basistykkelsen.</Notice>
    </aside>
  );
}
