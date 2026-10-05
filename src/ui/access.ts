/** B-076: adgang i den delte udgave i Azure Static Web Apps (B-075). Azure oplyser den indloggede
 * brugers roller på `/.auth/me`; lokalt findes adressen ikke, og alt er åbent som hidtil.
 * Låsen hindrer ændringer ved et uheld; den er ikke en sikkerhedsgrænse, da alt kører i browseren. */
import { useEffect, useState } from 'react';

export interface Access {
  /** Den delte udgave (Azure); lokalt `false`. */
  shared: boolean;
  /** Rollen »admin« må redigere firmaprofilen. */
  admin: boolean;
}

// Azure-bygningen sættes med VITE_UDGAVE=delt og er låst, indtil rollerne er hentet.
const sharedBuild = import.meta.env.VITE_UDGAVE === 'delt';
let pending: Promise<Access | null> | null = null;

function loadAccess() {
  pending ??= fetch('/.auth/me', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((me: { clientPrincipal?: { userRoles?: string[] } | null } | null) =>
      me && typeof me === 'object' && 'clientPrincipal' in me
        ? { shared: true, admin: (me.clientPrincipal?.userRoles ?? []).includes('admin') }
        : null,
    )
    .catch(() => null);
  return pending;
}

export function useAccess(): Access {
  const [access, setAccess] = useState<Access>({ shared: sharedBuild, admin: false });
  useEffect(() => {
    let closed = false;
    void loadAccess().then((loaded) => {
      if (!closed && loaded) setAccess(loaded);
    });
    return () => {
      closed = true;
    };
  }, []);
  return access;
}

export const canEditProfile = (access: Access) => !access.shared || access.admin;
