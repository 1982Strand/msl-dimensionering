/** Udgaven vælges ved bygningen med VITE_UDGAVE; tabellen står i udgaver.ts.
 * Dette er en visningsindstilling, ikke en sikkerhedsgrænse eller en hostingafhængighed. */
import { ACCESS, udgaveFra, type Access } from './udgaver';

export type { Access, Udgave } from './udgaver';

const access = ACCESS[udgaveFra(import.meta.env.VITE_UDGAVE)];

export function useAccess(): Access {
  return access;
}

export const canEditProfile = (access: Access) => access.firmaprofil;
