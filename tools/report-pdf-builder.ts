/** Node-kontrol med appens lokale typst.ts/WASM og fonte; ingen netværk. */
import { readFile } from 'node:fs/promises';
import { TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet';
import init from '@myriaddreamin/typst-ts-web-compiler';
import { unpackPdfMotor } from '../src/report/pdf-motor.ts';
import { type ReportAssets } from '../src/report/report-document.ts';
import type { PdfRequest } from '../src/report/compile-queue.ts';
import type { ReportFigures } from '../src/report/report-figures.ts';
import {
  DEFAULT_COMPANY_PROFILE,
  REPORT_FONT_FILES,
  type CompanyProfile,
} from '../src/report/profile-defaults.ts';
import type { ReportCase } from './report-cases.ts';
export const root = new URL('../', import.meta.url);
export async function createReportBuilder() {
  // R6 kan kontrolleres mod en optimeret kopi eller dist/*.wasm.gz uden at
  // overskrive pakkens motor. Uden variablen bevares den hidtidige kilde.
  const wasm = await unpackPdfMotor(
    new Response(
      await readFile(
        process.env.PDF_MOTOR_WASM ??
          new URL(
            'node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm',
            root,
          ),
      ),
    ),
  );
  await init({ module_or_path: wasm });
  const snippet = new TypstSnippet();
  snippet.setCompilerInitOptions({ getModule: () => wasm });
  const fonts = Object.fromEntries(
    await Promise.all(
      REPORT_FONT_FILES.map(async (name) => [
        name,
        new Uint8Array(await readFile(new URL(`public/report/fonts/${name}`, root))),
      ]),
    ),
  );
  snippet.use(
    TypstSnippet.disableDefaultFontAssets(),
    TypstSnippet.preloadFonts(Object.values(fonts)),
  );
  const compiler = await snippet.getCompiler();
  const assets: ReportAssets = {
    main: await readFile(new URL('src/report/typst/rapport.typ', root), 'utf8'),
    layout: await readFile(new URL('src/report/typst/layout.typ', root), 'utf8'),
    logo: new Uint8Array(await readFile(new URL('public/report/logo/byggros_logo.jpeg', root))),
    fonts,
  };

  function load(request: PdfRequest) {
    compiler.resetShadow();
    for (const [path, content] of Object.entries(request.files)) {
      if (path.endsWith('.typ') && typeof content === 'string')
        compiler.addSource('/' + path, content);
      else
        compiler.mapShadow(
          '/' + path,
          typeof content === 'string' ? new TextEncoder().encode(content) : content,
        );
    }
    compiler.addSource('/rapport.typ', request.main);
  }
  async function compile(request: PdfRequest, name: string) {
    load(request);
    const compiled = await compiler.compile({
      mainFilePath: '/rapport.typ',
      format: 1,
      diagnostics: 'full',
      inputs: {},
    });
    if (!compiled.result || compiled.diagnostics?.length)
      throw new Error(name + ': ' + JSON.stringify(compiled.diagnostics));
    return compiled.result;
  }
  return { assets, compiler, load, compile };
}
export function expectedContents(
  c: ReportCase,
  figures: ReportFigures,
  profile: CompanyProfile = DEFAULT_COMPANY_PROFILE,
) {
  const expected = {
    case: c.name,
    // Kontrolagenten må kun normalisere renderings-whitespace, ikke værdier.
    normalization:
      'PDF whitespace/line wrapping only; no value, punctuation or Unicode normalization',
    strings: [
      ...Object.entries(c.data.context)
        .filter(
          ([key, v]) =>
            !key.startsWith('tekst_') &&
            !['sagsbehandler', 'sagsbehandler_mail', 'kontrol'].includes(key) &&
            typeof v === 'string' &&
            v.length > 0,
        )
        .map(([, v]) => v as string),
      c.data.medarbejdere.udfoert_af,
      c.data.medarbejdere.kontrol,
      ...c.data.medarbejdere.sagsbehandler,
      ...(c.data.medarbejdere.kontrollant ?? []),
      // B-046: synlig tekst udledes af datamodellen. Opmærkning og punktmarkører
      // tegnes separat; rå tekst og modellen gemmes nedenfor til formateringskontrol.
      ...Object.values(c.data.formattedTexts).flatMap((text) =>
        text!.paragraphs.flatMap((p) =>
          p.lines.map((l) => l.pieces.map((piece) => piece.text).join('')).filter(Boolean),
        ),
      ),
      ...[...c.data.context.dim_grundlag, ...c.data.context.dim_resultat].flatMap((r) => [
        r.label,
        r.vaerdi,
      ]),
      profile.titel,
      profile.slogan,
      profile.sidefod,
      ...profile.afsluttende_afsnit
        .filter((a) => a.noegle.slice(6) in c.data.formattedTexts)
        .map((a) => a.titel),
      'Dimensioneringsgrundlag:',
      'Kvalitetssikring:',
      'Dimensioneringsresultat:',
      'Baseret på ovennævnte indgangsparametre kan vi foreslå følgende MSL opbygning:',
      ...('oplyste_forudsaetninger' in c.data.formattedTexts ? ['Forudsætninger:'] : []),
      ...('generelle_forudsaetninger' in c.data.formattedTexts
        ? ['Generelle dimensioneringsforudsætninger for MSL opbygning:']
        : []),
      ...(c.data.grundlag ? [c.data.grundlag.overskrift + ':'] : []),
    ],
    context: c.data.context,
    medarbejdere: c.data.medarbejdere,
    formattedTexts: c.data.formattedTexts,
    forbiddenStrings:
      c.name === 'b046-omitted-sections'
        ? ['Forudsætninger:', 'Udførelse:']
        : c.name === 'b049-rettede-linjer'
          ? ['Stabiliseret tykkelse — 2 lag']
          : [],
    grundlag: c.data.grundlag,
    sections: c.data.sections,
    profile: profile,
    // SVG-tekst bliver kurver i PDF'en; kontrolleres som figurdata/sidebillede,
    // ikke med PDF-tekstudtræk. strings ovenfor er PDF-tekstkontrollens liste.
    figureTitles: figures.designdiagram ? [figures.designdiagram.export.title!.text] : [],
    figureCalls: { construction: figures.constructionCall, diagram: figures.diagramCall },
  };

  return expected;
}
