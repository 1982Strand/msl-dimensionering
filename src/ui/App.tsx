import { useEffect, useRef, useState } from 'react';
import {
  CircleHelp,
  FileText,
  Grid3x3,
  Layers,
  Layers3,
  LineChart,
  PanelLeft,
  Ruler,
  Settings as SettingsIcon,
  Table,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from '../components/ui/sidebar';
import { EditorProvider } from './EditorContext';
import { Materials } from './Materials';
import { GeonetDatabase } from './GeonetDatabase';
import { DataTables } from './DataTables';
import { Settings } from './Settings';
import { Dimensioning } from './Dimensioning';
import { DesignDraft, SidebarPreview } from './DesignDraft';
import { Help } from './Help';
import { Report } from './Report';

const navigationGroups = [
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

function currentPage() {
  const hash = location.hash.slice(1);
  return navigationGroups.some((group) => group.items.some(([key]) => key === hash)) ||
    hash === 'designudkast' ||
    hash === 'designudkast-sidebar'
    ? hash
    : 'dimensionering';
}

function MenuButton({ returnFocus = false }: { returnFocus?: boolean }) {
  const { toggleSidebar, state, isMobile, openMobile } = useSidebar();
  const button = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (returnFocus && isMobile && wasOpen.current && !openMobile) button.current?.focus();
    wasOpen.current = openMobile;
  }, [returnFocus, isMobile, openMobile]);
  return (
    <Button
      ref={button}
      variant="outline"
      size="sm"
      className="menu-toggle"
      aria-label="Menu"
      aria-expanded={isMobile ? openMobile : state === 'expanded'}
      onClick={toggleSidebar}
    >
      <PanelLeft aria-hidden="true" />
      Menu
    </Button>
  );
}

function Navigation({ page }: { page: string }) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon" className="app-sidebar">
      {isMobile && (
        <SidebarHeader>
          <MenuButton />
        </SidebarHeader>
      )}
      <SidebarContent>
        <nav aria-label="Navigation">
          {navigationGroups.map(({ label, items }) => (
            <SidebarGroup key={label}>
              <SidebarGroupLabel>{label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map(([key, name, Icon]) => (
                    <SidebarMenuItem key={key}>
                      <SidebarMenuButton asChild tooltip={name} isActive={page === key}>
                        <a
                          href={`#${key}`}
                          aria-current={page === key ? 'page' : undefined}
                          onClick={() => {
                            if (isMobile) setOpenMobile(false);
                          }}
                        >
                          <Icon aria-hidden="true" />
                          <span>{name}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
      <SidebarFooter className="app-sidebar-footer group-data-[collapsible=icon]:hidden">
        <span>BG Byggros A/S</span>
        <span>Beregningsværktøj v0.6</span>
      </SidebarFooter>
    </Sidebar>
  );
}

export function App() {
  const [page, setPage] = useState(currentPage);
  // Rapportdato og liveforløb bevares ved navigation i den åbne session,
  // men skrives aldrig til browserlageret.
  const [reportDate, setReportDate] = useState<string | null>(null);
  const [reportLive, setReportLive] = useState(false);
  useEffect(() => {
    const update = () => {
      const next = currentPage();
      if (location.hash !== `#${next}`) history.replaceState(null, '', `#${next}`);
      setPage(next);
    };
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  if (page === 'designudkast-sidebar') return <SidebarPreview />;
  return (
    <SidebarProvider className="app-shell">
      <header className="topbar">
        <MenuButton returnFocus />
        <div className="brand">
          <Layers3 size={30} strokeWidth={1.5} />
          <strong>MSL</strong>
          <span>Dimensionering</span>
        </div>
        <span className="draft-label">Under udvikling</span>
      </header>
      <div className="app-body">
        <Navigation page={page} />
        <div className="app-content">
          <EditorProvider>
            {page === 'rapport' ? (
              <Report
                date={reportDate}
                setDate={setReportDate}
                live={reportLive}
                startLive={() => setReportLive(true)}
              />
            ) : page === 'geonet-database' ? (
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
        </div>
      </div>
    </SidebarProvider>
  );
}
