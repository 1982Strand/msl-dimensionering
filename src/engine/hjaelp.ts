/** Port af core/hjaelp.py fra a330cfd. Ingen referenceforventninger indlæses i appen. */
export interface Kildedokument {
  titel: string;
  udgiver: string;
  dato: string;
  url: string;
}
export interface Formel {
  _type: 'Formel';
  udtryk: string;
  hvor: string[];
}
export interface Figur {
  _type: 'Figur';
  tekst: string;
  tabel: string;
}
export interface Gaatil {
  _type: 'Gaatil';
  side: string;
  tekst: string;
}
export interface Kilder {
  _type: 'Kilder';
  poster: Kildedokument[];
}
export type Stykke = string | Formel | Gaatil | Kilder;
export interface Afsnit {
  _type: 'Afsnit';
  nummer: string;
  titel: string;
  indhold: Stykke[];
  figurer: Figur[];
}
export interface Kapitel {
  _type: 'Kapitel';
  noegle: string;
  nummer: number;
  titel: string;
  resume: string;
  afsnit: Afsnit[];
}

function laesKilder(brod: string): Kildedokument[] {
  return brod.split('\n').flatMap((line) => {
    const dele = line.split('|').map((d) => d.trim());
    if (dele.length !== 4 || !dele[0] || !dele[3]) return [];
    return [{ titel: dele[0], udgiver: dele[1], dato: dele[2], url: dele[3] }];
  });
}
function delKrop(krop: string): Pick<Afsnit, 'indhold' | 'figurer'> {
  const indhold: Stykke[] = [];
  const figurer: Figur[] = [];
  const tilfoejMd = (raw: string) => {
    if (raw.trim()) indhold.push(raw.trim());
  };
  let pos = 0;
  // Python re.M | re.S: kun blokkens hovedlinje er uden linjeskift.
  for (const m of krop.matchAll(
    /^:::(formel|figur|gaatil|kilder)[ \t]*(.*?)\n([\s\S]*?)^:::[ \t]*$/gm,
  )) {
    tilfoejMd(krop.slice(pos, m.index));
    const [, slags, rawHoved, brod] = m;
    const hoved = rawHoved.trim();
    if (slags === 'formel') {
      const separator = brod.indexOf('\n--\n');
      const udtryk = separator < 0 ? brod : brod.slice(0, separator);
      const hvor = separator < 0 ? '' : brod.slice(separator + 4);
      indhold.push({
        _type: 'Formel',
        udtryk: udtryk.replace(/^\n+|\n+$/g, ''),
        hvor: hvor
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      });
    } else if (slags === 'gaatil')
      indhold.push({ _type: 'Gaatil', side: hoved, tekst: brod.trim() });
    else if (slags === 'kilder') indhold.push({ _type: 'Kilder', poster: laesKilder(brod) });
    else figurer.push({ _type: 'Figur', tekst: hoved, tabel: brod.trim() });
    pos = m.index + m[0].length;
  }
  tilfoejMd(krop.slice(pos));
  return { indhold, figurer };
}
export function laes_kapitel(filename: string, raw: string): Kapitel {
  // read_text i Python normaliserer linjeskift.
  const tekst = raw.replace(/\r\n?/g, '\n');
  const hoved = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(tekst);
  const felter: Record<string, string> = {};
  for (const line of (hoved?.[1] ?? '').split('\n')) {
    const colon = line.indexOf(':');
    if (colon >= 0) felter[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  const krop = hoved ? tekst.slice(hoved[0].length) : tekst;
  const stamme = filename.split(/[\\/]/).at(-1)!.replace(/\.md$/, '');
  const dash = stamme.indexOf('-');
  const nummerTekst = dash < 0 ? stamme : stamme.slice(0, dash);
  const noegle = dash < 0 ? stamme : stamme.slice(dash + 1) || stamme;
  const matches = [...krop.matchAll(/^##\s+(\S+)\s+(.+?)\s*$/gm)];
  return {
    _type: 'Kapitel',
    noegle,
    nummer: /^\d+$/.test(nummerTekst) ? Number(nummerTekst) : 0,
    titel: felter.titel ?? stamme,
    resume: felter.resume ?? '',
    afsnit: matches.map((m, i) => ({
      _type: 'Afsnit',
      nummer: m[1],
      titel: m[2],
      ...delKrop(krop.slice(m.index + m[0].length, matches[i + 1]?.index ?? krop.length)),
    })),
  };
}
export function laes_kapitler(files: Record<string, string>): Kapitel[] {
  return Object.keys(files)
    .sort()
    .map((file) => laes_kapitel(file, files[file]));
}

export const HJAELP_STANDARD_KAPITEL = 'beregningsmetoden';
export const HJAELP_SIDEHOVED = 'Hjælp og dokumentation';
export const HJAELP_UNDERTEKST =
  'Beregningsmetoden, datagrundlaget og forbeholdene bag værktøjet. Klik på overskrifterne ved de 8 punkter nedenfor for at læse indholdet.';
export const HJAELP_INTRO_TITEL = 'Hvad værktøjet gør';
export const HJAELP_INTRO_NOTE = 'Grundlaget bag beregningen';
export const HJAELP_TRIN_TITEL = 'Beregningsgangen';
export const HJAELP_BEGREBER_TITEL = 'Nøglebegreber — forklaringen vises ved markøren';
export const HJAELP_INTRO =
  'Værktøjet fastlægger den nødvendige samlede tykkelse af de ubundne lag i en vejopbygning og viser, hvordan tykkelsen ændres, når opbygningen forstærkes med geonet. Beregningen bygger på designdiagrammerne i BG Byggros’ designmanualer, som indeholder ét diagram for hver belastningsklasse.\n\n' +
  'Dimensioneringen kan tage udgangspunkt i enten en belastningsklasse eller en trafikklasse. Ved valg af belastningsklasse anvendes det tilhørende designdiagram direkte. Her aflæses lagtykkelsen ud fra underbundens E-modul, både uden geonet og for opbygninger med ét eller to lag geonet.\n\n' +
  'Trafikklasserne følger Vejdirektoratets skala T1–T6, men har ikke egne designdiagrammer. Derfor etableres sammenhængen gennem en VejDim-beregning for den valgte trafikklasse og underbundens E-modul. VejDim fastlægger den nødvendige samlede tykkelse af de ubundne lag. Denne tykkelse sammenholdes derefter med den ustabiliserede kurve i belastningsklassernes designdiagrammer ved samme underbunds-E-modul. Det tilsvarende punkt i diagrammet anvendes som grundlag for at aflæse effekten af geonet.\n\n' +
  'Der foretages således ikke en teoretisk omregning mellem belastningsklasse og trafikklasse. Trafikklasserne kobles i stedet empirisk til designdiagrammerne på baggrund af de lagtykkelser, som VejDim beregner.';
export const HJAELP_TRIN = [
  'Underbund og dimensioneringsgrundlag fastlægges',
  'Opslagspunktet i designdiagrammet bestemmes',
  'Lagtykkelsen aflæses med og uden geonet',
  'Korrektioner og kontroller gennemføres',
];
export const HJAELP_NOEGLEBEGREBER = [
  ['Eᵤ', 'Underbundens E-modul [MN/m²]. Angives i dimensioneringen.'],
  [
    'Eₒ',
    'Designdiagrammets overflademodul [MN/m²]. Ved dimensionering efter belastningsklasse er værdien diagrammets egen, forudsatte størrelse.',
  ],
  [
    'Eₒ,ækv',
    'Det tilbageberegnede opslagspunkt ved dimensionering efter trafikklasse. En indeksværdi mellem to diagrammer, ikke et forventet overflademodul.',
  ],
  [
    'φᵥ',
    'Den tykkelsevægtede friktionsvinkel i de ubundne materialelag [°]. Designmanualerne forudsætter 37°.',
  ],
];
export const KILDEDOKUMENTER: Kildedokument[] = [
  {
    titel: "GS-GRID/E'GRID Designmanual",
    udgiver: 'BG Byggros',
    dato: 'okt. 2025',
    url: 'https://www.byggros.com/media/dxqbrimw/dk-brochure-gs-grid-designmanual.pdf',
  },
  {
    titel: 'Tensar Geonet Designmanual',
    udgiver: 'BG Byggros',
    dato: 'sept. 2024',
    url: 'https://www.byggros.com/media/c2tavgwm/brochure-tensar-designmanual-sept-2024-1.pdf',
  },
  {
    titel: 'GS-GRID Biaxial teknisk datablad (B-serien)',
    udgiver: 'BG Byggros',
    dato: 'jun. 2025',
    url: 'https://www.byggros.com/media/tlwdjvk2/gs-grid-data-dk0625-6-100.pdf',
  },
  {
    titel: 'GS-GRID SX teknisk datablad (SX160/SX170)',
    udgiver: 'BG Byggros',
    dato: 'okt. 2025',
    url: 'https://www.byggros.com/media/a31jv5rj/gs-grid-sx-teknisk-datablad-1025.pdf',
  },
  {
    titel: 'Tensar TriAx TX160 teknisk datablad',
    udgiver: 'BG Byggros',
    dato: 'aug. 2024',
    url: 'https://www.byggros.com/media/2ldmxhf0/datablad-tensar-triax-tx-160_23-08-24-1.pdf',
  },
  {
    titel: 'Tensar TriAx TX190L teknisk datablad',
    udgiver: 'BG Byggros',
    dato: 'okt. 2024',
    url: 'https://www.byggros.com/media/vydj5w24/tensar-geonet-tx190l-10-10-2024.pdf',
  },
  {
    titel: 'Tensar InterAx NX750 Product Identification Data Sheet',
    udgiver: 'Tensar',
    dato: 'dec. 2024',
    url: 'https://www.tensarcorp.com/getattachment/a0bac181-91df-463b-b7ab-c5f642ac92b5/NX750_PIDS_DEC_2024.pdf',
  },
  {
    titel: 'Tensar InterAx NX850 Product Identification Data Sheet',
    udgiver: 'Tensar',
    dato: 'dec. 2024',
    url: 'https://www.tensarcorp.com/getattachment/63057717-50ff-4ac2-bd31-5bfe261c115c/NX850_PIDS_DEC_2024.pdf',
  },
];

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
export function formelHtml(udtryk: string): string {
  // Python \b er Unicode-baseret; JS \b er ikke. Symbolernes indeks bevares.
  return escapeHtml(udtryk).replace(
    /(?<![\p{L}\p{N}_])([A-Za-zÆØÅæøåφ]+)_([A-Za-zÆØÅæøåφ0-9]+(?:,[A-Za-zÆØÅæøå0-9]+)*)/gu,
    (_, symbol: string, index: string) => `${escapeHtml(symbol)}<sub>${escapeHtml(index)}</sub>`,
  );
}
export function formelLinjer(formel: Formel) {
  return { udtryk: formel.udtryk.split('\n').map(formelHtml), hvor: formel.hvor.map(formelHtml) };
}
export const HJAELP_ROUTES: Readonly<Record<string, string>> = {
  dimensionering: '#dimensionering',
  materialer: '#materialer',
  designdiagrammer: '#diagrammer',
  trafikklasse_korrelation: '#vejdim',
  indstillinger: '#indstillinger',
  hjaelp: '#hjaelp',
};
export function helpViewModel(
  kapitler: Kapitel[],
  aabne: readonly string[],
  routes = HJAELP_ROUTES,
) {
  return kapitler.map((kapitel) => {
    let figurNr = 0;
    const aaben = aabne.includes(kapitel.noegle);
    return {
      ...kapitel,
      aaben,
      knaptekst: `${aaben ? 'Luk' : 'Læs'} kapitel ${kapitel.nummer}: ${kapitel.titel}`,
      afsnitTal: `${kapitel.afsnit.length} afsnit`,
      afsnit: kapitel.afsnit.map((afsnit) => ({
        ...afsnit,
        indhold: afsnit.indhold.map((stykke) => {
          if (typeof stykke === 'string' || stykke._type === 'Formel') return stykke;
          if (stykke._type === 'Gaatil')
            return routes[stykke.side] ? { ...stykke, href: routes[stykke.side] } : null;
          return { ...stykke, poster: stykke.poster.length ? stykke.poster : KILDEDOKUMENTER };
        }),
        figurer: afsnit.figurer.map((figur) => ({
          ...figur,
          nummerTekst: `Figur ${kapitel.nummer}.${++figurNr}`,
        })),
      })),
    };
  });
}
