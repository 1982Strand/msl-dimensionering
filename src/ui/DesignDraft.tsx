import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  TriangleAlert,
  Info,
  HelpCircle,
  Layers3,
  FileText,
  Database,
  ChartLine,
  Settings2,
  BookOpen,
  Route,
  PanelLeft,
} from 'lucide-react';
import { flexRender, type SortingState } from '@tanstack/react-table';
import {
  useLegacyTable,
  getCoreRowModel,
  getSortedRowModel,
  type LegacyColumnDef,
} from '@tanstack/react-table/legacy';
import { toast } from 'sonner';
import { GEONET_DB, format_klasse_interval } from '../engine/data';
import { valider_input } from '../engine/validators';
import type { Product } from '../engine/types';
import chapters from './design-draft-help.json';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../components/ui/accordion';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../components/ui/hover-card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';
import { Toaster } from '../components/ui/sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../components/ui/sheet';
import { Progress } from '../components/ui/progress';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '../components/ui/sidebar';

const pages = [
  ['Dimensionering', Layers3],
  ['Rapport', FileText],
  ['Materialer', Database],
  ['Geonet-database', Database],
  ['Designdiagrammer', ChartLine],
  ['Trafikklasse-korrelation', Route],
  ['Indstillinger', Settings2],
  ['Hjælp', BookOpen],
] as const;

function PreviewLayout() {
  const { toggleSidebar, state, isMobile, openMobile } = useSidebar();
  const [selected, setSelected] = useState('Dimensionering');
  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <span className="truncate p-2 font-semibold">MSL</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {pages.map(([name, Icon]) => (
                  <SidebarMenuItem key={name}>
                    <SidebarMenuButton
                      tooltip={name}
                      isActive={selected === name}
                      onClick={() => setSelected(name)}
                    >
                      <Icon />
                      <span>{name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <div className="min-w-0 flex-1 p-4">
        <Button
          variant="outline"
          size="sm"
          aria-label="Åbn eller luk menu"
          aria-expanded={isMobile ? openMobile : state === 'expanded'}
          onClick={toggleSidebar}
        >
          <PanelLeft />
          Menu
        </Button>
        <h2 className="mt-6 text-xl">{selected}</h2>
        <p className="mt-3 text-sm text-muted-foreground">Layout-eksempel · projekt MSL-2026-014</p>
        <div className="mt-6 rounded-md border bg-white p-4 text-sm leading-7">
          Trafikklasse T3
          <br />
          Underbund Eᵤ = 10 MPa
          <br />
          Materiale: Stabilgrus 0/32
          <br />
          Geonet: Tensar TriAx TX160
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Siderne demonstrerer alene navigationens udseende.
        </p>
      </div>
    </>
  );
}

// Egen browsing context holder fixed layout og mobilmenuens portal inde i rammen.
export function SidebarPreview() {
  return (
    <SidebarProvider>
      <PreviewLayout />
    </SidebarProvider>
  );
}

function DraftSection({
  title,
  usage,
  children,
}: {
  title: string;
  usage: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      data-design-section
      className="rounded-lg border bg-white p-5 sm:p-6"
    >
      <h2 className="text-xl">{title}</h2>
      <p className="mb-5 mt-2 text-sm text-muted-foreground">{usage}</p>
      {children}
    </section>
  );
}

const steps = [
  [
    'Dimensioneringstrafik',
    'Eksempel: Trafikklasse T3 vælges som grundlag. Dimensioneringstrafikken hentes fra trafikklasse-korrelationens standardkørsler.',
  ],
  [
    'VejDims ubundne krav',
    'Eksempel: Ved Eᵤ = 10 MPa anvendes VejDim-kørslens krav til de ubundne lag som grundlag for korrelationen.',
  ],
  [
    'Ækvivalent Eₒ',
    'Eksempel: Det ubundne krav omsættes til Eₒ,ækv ved omvendt opslag i den ustabiliserede kurve.',
  ],
  [
    'Hvor kurven ligger i designdiagrammet',
    'Eksempel: Opslagspunktet ved Eᵤ = 10 MPa placeres mellem diagrammets Eₒ-kurver. Gyldighedsområdet kontrolleres før interpolation.',
  ],
  [
    'φᵥ-korrektion for materialerne',
    'Eksempel: Stabilgrus 0/32 indgår med materialets friktionsvinkel. Den vægtede φᵥ korrigerer tykkelsen i forhold til diagrammets reference.',
  ],
  [
    'Reduktion med geonet',
    'Eksempel: Kurven for ét lag geonet og Tensar TriAx TX160 anvendes. Produktkorrektion, minimumstykkelser og oprunding indgår i det viste krav.',
  ],
];
const terms = [
  [
    'Eᵤ',
    'Underbundens E-modul i MPa. Angiver underbundens bæreevne ved opslag i designdiagrammet.',
    '10 MPa',
  ],
  [
    'Eₒ',
    'Ækvivalent E-modul i MPa. Angiver belastningsniveauet ved opslag i designdiagrammet.',
    'Belastningsgrundlag',
  ],
  ['Cv', 'Underbundens CBR-værdi i %. Omsættes til Eᵤ efter appens intervaller.', 'CBR i %'],
  [
    'φᵥ',
    'Vægtet friktionsvinkel i grader. Dannes af materialelagenes friktionsvinkler og tykkelsesandele.',
    'Materialernes friktionsvinkel',
  ],
];
const columns: LegacyColumnDef<Product>[] = [
  { accessorKey: 'navn', header: 'Produkt' },
  { accessorKey: 'serie', header: 'Serie' },
  { accessorKey: 'type', header: 'Type' },
  {
    id: 'klasser',
    accessorFn: (p) => format_klasse_interval(p.klasser ?? []),
    header: 'Belastningsklasse',
  },
  { accessorKey: 'maskestoerrelse_mm', header: 'Maske (mm)' },
  { accessorKey: 'max_korn', header: 'Maks. korn (mm)' },
  { accessorKey: 'min_daklag', header: 'Min. dæklag (cm)' },
  {
    accessorKey: 'korrektion',
    header: 'Korrektion (%)',
    cell: (c) =>
      c.getValue() == null ? '—' : (Number(c.getValue()) * 100).toLocaleString('da-DK'),
  },
];

function ProductTable() {
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const data = GEONET_DB.filter(
    (p) =>
      p.navn !== 'Anden armering (manuel)' &&
      columns.some((c) => {
        const value =
          'accessorKey' in c
            ? p[c.accessorKey as keyof Product]
            : format_klasse_interval(p.klasser ?? []);
        return String(value ?? '')
          .toLocaleLowerCase('da-DK')
          .includes(search.toLocaleLowerCase('da-DK'));
      }),
  );
  const table = useLegacyTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  return (
    <div>
      <label htmlFor="draft-search" className="mb-2 block text-sm">
        Søg i geonetprodukter
      </label>
      <Input
        id="draft-search"
        className="mb-4 max-w-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Produkt, serie eller egenskab"
      />
      <Table aria-label="Geonetprodukter" className="min-w-[1000px] table-auto [&_th]:w-auto">
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((h) => (
                <TableHead
                  key={h.id}
                  aria-sort={
                    h.column.getIsSorted() === 'asc'
                      ? 'ascending'
                      : h.column.getIsSorted() === 'desc'
                        ? 'descending'
                        : 'none'
                  }
                >
                  <Button variant="ghost" size="sm" onClick={h.column.getToggleSortingHandler()}>
                    {String(h.column.columnDef.header)}{' '}
                    {h.column.getIsSorted() === 'asc'
                      ? '↑'
                      : h.column.getIsSorted() === 'desc'
                        ? '↓'
                        : '↕'}
                  </Button>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {cell.getValue() == null
                    ? '—'
                    : flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {!data.length && (
            <TableRow>
              <TableCell colSpan={columns.length}>Ingen produkter matcher søgningen.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <p className="mt-3 text-xs text-muted-foreground">
        {data.length} produkter · indbyggede produktdata · kun opslag. Manuel armering er ikke et
        databaseprodukt.
      </p>
    </div>
  );
}

const validationBase = {
  eu: 10,
  eo: 60,
  phi: 40,
  lag_mode: '1_lag',
  geonet: null,
  materialer: null,
};
const messages = [
  {
    title: 'Fejl',
    Icon: AlertCircle,
    text: valider_input({ ...validationBase, eu: 1 }).fejl[0],
    className: 'border-[#edc9c1] bg-[#fff1ef] text-[#962d22]',
  },
  {
    title: 'Advarsel',
    Icon: TriangleAlert,
    text: valider_input({ ...validationBase, phi: 30 }).advarsler[0],
    className: 'border-[#ebdfbb] bg-[#fff6df] text-[#826320]',
  },
  {
    title: 'Anbefaling',
    Icon: Info,
    text: valider_input({ ...validationBase, t_armeret_mm: 600 }).anbefalinger[0],
    className: 'border-sidebar-border bg-sidebar-accent text-primary',
  },
];

function LoadingExample() {
  const [progress, setProgress] = useState(0);
  const [run, setRun] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () =>
        setProgress((p) => {
          if (p >= 90) {
            window.clearInterval(timer);
            return 100;
          }
          return p + 10;
        }),
      350,
    );
    return () => window.clearInterval(timer);
  }, [run]);
  return (
    <div className="max-w-lg space-y-4">
      <p aria-live="polite" className="text-sm">
        {progress < 100 ? 'Indlæser rapportmotor …' : 'Rapportmotor indlæst (eksempel)'} {progress}{' '}
        %
      </p>
      <Progress
        value={progress}
        aria-label="Indlæsning af rapportmotor"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      />
      <Button
        variant="outline"
        onClick={() => {
          setProgress(0);
          setRun((r) => r + 1);
        }}
      >
        Gentag indlæsning
      </Button>
      <p className="text-xs text-muted-foreground">
        Simuleret indlæsning. Ingen rapportmotor hentes.
      </p>
    </div>
  );
}

export function DesignDraft() {
  const [mobile, setMobile] = useState(false);
  return (
    <main className="space-y-6">
      <div>
        <h1>Designudkast</h1>
        <p className="intro">
          Komponentforslag til godkendelse. Eksemplerne ændrer ikke appens beregninger eller gemte
          data.
        </p>
      </div>
      <DraftSection
        title="Sidebar"
        usage="Foreslås til samlet navigation mellem appens otte sider."
      >
        <div className="mb-4 flex gap-2">
          <Button variant={mobile ? 'outline' : 'default'} onClick={() => setMobile(false)}>
            Skrivebord
          </Button>
          <Button variant={mobile ? 'default' : 'outline'} onClick={() => setMobile(true)}>
            Mobilvisning
          </Button>
        </div>
        <div className="overflow-x-auto rounded-md border bg-background p-2">
          <iframe
            title="Forhåndsvisning af navigation"
            src="#designudkast-sidebar"
            className={`h-[440px] border-0 ${mobile ? 'w-[375px]' : 'w-full min-w-[800px]'}`}
          />
        </div>
      </DraftSection>
      <DraftSection
        title="Accordion"
        usage="Foreslås til beregningstrin i Dimensionering og kapitler på Hjælp-siden."
      >
        <h3 className="mb-2 font-semibold">Sådan er resultatet beregnet</h3>
        <Accordion type="single" collapsible>
          {steps.map(([title, text], i) => (
            <AccordionItem value={`step-${i}`} key={title}>
              <AccordionTrigger>{title}</AccordionTrigger>
              <AccordionContent>{text}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <h3 className="mb-2 mt-6 font-semibold">Hjælp-kapitler</h3>
        <Accordion type="single" collapsible>
          {chapters.map(([title, text], i) => (
            <AccordionItem value={`help-${i}`} key={title}>
              <AccordionTrigger>
                {i + 1}. {title}
              </AccordionTrigger>
              <AccordionContent>{text}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </DraftSection>
      <DraftSection
        title="Tooltip / Hover Card"
        usage="Foreslås til korte feltforklaringer og uddybning af faglige symboler."
      >
        <TooltipProvider>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {terms.map(([symbol, text, value]) => (
              <div key={symbol} className="rounded-md border p-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{symbol}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Forklaring af ${symbol}`}>
                        <HelpCircle />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-64">{text}</TooltipContent>
                  </Tooltip>
                </div>
                <p className="my-3 text-sm">{value}</p>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <a
                      href="#designudkast"
                      onClick={(e) => e.preventDefault()}
                      className="text-sm text-primary underline"
                    >
                      Om {symbol}
                    </a>
                  </HoverCardTrigger>
                  <HoverCardContent className="bg-white text-foreground">
                    <strong>{symbol}</strong>
                    <p className="mt-2 text-sm leading-6">{text}</p>
                  </HoverCardContent>
                </HoverCard>
              </div>
            ))}
          </div>
        </TooltipProvider>
      </DraftSection>
      <DraftSection
        title="Data Table"
        usage="Foreslås til søgning og sortering i Geonet-databasen uden redigering."
      >
        <ProductTable />
      </DraftSection>
      <DraftSection
        title="Alert"
        usage="Foreslås til fejl, advarsler og anbefalinger fra dimensioneringsmotoren."
      >
        <div className="space-y-3">
          {messages.map(({ title, Icon, text, className }) => (
            <Alert key={title} className={className}>
              <Icon />
              <AlertTitle>{title}</AlertTitle>
              <AlertDescription className="text-inherit">{text}</AlertDescription>
            </Alert>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Eksempelbeskeder fra motoren ved henholdsvis Eᵤ = 1 MPa, φᵥ = 30° og stabiliseret tykkelse
          600 mm.
        </p>
      </DraftSection>
      <DraftSection
        title="Sonner"
        usage="Foreslås til korte statusbeskeder ved lagring og dannelse af PDF."
      >
        <Toaster />
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() =>
              toast.success('Ændring gemt', {
                action: {
                  label: 'Fortryd',
                  onClick: () => toast.info('Ændring fortrudt (eksempel)'),
                },
              })
            }
          >
            Vis gemt ændring
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.success('PDF dannet', {
                action: {
                  label: 'Hent',
                  onClick: () => toast.info('Eksempel: Her hentes den dannede PDF.'),
                },
              })
            }
          >
            Vis dannet PDF
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Status og handlinger er eksempler. Ingen data gemmes, og ingen PDF dannes.
        </p>
      </DraftSection>
      <DraftSection
        title="Tabs og Sheet"
        usage="Foreslås til Rapport og Firmaprofil samt forhåndsvisning af PDF i et sidepanel."
      >
        <Tabs defaultValue="report">
          <TabsList>
            <TabsTrigger value="report">Rapport</TabsTrigger>
            <TabsTrigger value="company">Firmaprofil</TabsTrigger>
          </TabsList>
          <TabsContent value="report" className="max-w-lg space-y-4 pt-3">
            <label className="block text-sm">
              Projektnavn
              <Input defaultValue="Adgangsvej – eksempelprojekt" className="mt-2" />
            </label>
            <label className="block text-sm">
              Projektnummer
              <Input defaultValue="MSL-2026-014" className="mt-2" />
            </label>
          </TabsContent>
          <TabsContent value="company" className="max-w-lg space-y-4 pt-3">
            <label className="block text-sm">
              Firmanavn
              <Input defaultValue="Eksempel Rådgivning ApS" className="mt-2" />
            </label>
            <label className="block text-sm">
              Adresse
              <Input defaultValue="Eksempelvej 12, 8000 Aarhus C" className="mt-2" />
            </label>
          </TabsContent>
        </Tabs>
        <Sheet>
          <SheetTrigger asChild>
            <Button className="mt-5">Vis PDF</Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Rapport – forhåndsvisning</SheetTitle>
              <SheetDescription>Pladsholder. Der er ikke dannet en PDF.</SheetDescription>
            </SheetHeader>
            <div className="m-4 flex aspect-[210/297] items-center justify-center rounded border bg-white p-6 text-center text-sm text-muted-foreground">
              MSL Dimensionering
              <br />
              Adgangsvej – eksempelprojekt
              <br />
              PDF-forhåndsvisning placeres her.
            </div>
          </SheetContent>
        </Sheet>
      </DraftSection>
      <DraftSection
        title="Progress"
        usage="Foreslås til indlæsning af rapportmotoren før PDF-dannelse."
      >
        <LoadingExample />
      </DraftSection>
    </main>
  );
}
