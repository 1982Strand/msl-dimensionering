/** B-073: »Genstart app« i sidemenuens bund. Vises kun, når appen kører fra den lokale startfil;
 * serveren bygger da den aktuelle version, og siden genindlæses i samme fane. */
import { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { Button } from '../components/ui/button';

type Status = { nyVersion: boolean };

export function RestartApp() {
  const [status, setStatus] = useState<Status | null>(null);
  const [state, setState] = useState<'klar' | 'genstarter' | 'fejl'>('klar');
  useEffect(() => {
    let closed = false;
    // Statussen hentes ved start og når vinduet får fokus igen, fx efter en ny version på main.
    const check = () =>
      fetch('/__app/status', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((s: { lokal?: boolean; nyVersion?: boolean } | null) => {
          if (!closed && s?.lokal) setStatus({ nyVersion: Boolean(s.nyVersion) });
        })
        .catch(() => {});
    void check();
    window.addEventListener('focus', check);
    return () => {
      closed = true;
      window.removeEventListener('focus', check);
    };
  }, []);
  if (!status) return null;
  const restart = async () => {
    setState('genstarter');
    try {
      const r = await fetch('/__app/genstart', { method: 'POST' });
      const body = (await r.json().catch(() => ({}))) as { ok?: boolean; fejl?: string };
      if (!r.ok || !body.ok) throw new Error(body.fejl || `HTTP ${r.status}`);
      location.reload();
    } catch (error) {
      console.error('Genstart app mislykkedes:', error);
      setState('fejl');
    }
  };
  const busy = state === 'genstarter';
  return (
    <div className="app-restart">
      <Button variant="outline" size="sm" onClick={() => void restart()} disabled={busy}>
        <RotateCw aria-hidden="true" className={busy ? 'animate-spin' : undefined} />
        {busy ? 'Genstarter …' : 'Genstart app'}
      </Button>
      {status.nyVersion && !busy && <span className="app-restart-new">Ny version klar</span>}
      {state === 'fejl' && (
        <span role="alert" className="app-restart-error">
          Genstart mislykkedes. Se serverens vindue.
        </span>
      )}
    </div>
  );
}
