/** Den delte udgave bruger standardfirmaprofilen; lokalt kan profilen redigeres.
 * Dette er en visningsindstilling, ikke en sikkerhedsgrænse eller en hostingafhængighed. */

export interface Access {
  shared: boolean;
}

const access: Access = { shared: import.meta.env.VITE_UDGAVE === 'delt' };

export function useAccess(): Access {
  return access;
}

export const canEditProfile = (access: Access) => !access.shared;
