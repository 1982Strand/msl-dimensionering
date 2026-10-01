import { useEffect, useRef, useState } from 'react';
import { createCompileQueue, type CompileState } from '../report/compile-queue';
import { loadPdfCompiler } from '../report/compiler';

const main = `#set text(font: "Carlito", size: 12pt, ligatures: false)
#let data = json("data.json")
= PDF-kompilering
#data.title

Eᵤ = 10 MPa · φᵥ = 38,3° · Eₒ,ækv · æøå ÆØÅ

#set text(font: "Liberation Sans")
Eᵤ = 10 MPa · φᵥ = 38,3° · Eₒ,ækv · æøå ÆØÅ

#strong[Lokale skrifter] · #emph[Fire snit pr. familie]
`;

// Midlertidig teknisk testside; erstattes af R4 og er ikke i navigationen.
export function ReportCompileCheck() {
  const [state, setState] = useState<CompileState>({ status: 'idle' });
  const [elapsed, setElapsed] = useState<number | null>(null);
  const queue = useRef<ReturnType<typeof createCompileQueue> | null>(null);
  const started = useRef(0);
  function compile(broken = false) {
    started.current = performance.now();
    setElapsed(null);
    queue.current?.request({
      main: broken ? `${main}#let broken = (` : main,
      files: { '/data.json': JSON.stringify({ title: 'Syntetiske rapportdata fra mapShadow' }) },
    });
  }
  useEffect(() => {
    let active = true;
    const current = createCompileQueue({
      loadCompiler: loadPdfCompiler,
      onState(next) {
        if (!active) return;
        setState(next);
        if (next.status === 'ready' || next.status === 'error')
          setElapsed(Math.round(performance.now() - started.current));
      },
    });
    queue.current = current;
    compile();
    return () => {
      active = false;
      current.dispose();
      queue.current = null;
    };
  }, []);
  const labels = {
    idle: 'Klar til at starte',
    loading: 'Indlæser PDF-motor og lokale skrifter',
    compiling: 'Kompilerer PDF',
    ready: 'PDF klar',
    error: 'Fejl',
  };
  return (
    <main className="page">
      <h1>Rapportkompilering — midlertidig kontrol</h1>
      <p role="status" data-testid="compile-state" data-state={state.status}>
        {labels[state.status]}
      </p>
      {elapsed !== null && (
        <p>
          Kompileringstid: <output data-testid="compile-time">{elapsed}</output> ms (inklusive
          eventuel indlæsning)
        </p>
      )}
      <button type="button" onClick={() => compile()}>
        Kompilér gyldig rapport
      </button>{' '}
      <button type="button" onClick={() => compile(true)}>
        Lav syntaksfejl
      </button>
      {state.status === 'ready' && (
        <p>
          <a href={state.url} download="rapport-kompilering.pdf">
            Hent PDF
          </a>{' '}
          · revision {state.revision} · {state.bytes.length} bytes
        </p>
      )}
      {state.status === 'error' && (
        <div role="alert">
          <p>{state.message}</p>
          <pre>{state.details}</pre>
        </div>
      )}
    </main>
  );
}
