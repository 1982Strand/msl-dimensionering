/** node tools/build-report-pdfs.ts — samme typst.ts/WASM 0.7.0 som browseren.
 * Ingen browser, CLI-Typst, netværk eller nye pakker.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { TypstSnippet } from '@myriaddreamin/typst.ts/contrib/snippet';
import init from '@myriaddreamin/typst-ts-web-compiler';
import { reportCases } from './report-cases.ts';
import { reportData } from '../src/report/report-data.ts';
import { reportFigures } from '../src/report/report-figures.ts';
import { reportDocument, type ReportAssets } from '../src/report/report-document.ts';
import { DEFAULT_COMPANY_PROFILE, REPORT_FONT_FILES } from '../src/report/profile-defaults.ts';

const root = new URL('../', import.meta.url);
const wasm = new Uint8Array(
  await readFile(
    new URL(
      'node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm',
      root,
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
const cases = reportCases();
const special = structuredClone(cases[0]);
special.name = 'special-characters';
special.metadata.projekt = '# $ * _ @ < > [ ] \\ #panic("MUST NOT RUN")';
special.metadata.beskrivelse = 'Flerlinjet beskrivelse\n# $ * _ @ < > [ ] \\';
special.tekster.udfoerelse =
  'Bogstavelig tekst: # $ * _ @ < > [ ] \\\n#panic("MUST NOT RUN")\n\n   • Indrykket punkt\n           o Underpunkt';
special.data = reportData(special.result, special.metadata, special.valg, special.tekster);
cases.push(special);
const formatted = structuredClone(cases[0]);
formatted.name = 'b046-formatted-text';
formatted.tekster.udfoerelse =
  'Et afsnit med **fed tekst** og *kursiv tekst*.\n\n' +
  '• Første punkt\n  - Underpunkt med **fed** tekst\n    o Underpunkt med *kursiv* tekst\n' +
  '- ' +
  'En lang punktlinje skal fortsætte under teksten med hængende indrykning. '.repeat(8) +
  '\n\n  Almindelig indrykning\n# $ [ ] \\ @ < > #panic("MUST NOT RUN")\n**Uafsluttet';
formatted.data = reportData(
  formatted.result,
  formatted.metadata,
  formatted.valg,
  formatted.tekster,
);
cases.push(formatted);
const omitted = structuredClone(cases[0]);
omitted.name = 'b046-omitted-sections';
omitted.valg.medtag_afsnit = { oplyste_forudsaetninger: false, udfoerelse: false };
omitted.data = reportData(omitted.result, omitted.metadata, omitted.valg, omitted.tekster);
cases.push(omitted);
// B-048: ekstra lag oven på originaltilfældene; forventningerne ændres ikke.
for (const control of [false, true]) {
  const c = structuredClone(cases[0]);
  c.name = control ? 'b048-med-kontrollant' : 'b048-uden-kontrollant';
  Object.assign(c.metadata, {
    sagsbehandler: 'Anna Jensen',
    sagsbehandler_initialer: 'AJ',
    sagsbehandler_mail: 'anna@example.invalid',
    sagsbehandler_telefon: '12345678',
    kontrol: 'Bo Nielsen',
    kontrol_initialer: 'BN',
    kontrol_telefon: '87654321',
    kontrol_mail: 'bo@example.invalid',
    kontrollant_i_bunden: control,
  });
  c.data = reportData(c.result, c.metadata, c.valg, c.tekster);
  cases.push(c);
}
await mkdir(new URL('.local/output/r3/', root), { recursive: true });
for (const c of cases) {
  const figures = reportFigures(c.result, c.settings, c.table);
  const request = reportDocument(c.data, figures, assets);
  compiler.resetShadow();
  for (const [path, content] of Object.entries(request.files)) {
    if (path.endsWith('.typ') && typeof content === 'string')
      compiler.addSource(`/${path}`, content);
    else
      compiler.mapShadow(
        `/${path}`,
        typeof content === 'string' ? new TextEncoder().encode(content) : content,
      );
  }
  compiler.addSource('/rapport.typ', request.main);
  const compiled = await compiler.compile({
    mainFilePath: '/rapport.typ',
    format: 1,
    diagnostics: 'full',
    inputs: {},
  });
  if (!compiled.result || compiled.diagnostics?.length)
    throw new Error(`${c.name}: ${JSON.stringify(compiled.diagnostics)}`);
  await writeFile(new URL(`.local/output/r3/${c.name}.pdf`, root), compiled.result);
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
        .map(([, v]) => v),
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
      DEFAULT_COMPANY_PROFILE.titel,
      DEFAULT_COMPANY_PROFILE.slogan,
      DEFAULT_COMPANY_PROFILE.sidefod,
      ...DEFAULT_COMPANY_PROFILE.afsluttende_afsnit
        .filter((a) => a.noegle.slice(6) in c.data.formattedTexts)
        .map((a) => a.titel),
      'Dimensioneringsgrundlag:',
      ...('oplyste_forudsaetninger' in c.data.formattedTexts ? ['Forudsætninger:'] : []),
      ...('generelle_forudsaetninger' in c.data.formattedTexts
        ? ['Generelle dimensioneringsforudsætninger for MSL opbygning:']
        : []),
      ...(c.data.grundlag ? [c.data.grundlag.overskrift + ':'] : []),
    ],
    context: c.data.context,
    medarbejdere: c.data.medarbejdere,
    formattedTexts: c.data.formattedTexts,
    forbiddenStrings: c.name === 'b046-omitted-sections' ? ['Forudsætninger:', 'Udførelse:'] : [],
    grundlag: c.data.grundlag,
    sections: c.data.sections,
    profile: DEFAULT_COMPANY_PROFILE,
    // SVG-tekst bliver kurver i PDF'en; kontrolleres som figurdata/sidebillede,
    // ikke med PDF-tekstudtræk. strings ovenfor er PDF-tekstkontrollens liste.
    figureTitles: figures.designdiagram ? [figures.designdiagram.export.title!.text] : [],
    figureCalls: { construction: figures.constructionCall, diagram: figures.diagramCall },
  };
  await writeFile(
    new URL(`.local/output/r3/${c.name}.expected.json`, root),
    JSON.stringify(expected, null, 2),
    'utf8',
  );
  console.log(`${c.name}: ${compiled.result.length} bytes`);
}
