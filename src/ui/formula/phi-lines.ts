/** B-072: φᵥ-boksenes regnestykker samlet efter brugerens ønske. Motorens tekst (M6) er uændret;
 * kun linjeskift og noten om afrunding til nærmeste hele grad fjernes i visningen. */
import type { CouplingNode } from '../../engine/kobling-explanation.ts';

const NEAREST = 'afrunding til nærmeste hele grad';

/** Vægtet friktionsvinkel på én linje. En anden afrundingsnote (nedrunding) bevares som dæmpet note,
 * fordi »≈« alene ikke fortæller, at der er rundet ned. */
export function weightedPhiNodes(code: string): CouplingNode[] {
  const line = code
    .split('\n')
    .map((part) => part.trim())
    .join(' ');
  const note = line.match(/ \(([^()]*)\)$/);
  if (!note) return [line];
  const main = line.slice(0, note.index);
  return note[1] === NEAREST
    ? [main]
    : [main, { tag: 'span', className: 'kob-svag', children: [` (${note[1]})`] }];
}

/** Korrektionsfaktoren på to linjer: anden linje sættes efter første; sidste linje står for sig. */
export function factorPhiNodes(nodes: CouplingNode[]): CouplingNode[] {
  let joined = false;
  return nodes.map((n) => {
    if (joined || typeof n !== 'string' || !/\n\s*=/.test(n)) return n;
    joined = true;
    return n.replace(/\n\s*=/, ' =');
  });
}
