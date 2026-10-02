/** B-072: φᵥ-boksenes regnestykker samlet efter brugerens ønske. Motorens tekst (M6) er uændret;
 * kun linjeskift og noten om afrundingen fjernes i visningen. */
import type { CouplingNode } from '../../engine/kobling-explanation.ts';

/** Afrundingsnoterne fra motoren, fx »(afrunding til nærmeste hele grad)«. */
export const ROUNDING_NOTE = / \((?:afrunding til nærmeste hele grad|nedrunding til hel grad)\)$/;

/** Vægtet friktionsvinkel på én linje, uden afrundingsnote. */
export function weightedPhiNodes(code: string): CouplingNode[] {
  const line = code
    .split('\n')
    .map((part) => part.trim())
    .join(' ');
  return [line.replace(ROUNDING_NOTE, '')];
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
