import { eoSteps, exampleCell } from '../engine/table-explanation';
import { pythonFixed } from '../engine/python-numbers';
import { koersler_fra_raekker, type RunRow } from '../engine/editing';
import type { BasisTable } from '../engine/types';

export function CorrelationExample({ rows, table }: { rows: RunRow[]; table: BasisTable }) {
  const runs = koersler_fra_raekker(rows);
  const cell = exampleCell(runs, table);
  if (!cell) return null;
  const [traffic, eu] = cell;
  const steps = eoSteps(traffic, eu, runs, table);
  if (!steps || steps.trin2.eo_aekv === undefined) return null;
  const { trin1: a, trin2: b } = steps;
  const mm = (n: number) => pythonFixed(n, 0, true).replaceAll(',', '.');
  const dk = (n: number, places: number) =>
    pythonFixed(n, places).replace('.', ',').replace('-', '−');
  return (
    <aside className="correlation-example" aria-label="Regneeksempel">
      <h3>Eksempel på udregning af ækvivalent Eₒ-værdi i tabellen</h3>
      <p className="section-meta">
        Eksempel · {traffic} ved Eᵤ = {eu} MN/m²
      </p>
      <ol>
        <li>
          <p>
            {a.direkte && a.sg != null
              ? 'SG + BL fra kørslen'
              : `interpoleret i log(Eᵤ) mellem ${a.lav} og ${a.hoej} MPa`}
          </p>
          <div className="formula">
            t_ubundet = {a.direkte && a.sg != null ? `${mm(a.sg)} + ${mm(a.bl!)} = ` : ''}
            {mm(a.ubundet_mm)} mm
          </div>
        </li>
        <li>
          <p>Tykkelsen findes mellem to ustabiliserede kurver</p>
          <div className="formula">
            Eₒ = {dk(b.eo_lav!, 0)} MPa → {mm(b.t_lav!)} mm
            <br />
            Eₒ = {dk(b.eo_hoej!, 0)} MPa → {mm(b.t_hoej!)} mm
          </div>
        </li>
        <li>
          <p>Interpolation mellem de to kurver</p>
          <div className="formula">
            f = ({mm(a.ubundet_mm)} − {mm(b.t_lav!)}) / ({mm(b.t_hoej!)} − {mm(b.t_lav!)}) ={' '}
            {dk(b.frac!, 2)}
            <br />
            Eₒ,ækv = {dk(b.eo_lav!, 0)} + {dk(b.frac!, 2)} × ({dk(b.eo_hoej!, 0)} −{' '}
            {dk(b.eo_lav!, 0)}) = {dk(b.eo_aekv!, 1)}
          </div>
        </li>
      </ol>
      <p>
        Cellen viser <b>{dk(b.eo_aekv!, 0)}</b>{' '}
        <span className="section-meta">afrundet fra {dk(b.eo_aekv!, 1)} MPa</span>
      </p>
    </aside>
  );
}
