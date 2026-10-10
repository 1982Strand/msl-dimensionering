/** Fælles sidehoved, sidefod og menuens grupper (B-058). */
import type { ReactNode } from 'react';
import {
  CircleHelp,
  FileText,
  Grid3x3,
  Layers,
  LineChart,
  Ruler,
  Settings as SettingsIcon,
  Table,
} from 'lucide-react';

export const navigationGroups = [
  {
    label: 'Beregning',
    items: [
      ['dimensionering', 'Dimensionering', Ruler],
      ['rapport', 'Rapport', FileText],
    ],
  },
  {
    label: 'Opslag',
    items: [
      ['materialer', 'Materialer', Layers],
      ['geonet-database', 'Geonet-database', Grid3x3],
      ['diagrammer', 'Designdiagrammer', LineChart],
      ['vejdim', 'Trafikklasse-korrelation', Table],
      ['hjaelp', 'Hjælp og dokumentation', CircleHelp],
    ],
  },
  { label: 'Opsætning', items: [['indstillinger', 'Indstillinger', SettingsIcon]] },
] as const;

export type PageKey = (typeof navigationGroups)[number]['items'][number][0];

/** Stien følger menuens grupper, fx »Opslag / Materialer«. */
export function breadcrumb(page: PageKey) {
  for (const group of navigationGroups)
    for (const [key, name] of group.items) if (key === page) return `${group.label} / ${name}`;
  return '';
}

export function PageHeader({
  page,
  title,
  intro,
  aside,
}: {
  page: PageKey;
  title: ReactNode;
  intro?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <>
      <div className="breadcrumb">{breadcrumb(page)}</div>
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          {intro && <p className="intro">{intro}</p>}
        </div>
        {aside}
      </div>
    </>
  );
}

export function PageFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className="page-footer">
      <span>{children}</span>
      <span>MSL Dimensionering</span>
    </footer>
  );
}
