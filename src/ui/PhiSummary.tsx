import { phiSummary } from '../engine/phi-summary';
import type { DimensioningInput } from '../engine/dimensionering';
import { Notice } from './Notice';
import { FormulaBlock } from './formula/FormulaBlock';
import { formulaHtmlNodes } from './formula/layout';

export function PhiSummary({ input }: { input: DimensioningInput }) {
  const summary = phiSummary(input);
  if (!summary.visible) return null;
  return (
    <aside className="phi-summary" aria-label="φᵥ-korrektion">
      <h3>φᵥ-korrektion</h3>
      <div className="phi-summary-block">
        <h4>Vægtet friktionsvinkel</h4>
        <FormulaBlock nodes={[summary.code!]} />
      </div>
      <div className="phi-summary-block">
        <h4>φᵥ-korrektionsfaktor</h4>
        <FormulaBlock nodes={formulaHtmlNodes(summary.factor_html!)} />
      </div>
      <Notice>Korrektionen anvendes på basistykkelsen.</Notice>
    </aside>
  );
}
