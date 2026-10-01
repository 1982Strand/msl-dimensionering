import type { PdfRequest } from './compile-queue.ts';
import type { ReportData } from './report-data.ts';
import type { ReportFigures } from './report-figures.ts';
import {
  DEFAULT_COMPANY_PROFILE,
  REPORT_FONT_FILES,
  type CompanyProfile,
} from './profile-defaults.ts';

/** Aktiver indlæses ved rapportåbning, ikke på dimensioneringssiden.
 * Node-byggescriptet leverer de samme bytes fra disk.
 */
export interface ReportAssets {
  main: string;
  layout: string;
  logo: Uint8Array;
  logoExtension?: 'jpeg' | 'png' | 'svg';
  fonts: Readonly<Record<string, Uint8Array>>;
}
export async function loadReportAssets(baseUrl: string): Promise<ReportAssets> {
  async function bytes(url: URL | string): Promise<Uint8Array> {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Rapportaktiv kunne ikke indlæses: ${url} (HTTP ${r.status})`);
    return new Uint8Array(await r.arrayBuffer());
  }
  const [main, layout, logo, fonts] = await Promise.all([
    bytes(new URL('./typst/rapport.typ', import.meta.url)),
    bytes(new URL('./typst/layout.typ', import.meta.url)),
    bytes(`${baseUrl}report/logo/byggros_logo.jpeg`),
    Promise.all(
      REPORT_FONT_FILES.map(
        async (name) => [name, await bytes(`${baseUrl}report/fonts/${name}`)] as const,
      ),
    ),
  ]);
  return {
    main: new TextDecoder().decode(main),
    layout: new TextDecoder().decode(layout),
    logo,
    fonts: Object.fromEntries(fonts),
  };
}

/** main/layout er versionerede aktiver. Brugerfelter og profil indsættes kun
 * i JSON-filer, som compiler.ts sender med mapShadow, aldrig i addSource.
 */
export function reportDocument(
  data: ReportData,
  figures: ReportFigures,
  assets: ReportAssets,
  profile: CompanyProfile = DEFAULT_COMPANY_PROFILE,
): PdfRequest {
  const logoPath = `assets/logo.${assets.logoExtension ?? 'jpeg'}`;
  const files: Record<string, string | Uint8Array> = {
    'layout.typ': assets.layout,
    'data.json': JSON.stringify({
      ...data,
      visualisering: figures.visualisering
        ? { image: 'figures/construction.svg', width_mm: figures.visualisering.width_mm }
        : null,
      designdiagram: figures.designdiagram
        ? { image: 'figures/personal-diagram.svg', width_mm: figures.designdiagram.width_mm }
        : null,
    }),
    'profil.json': JSON.stringify({ ...profile, logo: logoPath }),
    [logoPath]: assets.logo,
  };
  for (const name of REPORT_FONT_FILES) {
    if (!assets.fonts[name]?.length) throw new Error(`Rapportskrift mangler: ${name}`);
    files[`fonts/${name}`] = assets.fonts[name];
  }
  if (figures.visualisering) files['figures/construction.svg'] = figures.visualisering.svg;
  if (figures.designdiagram) files['figures/personal-diagram.svg'] = figures.designdiagram.svg;
  return { main: assets.main, files };
}
