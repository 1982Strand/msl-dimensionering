import { useEffect, useState } from 'react';
import { Layers3 } from 'lucide-react';
import { EditorProvider } from './EditorContext';
import { Materials } from './Materials';
import { GeonetDatabase } from './GeonetDatabase';
import { DataTables } from './DataTables';
import { Settings } from './Settings';
import { Dimensioning } from './Dimensioning';
import { DesignDraft, SidebarPreview } from './DesignDraft';
import { Help } from './Help';
export function App() {
  const [page, setPage] = useState(() => location.hash.slice(1) || 'materialer');
  useEffect(() => {
    const update = () => setPage(location.hash.slice(1) || 'materialer');
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  if (page === 'designudkast-sidebar') return <SidebarPreview />;
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <Layers3 size={30} strokeWidth={1.5} />
          <strong>MSL</strong>
          <span>Dimensionering</span>
        </div>
        <span className="draft-label">Under udvikling</span>
      </header>
      <nav className="page-nav" aria-label="Navigation">
        {[
          ['dimensionering', 'Dimensionering'],
          ['materialer', 'Materialer'],
          ['geonet-database', 'Geonet-database'],
          ['diagrammer', 'Designdiagrammer'],
          ['vejdim', 'Trafikklasse-korrelation'],
          ['hjaelp', 'Hjælp'],
          ['indstillinger', 'Indstillinger'],
        ].map(([key, label]) => (
          <a key={key} href={`#${key}`} aria-current={page === key ? 'page' : undefined}>
            {label}
          </a>
        ))}
      </nav>
      <EditorProvider>
        {page === 'geonet-database' ? (
          <GeonetDatabase />
        ) : page === 'hjaelp' ? (
          <Help />
        ) : page === 'designudkast' ? (
          <DesignDraft />
        ) : page === 'dimensionering' ? (
          <Dimensioning />
        ) : page === 'indstillinger' ? (
          <Settings />
        ) : page === 'diagrammer' || page === 'vejdim' ? (
          <DataTables mode={page} key={page} />
        ) : (
          <Materials />
        )}
      </EditorProvider>
    </>
  );
}
