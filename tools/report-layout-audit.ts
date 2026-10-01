/** Typst-query er en DELKONTROL: measure giver størrelser, ikke alle færdige
 * linjebokse/glyffer eller SVG'ers indre clipping. Den fulde kontrol kræver PyMuPDF.
 */
import assert from 'node:assert/strict';
import type { TypstCompiler } from '@myriaddreamin/typst.ts/compiler';
import type { PdfRequest } from '../src/report/compile-queue.ts';
import type { ReportFigures } from '../src/report/report-figures.ts';
import type { CompanyProfile } from '../src/report/profile-defaults.ts';

const ptPerMm = 72 / 25.4;
interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
function length(value: string): number {
  assert.match(value, /^-?\d+(?:\.\d+)?pt$/);
  return Number(value.slice(0, -2));
}
function overlaps(a: Rect, b: Rect) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

export async function auditReportLayout(
  compiler: TypstCompiler,
  load: (request: PdfRequest) => void,
  request: PdfRequest,
  figures: ReportFigures,
  profile: CompanyProfile,
  pages: number,
) {
  // Separat dokument: produktionens PDF kompileres uden kontrolmetadata.
  load({
    ...request,
    main: `#import "layout.typ": rapport-geometri
#let p = json("profil.json")
#context [#metadata((
  geometry: rapport-geometri(p),
  title: measure(block(width: (210 - p.margener_mm.venstre - p.margener_mm.hoejre) * 1mm,
    text(font: p.skrift.broedtekst, size: p.skrift.titel_pt * 1pt,
      top-edge: "ascender", bottom-edge: "descender", ligatures: false, p.titel))),
)) <r6-layout>]`,
  });
  const [result] = (await compiler.runWithWorld(
    { mainFilePath: '/rapport.typ', inputs: {} },
    async (world) => {
      const compiled = await world.compile({ diagnostics: 'full' });
      if (compiled.hasError || compiled.diagnostics?.length)
        throw new Error(JSON.stringify(compiled.diagnostics));
      return world.query({ selector: '<r6-layout>', field: 'value' });
    },
  )) as [{ geometry: Record<string, string>; title: { width: string; height: string } }];
  assert.ok(result, 'Manglende Typst-kontrolmetadata');
  const g = Object.fromEntries(
    Object.entries(result.geometry).map(([key, value]) => [key, length(value)]),
  );
  const page = { width: 210 * ptPerMm, height: 297 * ptPerMm };
  const body: Rect = {
    x: profile.margener_mm.venstre * ptPerMm,
    y: g.top,
    width: g.body_width,
    height: page.height - g.top - g.bottom,
  };
  const logo: Rect = {
    x: page.width - profile.logo_hoejre_mm * ptPerMm - g.logo_width,
    y: profile.logo_top_mm * ptPerMm,
    width: g.logo_width,
    height: g.logo_height,
  };
  const slogan: Rect = {
    x: page.width - profile.slogan_hoejre_mm * ptPerMm - g.slogan_width,
    y: g.slogan_top,
    width: g.slogan_width,
    height: g.slogan_height,
  };
  const title: Rect = {
    x: body.x,
    y: body.y,
    width: length(result.title.width),
    height: length(result.title.height),
  };
  const footer: Rect = {
    x: 0,
    y: page.height - g.footer_height,
    width: page.width,
    height: g.footer_height,
  };
  const pageNumber: Rect = {
    x: 0,
    y: page.height - g.page_number_offset - g.page_number_height,
    width: page.width,
    height: g.page_number_height,
  };
  const figureWidths = [figures.visualisering, figures.designdiagram]
    .filter((f) => f !== null)
    .map((f) => ({
      requestedMm: f!.width_mm,
      renderedMm: Math.min(f!.width_mm, g.figure_limit / ptPerMm),
    }));
  const checks = {
    logoAndTitleSeparate: !overlaps(logo, title),
    sloganAndTitleSeparate: !overlaps(slogan, title),
    logoAndSloganSeparate: !overlaps(logo, slogan),
    footerAndBodySeparate: !overlaps(footer, body),
    pageNumberAndBodySeparate: !overlaps(pageNumber, body),
    footerAndPageNumberSeparate: !overlaps(footer, pageNumber),
    footerTextFitsBar: g.footer_text_height <= g.footer_height,
    figuresFitAvailableWidth: figureWidths.every(
      (f) => f.renderedMm * ptPerMm <= body.width + 0.02,
    ),
  };
  // Billedankre kan også forespørges i selve dokumentet. Et anker ved et
  // centreret billede er ikke nødvendigvis billedrammens endelige venstre kant.
  load({
    ...request,
    main:
      request.main +
      '\n#context [#metadata(query(image).map(it => (position: it.location().position(), size: measure(it)))) <r6-images>]',
  });
  const [anchors] = (await compiler.runWithWorld(
    { mainFilePath: '/rapport.typ', inputs: {} },
    async (world) => {
      const compiled = await world.compile({ diagnostics: 'full' });
      if (compiled.hasError || compiled.diagnostics?.length)
        throw new Error(JSON.stringify(compiled.diagnostics));
      return world.query({ selector: '<r6-images>', field: 'value' });
    },
  )) as [
    { position: { page: number; x: string; y: string }; size: { width: string; height: string } }[],
  ];
  const imageAnchors = anchors.map((a) => ({
    page: a.position.page,
    x: length(a.position.x),
    y: length(a.position.y),
    width: length(a.size.width),
    height: length(a.size.height),
  }));
  const logoPages = imageAnchors
    .filter((a) => Math.abs(a.y - logo.y) < 0.02 && Math.abs(a.width - logo.width) < 0.02)
    .map((a) => a.page);
  const expectedLogoPages = profile.logo_paa_alle_sider
    ? Array.from({ length: pages }, (_, i) => i + 1)
    : [1];
  return {
    status: 'partial',
    method: 'Typst 0.14.2 / typst.ts 0.7.0: runWithWorld, compile, query, measure',
    checks: {
      ...checks,
      logoPagesMatch: JSON.stringify(logoPages) === JSON.stringify(expectedLogoPages),
    },
    imageAnchorsPt: imageAnchors,
    logoPages,
    measuredPt: { page, body, logo, slogan, title, footer, pageNumber },
    figureWidths,
    limitations: [
      'Ingen pålidelig fuld kontrol af færdige tekstlinjers positioner eller figurernes interne clipping i Node.',
      'Figurbredder er beregnet efter layoutets begrænsning; faktiske billedbokse og alle sider skal kontrolleres med PyMuPDF.',
      'Forespurgte billedpositioner er ankre; align/centrering kan flytte den endelige ramme i forhold til ankeret.',
      'Sidehoved og den gennemgående farvede sidefod bruger originalens sideankre og er undtaget fra brødtekstmarginerne.',
      'Målinger i query-JSON afrundes til 0,01 pt; dette er kun layoutgeometri, aldrig beregnings-/tekstkontrol.',
    ],
    requiredFollowUp:
      'Styrende agent: PyMuPDF-bokse for tekst og figurer på hver side samt visuel gennemgang.',
  };
}
