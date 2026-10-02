/** B-070: regneeksemplets formler som linjer til den fælles formelvisning. Tekst og tal er de samme som før. */
import { pythonFixed } from '../engine/python-numbers.ts';
import type { eoSteps } from '../engine/table-explanation.ts';

type Steps = NonNullable<ReturnType<typeof eoSteps>>;
export const exampleMm = (n: number) => pythonFixed(n, 0, true).replaceAll(',', '.');
export const exampleDk = (n: number, places: number) =>
  pythonFixed(n, places).replace('.', ',').replace('-', '−');

/** Én tekst pr. trin; linjeskift adskiller ligningerne i samme trin. */
export function correlationExampleLines({ trin1: a, trin2: b }: Steps): [string, string, string] {
  const mm = exampleMm,
    dk = exampleDk;
  return [
    `t_ubundet = ${a.direkte && a.sg != null ? `${mm(a.sg)} + ${mm(a.bl!)} = ` : ''}${mm(a.ubundet_mm)} mm`,
    `Eₒ = ${dk(b.eo_lav!, 0)} MPa → ${mm(b.t_lav!)} mm\nEₒ = ${dk(b.eo_hoej!, 0)} MPa → ${mm(b.t_hoej!)} mm`,
    `f = (${mm(a.ubundet_mm)} − ${mm(b.t_lav!)}) / (${mm(b.t_hoej!)} − ${mm(b.t_lav!)}) = ${dk(b.frac!, 2)}\n` +
      `Eₒ,ækv = ${dk(b.eo_lav!, 0)} + ${dk(b.frac!, 2)} × (${dk(b.eo_hoej!, 0)} − ${dk(b.eo_lav!, 0)}) = ${dk(b.eo_aekv!, 1)}`,
  ];
}
