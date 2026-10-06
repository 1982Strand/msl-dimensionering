/** B-076/B-080: adgang i de delte udgaver. Azure Static Web Apps (B-075) oplyser brugerens roller
 * på `/.auth/me`. Cloudflare-udgaven er åben uden login (B-080) og har ingen admin: firmaprofilen
 * redigeres kun lokalt eller af `admin` i Azure. Lokalt findes adressen ikke, og alt er åbent.
 * Låsen hindrer ændringer ved et uheld; den er ikke en sikkerhedsgrænse, da alt kører i browseren. */
import { useEffect, useState } from 'react';

export interface Access {
  /** En delt udgave (Azure eller Cloudflare); lokalt `false`. */
  shared: boolean;
  /** Admin må redigere firmaprofilen. */
  admin: boolean;
}

// De delte udgaver bygges med VITE_UDGAVE=delt og er låst, indtil adgangen er hentet.
const sharedBuild = import.meta.env.VITE_UDGAVE === 'delt';
let pending: Promise<Access | null> | null = null;

/** JSON fra samme oprindelse, eller `null` (fx 404 eller appens forside i stedet for JSON). */
async function json(path: string): Promise<unknown> {
  try {
    const r = await fetch(path, { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
const record = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : null;

export async function readAccess(): Promise<Access | null> {
  // Azure: { clientPrincipal: { userRoles: [...] } | null }.
  const azure = record(await json('/.auth/me'));
  if (azure && 'clientPrincipal' in azure) {
    const roles = record(azure.clientPrincipal)?.userRoles;
    return { shared: true, admin: Array.isArray(roles) && roles.includes('admin') };
  }
  return null;
}

export function useAccess(): Access {
  const [access, setAccess] = useState<Access>({ shared: sharedBuild, admin: false });
  useEffect(() => {
    let closed = false;
    void (pending ??= readAccess()).then((loaded) => {
      if (!closed && loaded) setAccess(loaded);
    });
    return () => {
      closed = true;
    };
  }, []);
  return access;
}

export const canEditProfile = (access: Access) => !access.shared || access.admin;
