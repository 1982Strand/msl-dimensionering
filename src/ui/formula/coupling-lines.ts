/** B-074: »Sådan er resultatet beregnet« med kortere note ved »samlet reduktion«, så sumtabellen
 * ikke skal rulles. Motorens tekst er uændret; kun visningen afkorter noten. */
import type { CouplingNode } from '../../engine/kobling-explanation.ts';

export const REDUCTION_NOTE = 'basisreduktion + net-korrektion + φᵥ-korrektion';
export const REDUCTION_NOTE_SHORT = 'sum af leddene ovenfor';

export function couplingFormulaNodes(nodes: CouplingNode[]): CouplingNode[] {
  return nodes.map((n) =>
    typeof n === 'string'
      ? n
      : n.className === 'kob-svag'
        ? {
            ...n,
            children: n.children.map((c) =>
              typeof c === 'string'
                ? c.replace(`(${REDUCTION_NOTE})`, `(${REDUCTION_NOTE_SHORT})`)
                : c,
            ),
          }
        : { ...n, children: couplingFormulaNodes(n.children) },
  );
}
