import type { SectionKey } from './report-data.ts';

export type ReportFont = 'Carlito' | 'Liberation Sans';
/** B-048: kartoteket er profildata, ikke rapportens underskrift. */
export interface Employee {
  navn: string;
  initialer: string;
  mail: string;
  telefon: string;
}
export interface CompanyProfile {
  medarbejdere: Employee[];
  logo: string;
  logo_bredde_mm: number;
  logo_paa_alle_sider: boolean;
  logo_top_mm: number;
  logo_hoejre_mm: number;
  sidehoved_afstand_mm: number;
  sidefod_afstand_mm: number;
  slogan: string;
  slogan_top_mm: number;
  slogan_hoejre_mm: number;
  sidefod: string;
  farve: string;
  sidefod_tekstfarve: string;
  overskrifter_i_farve: boolean;
  skrift: {
    broedtekst: ReportFont;
    sidehoved: ReportFont;
    stoerrelse_pt: number;
    sidehoved_pt: number;
    sidefod_pt: number;
    sidetal_pt: number;
    titel_pt: number;
    projekt_pt: number;
  };
  margener_mm: { top: number; bund: number; venstre: number; hoejre: number };
  sidefod_hoejde_mm: number;
  sidetal_fra_bund_mm: number;
  titel: string;
  by: string;
  sidetal: 'klammer' | 'side-af';
  afsluttende_afsnit: { noegle: `tekst_${SectionKey}`; titel: string }[];
}

/** Kun originalskabelonen ved a330cfd og Word-PDF-målinger; ingen demostandarder.
 * 1 twip = 25,4/1440 mm; 1 pt = 25,4/72 mm. Målte pt-værdier er
 * dokumenteret i spikes/report-typescript/layout.typ og Word-baseline.
 */
export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  medarbejdere: [], // B-048: ingen personer i standardprofilen.
  logo: 'assets/logo.jpeg', // word/header2.xml: rId1 → media/image1.jpeg; public/report/logo/OPRINDELSE.md.
  logo_bredde_mm: 1534537 / 36000, // header2.xml, wp:extent/@cx (EMU).
  logo_paa_alle_sider: true, // document.xml, sectPr: default header2; ingen titlePg/alternate header.
  logo_top_mm: (18.15 * 25.4) / 72, // Word-PDF: logoets øverste kant, layout.typ-måling.
  logo_hoejre_mm: ((595.3 - 440.65 - 120.77) * 25.4) / 72, // Word-PDF: x=440,65 pt, bredde=120,77 pt.
  sidehoved_afstand_mm: (709 * 25.4) / 1440, // document.xml, sectPr/pgMar/@header; logo har separat anker-offset.
  sidefod_afstand_mm: (981 * 25.4) / 1440, // document.xml, sectPr/pgMar/@footer; sidetal har separat målt placering.
  slogan: 'Skaber sikre løsninger', // header2.xml, w:txbxContent/w:t.
  slogan_top_mm: (55.72 * 25.4) / 72, // Word-PDF/prototype layout.typ: sloganets top.
  slogan_hoejre_mm: (31 * 25.4) / 72, // Word-PDF/prototype layout.typ: sloganets højre kant.
  sidefod: 'BG Byggros A/S | Østbirkvej 2 | 5240 Odense NV | Tlf. 5948 9000 | www.byggros.com', // footer2.xml, w:txbxContent/w:t, sammenføjet.
  farve: '#247322', // footer2.xml, a:srgbClr/@val=247322 (grøn sidefod).
  sidefod_tekstfarve: '#ffffff', // footer2.xml, kontaktlinjens w:color/@val=FFFFFF.
  overskrifter_i_farve: false, // document.xml: sorte overskrifter i Word-PDF.
  skrift: {
    broedtekst: 'Carlito', // document.xml/styles.xml: Calibri/minorHAnsi; substitution efter rapportplanen.
    sidehoved: 'Liberation Sans', // header2/footer2: HelveticaNeueLTStd-Roman; Helvetica/Arial-substitution.
    stoerrelse_pt: 11, // styles.xml, docDefaults/rPrDefault/w:sz=22 halvpoint.
    sidehoved_pt: 9, // header2.xml, slogan w:sz=18 halvpoint.
    sidefod_pt: 9, // footer2.xml, kontaktlinjens w:sz=18 halvpoint.
    sidetal_pt: 9, // footer2.xml / Word-PDF: sidetalsfeltets skriftstørrelse.
    titel_pt: 24, // document.xml: titlens w:sz=48 halvpoint.
    projekt_pt: 16, // document.xml: Projekt-linjens w:sz=32 halvpoint.
  },
  margener_mm: {
    top: (1701 * 25.4) / 1440, // document.xml, sectPr/pgMar/@top.
    bund: (1560 * 25.4) / 1440, // document.xml, sectPr/pgMar/@bottom.
    venstre: (1134 * 25.4) / 1440, // document.xml, sectPr/pgMar/@left.
    hoejre: (1134 * 25.4) / 1440, // document.xml, sectPr/pgMar/@right.
  },
  sidefod_hoejde_mm: (44 * 25.4) / 72, // Word-PDF: grøn flade nederste 44 pt; prototype layout.typ.
  sidetal_fra_bund_mm: (64.36 * 25.4) / 72, // Word-PDF/prototype layout.typ: sidetal top 64,36 pt fra bund.
  titel: 'NOTAT – MSL opbygning veje/pladser', // document.xml, første titelafsnit/w:t.
  by: 'Odense', // document.xml, underskriftens w:t="Odense d.".
  sidetal: 'klammer', // footer2.xml: PAGE-felt mellem [ og ].
  afsluttende_afsnit: [
    { noegle: 'tekst_krav_komprimering', titel: 'Krav til komprimering:' }, // document.xml: første afsluttende overskrift.
    { noegle: 'tekst_dim_sikkerhed', titel: 'Dimensionering og sikkerhed:' }, // document.xml: anden.
    { noegle: 'tekst_udfoerelse', titel: 'Udførelse:' }, // document.xml: tredje.
    { noegle: 'tekst_kontrolplan', titel: 'Kontrolplan:' }, // document.xml: fjerde.
    { noegle: 'tekst_projekteringsansvar', titel: 'Projekteringsansvar:' }, // document.xml: femte.
  ],
};

export const REPORT_FONT_FILES = [
  'Carlito-Regular',
  'Carlito-Bold',
  'Carlito-Italic',
  'Carlito-BoldItalic',
  'LiberationSans-Regular',
  'LiberationSans-Bold',
  'LiberationSans-Italic',
  'LiberationSans-BoldItalic',
].map((name) => `${name}.ttf`);
