/** Hjælpens kontekst pr. udgave (beslutning 2. november 2026): i lokal og intern kan alle
 * indstillinger vælges, og teksten beskriver appens standard; i den offentlige udgave er
 * alle indstillinger uden for opsætningens kan_aendres faste. */
import { standard_indstillinger } from '../engine/editing.ts';
import { HJAELP_INDSTILLINGSNOEGLER, type HjaelpKontekst } from '../engine/hjaelp.ts';
import { INDBYGGET_OPSAETNING, indlaesOpsaetning } from './udgave-opsaetning.ts';
import type { Access } from './udgaver.ts';

export function hjaelpKontekst(access: Access, opsaetning = INDBYGGET_OPSAETNING): HjaelpKontekst {
  if (access.udgave !== 'offentlig')
    return {
      faste: new Set(),
      vaerdier: standard_indstillinger() as Record<string, unknown>,
      funktioner: { rapport: true, redigerOpslag: true, diagramfiler: true },
    };
  return {
    faste: new Set(
      HJAELP_INDSTILLINGSNOEGLER.filter((key) => !opsaetning.kan_aendres.includes(key)),
    ),
    vaerdier: indlaesOpsaetning(opsaetning) as Record<string, unknown>,
    funktioner: {
      rapport: access.rapport,
      redigerOpslag: access.redigerOpslag,
      diagramfiler: access.diagramfiler,
    },
  };
}
