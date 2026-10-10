import { eoSteps, exampleCell } from '../engine/table-explanation';
import { koersler_fra_raekker, type RunRow } from '../engine/editing';
import type { BasisTable } from '../engine/types';
import { correlationExampleLines, exampleDk } from './correlation-example-lines';
import { FormulaBlock } from './formula/FormulaBlock';

export function CorrelationExample({ rows, table }: { rows: RunRow[]; table: BasisTable }) {
  const runs = koersler_fra_raekker(rows);
  const cell = exampleCell(runs, table);
  if (!cell) return null;
  const [traffic, eu] = cell;
  const steps = eoSteps(traffic, eu, runs, table);
  if (!steps || steps.trin2.eo_aekv === undefined) return null;
  const { trin1: a, trin2: b } = steps;
  const dk = exampleDk;
  const [ubundet, kurver, interpolation] = correlationExampleLines(steps);
  return (
    <aside className="correlation-example" aria-label="Regneeksempel">
      <h3>Eksempel på udregning af ækvivalent Eₒ-værdi i tabellen</h3>
      <p className="section-meta">
        Eksempel · {traffic} ved Eᵤ = {eu} MPa
      </p>
      <ol>
        <li>
          <p>
            {a.direkte && a.sg != null
              ? 'SG + BL fra kørslen'
              : `interpoleret i log(Eᵤ) mellem ${a.lav} og ${a.hoej} MPa`}
          </p>
          <FormulaBlock nodes={[ubundet]} />
        </li>
        <li>
          <p>Tykkelsen findes mellem to ustabiliserede kurver</p>
          <FormulaBlock nodes={[kurver]} />
        </li>
        <li>
          <p>Interpolation mellem de to kurver</p>
          <FormulaBlock nodes={[interpolation]} />
        </li>
      </ol>
      <p>
        Cellen viser <b>{dk(b.eo_aekv!, 0)}</b>{' '}
        <span className="section-meta">afrundet fra {dk(b.eo_aekv!, 1)} MPa</span>
      </p>
    </aside>
  );
}
