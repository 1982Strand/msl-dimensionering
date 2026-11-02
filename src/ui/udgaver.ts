import { INDBYGGET_OPSAETNING } from './udgave-opsaetning.ts';

/** Hvad hver udgave må (beslutning 2. november 2026). Uden VITE_UDGAVE bygges den lokale
 * administratorudgave. Dette er en visningsindstilling, ikke en sikkerhedsgrænse. */

export type Udgave = 'lokal' | 'intern' | 'offentlig';

export interface Access {
  udgave: Udgave;
  /** Rapportsiden. */
  rapport: boolean;
  /** Firmaprofilen kan ses og redigeres. */
  firmaprofil: boolean;
  /** Medarbejderkartoteket: eget i browseren, den indbyggede liste eller intet. */
  kartotek: 'eget' | 'indbygget' | 'intet';
  /** Designdiagrammer, trafikklasse-korrelation og geonet-database kan rettes. */
  redigerOpslag: boolean;
  /** Materialer kan rettes. */
  redigerMaterialer: boolean;
  /** Alle indstillinger eller kun visningsindstillingerne. */
  indstillinger: 'alle' | 'visning';
  /** Gem og indlæs af enkelte designdiagrammer som fil. */
  diagramfiler: boolean;
}

export const ACCESS: Record<Udgave, Access> = {
  lokal: {
    udgave: 'lokal',
    rapport: true,
    firmaprofil: true,
    kartotek: 'eget',
    redigerOpslag: true,
    redigerMaterialer: true,
    indstillinger: 'alle',
    diagramfiler: true,
  },
  intern: {
    udgave: 'intern',
    rapport: true,
    firmaprofil: false,
    kartotek: 'indbygget',
    redigerOpslag: true,
    redigerMaterialer: true,
    indstillinger: 'alle',
    diagramfiler: true,
  },
  offentlig: {
    udgave: 'offentlig',
    rapport: INDBYGGET_OPSAETNING.funktioner.rapport,
    firmaprofil: false,
    kartotek: 'intet',
    redigerOpslag: INDBYGGET_OPSAETNING.funktioner.redigerOpslag,
    redigerMaterialer: INDBYGGET_OPSAETNING.funktioner.redigerMaterialer,
    indstillinger: 'visning',
    diagramfiler: INDBYGGET_OPSAETNING.funktioner.diagramfiler,
  },
};

/** Ukendte og manglende værdier giver den lokale udgave. */
export function udgaveFra(value: string | undefined): Udgave {
  return value === 'intern' || value === 'offentlig' ? value : 'lokal';
}
