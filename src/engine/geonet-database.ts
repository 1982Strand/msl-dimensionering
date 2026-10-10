import { GEONET_DB, defaults, format_klasse_interval } from './data.ts';
import { pythonFixed } from './python-numbers.ts';
import type { Product } from './types.ts';
export const geonetDatabaseTitle = 'Geonet-database';
export const geonetDatabaseSubtitle =
  'Oversigt over alle geonet-produkter med effektindeks, belastningsklasser og tekniske data fra datablade og designmanualer.';
export const geonetDatabaseNotesTitle = 'Database-noter og kildehenvisninger';
// Kolonnenavne og hjælpetekster overført uændret fra originalens kolonne_hjaelp.
export const geonetDatabaseColumns = [
  {
    label: 'Produkt',
    help: 'Produktnavn som angivet i datablad/designmanual.',
  },
  {
    label: 'Serie',
    help: "Produktserie: GS-GRID, E'GRID eller Tensar.",
  },
  {
    label: 'Type',
    help: 'Netgeometri: biaxialt (firkantede masker), triaxialt eller hexagonalt (triangulære masker).',
  },
  {
    label: 'Effektindeks',
    help: 'Relativ effektivitet ift. referenceproduktet (= 100). Højere indeks = tyndere bærelag.',
  },
  {
    label: 'Korrektions-\nfaktor',
    help: 'Direkte korrektionsfaktor på den aflæste bærelagstykkelse i beregningen. Negativt fortegn = tykkelsen reduceres.',
  },
  {
    label: 'BK',
    help: 'Anbefalede belastningsklasser (1–6) iflg. designmanualerne.',
  },
  {
    label: 'Min. dæklag\n(cm)',
    help: 'Mindste lagtykkelse over geonettet (cm) — under dette kan geonettets funktion ikke garanteres.',
  },
  {
    label: 'Maks. korn\n(datablad mm)',
    help: 'Maksimal kornstørrelse i tilslaget angivet i produktdatabladet (mm).',
  },
  {
    label: 'Anb. tilslag\n(designmanual)',
    help: 'Anbefalet tilslagsstørrelse iflg. dimensioneringsmanualen (mm).',
  },
  {
    label: 'Maskestørrelse\n(datablad mm)',
    help: 'Maskestørrelse (ca.) angivet i produktdatabladet (mm).',
  },
  {
    label: 'Rudeåbning/maskestørrelse\n(designmanual)',
    help: 'Rudeåbning/maskestørrelse angivet i designmanualen — kan afvige fra databladets maskestørrelse.',
  },
  {
    label: 'Radial stivhed\n(kN/m @ 0,5%)',
    help: 'Radial sekantstivhed ved 0,5 % tøjning (kN/m) — angives kun for hexagonale produkter.',
  },
  {
    label: 'GWP A1–A3\n(kg CO₂/m²)',
    help: 'Klimaaftryk i produktionsfasen A1–A3 (kg CO₂-ækvivalent pr. m²). Ved flere værdier angives pr. rullebredde.',
  },
  {
    label: 'Min. levetid',
    help: 'Teknisk minimumslevetid angivet i datablad.',
  },
  {
    label: 'Min. trækstyrke\n(kN/m)',
    help: 'Minimum trækstyrke ved brud (kN/m) iflg. datablad.',
  },
  {
    label: 'Trækstyrke 2%\n(kN/m)',
    help: 'Trækstyrke ved 2 % tøjning (kN/m) — udtryk for stivhed ved små deformationer.',
  },
  {
    label: 'Trækstyrke 5%\n(kN/m)',
    help: 'Trækstyrke ved 5 % tøjning (kN/m) — udtryk for den kraft nettet kan mobilisere ved store deformationer (reservekapacitet).',
  },
  {
    label: 'Maks. def.\n(%)',
    help: 'Maksimal deformation (tøjning) ved brud iflg. datablad (%).',
  },
  {
    label: 'Knudepunkt\neffektivitet',
    help: 'Knudepunkternes styrke i procent af ribbernes trækstyrke — udtryk for hvor godt kræfter overføres i nettet.',
  },
  {
    label: 'Maskestabilitet\n(N.mm/grad)',
    help: 'Maskens rotationsstabilitet (aperture stability modulus, N·mm/grad) — modstand mod vridning af maskerne.',
  },
  {
    label: 'Ribbetykkelse\n(mm)',
    help: 'Ribbernes tykkelse (mm) iflg. datablad.',
  },
  {
    label: 'Stivhedsforhold',
    help: 'Forhold mellem stivhed i nettets retninger — tæt på 1 betyder ensartede egenskaber i alle retninger.',
  },
  {
    label: 'Overlæg Eᵤ ≥ 5\n(cm)',
    help: 'Påkrævet overlæg i samlinger (cm) når underbundens E-modul Eᵤ ≥ 5 MPa.',
  },
  {
    label: 'Overlæg Eᵤ < 5\n(cm)',
    help: 'Påkrævet overlæg i samlinger (cm) når underbundens E-modul Eᵤ < 5 MPa.',
  },
  {
    label: 'Bemærkning',
    help: 'Særlige forhold, datakilder og rettelser for produktet.',
  },
];

export type GeonetDatabaseCell = string | number;
export type GeonetDatabaseRow = GeonetDatabaseCell[];
const missing = (value: unknown): GeonetDatabaseCell => (value || '—') as GeonetDatabaseCell;
const text = (value: unknown): string => (value ? String(value) : '—');
function signedPercent(value: number): string {
  const formatted = pythonFixed(value * 100);
  return (formatted.startsWith('-') ? '' : '+') + formatted.replace('-', '−') + ' %';
}
export function geonetDatabaseRows(products: Product[] = GEONET_DB): GeonetDatabaseRow[] {
  return products
    .filter((g) => g.navn !== 'Anden armering (manuel)')
    .map((g) => [
      g.navn,
      g.serie ?? '—',
      g.type ?? '—',
      (g.effektindeks ?? '—') as GeonetDatabaseCell,
      g.korrektion_interval != null
        ? signedPercent(g.korrektion_interval[0]) +
          ' til ' +
          signedPercent(g.korrektion_interval[1])
        : signedPercent(g.korrektion!),
      format_klasse_interval(g.klasser!),
      g.min_daklag as number,
      text(g.max_korn),
      missing(g.anbefalet_tilslag),
      g.maskestoerrelse_datablad_mm ? g.maskestoerrelse_datablad_mm + ' mm' : '—',
      missing(g.rudeaabning),
      text(g.radial_stivhed),
      g.gwp_bredder
        ? Object.entries(g.gwp_bredder as Record<string, number>)
            .map(([width, value]) => pythonFixed(value, 2) + ' (' + Number(width) + 'm)')
            .join(' / ')
        : g.gwp
          ? pythonFixed(Number(g.gwp), 2)
          : '—',
      missing(g.min_levetid),
      missing(g.min_traekstyrke),
      missing(g.traekstyrke_2pct),
      missing(g.traekstyrke_5pct),
      g.max_deformation_pct ? '≤' + g.max_deformation_pct : '—',
      missing(g.knudepunkt_effektivitet),
      text(g.maskestabilitet_Nmm_grad),
      missing(g.ribbetykkelse),
      g.stivhedsforhold != null ? String(g.stivhedsforhold) : '—',
      (g.overlap_eu_ge5_cm === undefined ? 30 : g.overlap_eu_ge5_cm) as number,
      (g.overlap_eu_lt5_cm === undefined ? 40 : g.overlap_eu_lt5_cm) as number,
      (g.bemærkning ?? '') as string,
    ]);
}

// Rånoterne bevares uændret, inklusive note 3's afsluttende mellemrum.
export const geonetDatabaseNotes = defaults.GEONET_NOTER.map((note) => ({
  titel: note.titel,
  tekst: note.tekst.trim(),
}));
export const geonetDatabaseCaption =
  geonetDatabaseRows().length +
  ' produkter · ' +
  geonetDatabaseColumns.length +
  ' kolonner · forklaringen vises ved kolonneoverskriften';
