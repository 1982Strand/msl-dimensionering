# Delplan: PDF-rapport og redigerbar firmaprofil

30.09.2026. **Godkendt i A-011/B-029 med brugerens præciseringer.** Følger den genlæste/rettede `CODEX-OPGAVE.md`, AGENTS.md og B-026–030. Browserkompilering med typst.ts og rækkefølgen er godkendt. De konkrete visuelle udkast forelægges særskilt; demoen ændres ikke.

**B-049-hjælperstatus — 01.10.2026:** Implementeret i worktree `b049`:
Kvalitetssikring erstatter Kontrollant/Kontrol i brugerfladen og PDF-etiketten;
lagringsnøgler og eksisterende persondata bevares. Afkrydsningen står i
kvalitetssikringens kolonne. `formatPhone` bruges i PDF, kartotekets visning og
ved telefonfelternes blur; underskriften viser navn, telefon, mail.
Grundlags- og resultatlinjer har stabile nøgler, visningsvalg, tekst-/værdifelter
(også flerliniers værdier) og Nulstil. Rettelser gemmes sammen med deres
beregnede tekst/værdi; ændret eller bortfaldet linje fjerner rettelsen med en
info-besked. Visningsvalg bevares særskilt; fælles nulstilling dækker begge dele.
Standard-materialenavne danner fortsat den beregnede materialelinje. Tomt grundlag
udelades med overskrift; tom resultattabel udelades med bevaret overskrift/indledning.

Typekontrol, alle **2.993 Node-tests**, formattering/formatteringskontrol og build
består. De ti originale rapportkontekster matcher præcist uden ændrede referencer.
B-049-elementerne er eksplicit indført som afvigelser i rapportsidereferencetesten.
`node tools/build-report-pdfs.ts` danner 17 PDF'er uden compilerdiagnoser, inklusive
opdaterede B-048-personcases, `b049-rettede-linjer` og `b049-skjult-resultattabel`
i `.local/output/r3/`. Første/sidste side af personcasen samt de to sider med
rettede tabellinjer er renderet med Windows' PDF-renderer og visuelt kontrolleret.
PDF-tekstudtræk kontrollerer omdøbning, telefonrækkefølge, rettelser og fravalg;
den skjulte resultattabel og underskriften uden kvalitetssikring er også visuelt kontrolleret.

`PW_PORT=5203 npx playwright test tests/browser/report.spec.ts tests/browser/company-profile.spec.ts`
er forsøgt: alle **11** forløb afvises ved Chromium-start med **`spawn EPERM`**, før
testhandlingerne udføres. B-049-forløbet bruger eksisterende `ready()`, filnavnsprædikat
ved download og MutationObserver til kortvarig spærring/forældelse; det kontrollerer
PDF-tekst med den eksisterende systemkommando `pdftotext`, lagring ved genåbning,
Eᵤ-ændring med nulstillingsbesked og telefonfeltets formatering. Browserkontrol og
samlet visuel forelæggelse ved den styrende agent/R6 udestår. Semble CLI er anvendt
(cachelagring afvist); Serena-start afvises af skrivebeskyttet logmappe i sandkassen.
Build har den eksisterende advarsel om store chunks. Ingen pakker er installeret,
ingen beskyttede reference-/dimensioneringsfiler er ændret, og intet er committet.

## Arkitekturforslag

PDF'en dannes i browseren med typst.ts. Rapportdata og firmaprofil sendes ikke til en rapportserver. Resultatet hentes som lokal fil. Appen beholder samme beregningsmotor som resultatvisningen; rapportmotoren **genberegner intet**.

Der er tre adskilte lag:

1. **Firmaprofil:** redigerbare værdier, logo og rapportidentitet.
2. **Layout:** versioneret Typst-kode med navngivne layoutindstillinger; udgangspunkt er demoens `skabelon/layout.typ`, ikke prototypens faste Word-koordinater.
3. **Rapportdata:** TypeScript-dannelse af originalens tekster, tabeller, valg og figurer fra de aktuelle motorresultater.

Afhængighederne `@myriaddreamin/typst.ts` og `@myriaddreamin/typst-ts-web-compiler` låses begge til **0.7.0** med låsefil. Demoens `node_modules` kopieres ikke. Den målte WASM-fil er 28.325.178 bytes, ca. 28 MB. Den indlæses først ved åbning af rapport/firmaprofil; første indlæsning og genbrug fra browsercache måles og dokumenteres. En compiler-worker foreslås for at holde formularen responsiv.

Compiler, fonte og aktiver leveres fra appens egen oprindelse; der anvendes ingen eksterne fonttjenester eller CDN-kald. Det betyder ikke en færdig offlineapp. Demoens ca. 350/20 ms er observationer i demoen, ikke et løfte for den komplette rapport.

Browserpakken indeholder `typst-assets-0.14.2`, men det beviser ikke compilerens præcise Typst-version. Den tidligere CLI-prototype brugte 0.15.1. Kompileringskontrol skal derfor bruge **samme browsercompiler som appen**; en CLI-kontrol kan supplere, men erstatter den ikke. Version og faktisk skabelonkompatibilitet dokumenteres.

Carlito og Liberation Sans med licensfiler distribueres som lokale fonte. Calibri og Arial distribueres ikke. Ligaturer slås fra som i demoen. Eᵤ, φᵥ, specialtegn og tekst i SVG kontrolleres med de indlejrede fonte.

## R1 — rapportdata med præcis originalkontrol

Portér følgende fra `core/rapport.py` ved `a330cfd6734ac2478be1304a362c69f94e412d25`:

| Funktion/data                      | Originallinje | Ansvar                           |
| ---------------------------------- | ------------- | -------------------------------- |
| `_format_dato_dk`                  | 40            | Datoformat                       |
| `STANDARD_TEKSTER`                 | 156           | De syv originale standardtekster |
| `upper_geonet_frac_for_sub_lag`    | 206           | Geonetplacering til figurer      |
| `_materiale_resume`                | 463           | Materialeresumé                  |
| `STANDARD_MATERIALER_RAPPORT`      | 495           | Rapportens standardmaterialer    |
| `grundlag_linjer`                  | 498           | Grundlagslinjer og tilvalg       |
| `formatér_dimensioneringsgrundlag` | 576           | Grundlagstabel                   |
| `_yderomraade_tekst`               | 597           | Yderområdenoter                  |
| `formatér_dimensioneringsresultat` | 656           | Resultattekst og værdier         |
| `_fjern_tomt_grundlag`             | 1004          | Udeladelse af tomt grundlag      |

Nye TypeScript-strenge og tabelværdier sammenlignes præcist med **alle ti** eksisterende cases i `reference/report-contexts.json`. Prototypens allerede formaterede referencedata er ikke en portering: den nye datadel skal selv danne output fra casens rå input/resultater. Ekstra referencer optages kun for udækkede valg i en isoleret originalcheckout; opsamleren nægter at overskrive forventningsfiler. Ingen tolerance er godkendt.

Overskrifter, afsnitsrækkefølge og tekstindhold bevares. Bevidst tom tekst gengives tom under den bevarede overskrift uden standardfallback, som originalens baseline `empty-text.pdf`. Den tidligere udeladelsesformulering var en fejl i opgavefilen, ikke originaladfærd. Fravalgt grundlag fjerner den relevante tabel og overskrift. FUND-005 og A-006 ændres ikke: rapportstandardtekster tilpasses ikke automatisk til beregningssagen. De syv standardtekster flyttes ikke ind i firmaprofilen.

**R1-status — 01.10.2026:** `src/report/report-data.ts` porterer de ti angivne funktioner/data samt kontekstdannelsen fra `byg_rapport_docx`. Input er motorresultat, projektfelter, rapportvalg og redigerede tekster; der genberegnes intet. `reportData()` returnerer `context` uden billeder, de syv `sections` i original rækkefølge og `grundlag`; sidstnævnte er `null`, når både grundlagstabel og overskrift skal udelades. R3 skal anvende dette signal i layoutet. Tomme tekstafsnit beholder deres overskrifter.

`tests/report-data.test.ts` genskaber alle ti tilfældes rå motorinput fra widgets/standarddata i `ui-flows.json` og projektfelter/valg/tekst fra optagelsesopskriften i `prepare_reference.py`. Hele motorresultatet kontrolleres først, derefter alle kontekststrenge/tabelværdier og `sections` præcist mod `report-contexts.json`; kun billedfelterne udelades. Ingen værdinormalisering eller tolerance bruges. Python-tupler er allerede JSON-arrays, og TypeScript-tupler er arrays, så ingen yderligere typenormalisering er nødvendig. De øvrige aktive UI-snapshots med rapportdata kontrolleres også mod deres originale rapporttabeller. Ingen sessionsværdier mangler for de ti tilfælde, og ingen referenceforventninger er ændret. FUND-005/A-006 bevares. Typekontrol, alle 2.836 tests, formattering/formatteringskontrol og build består. Figur- og PDF-layoutkontrol tilhører fortsat R3/R6.

## R2 — browsercompiler og driftsforløb

**R2-status — 01.10.2026:** `compiler.ts` indlæser typst.ts 0.7.0 og lokal WASM ved behov samt otte lokale Carlito/Liberation Sans-snit via Vites `BASE_URL`, uden standardfontaktiver/CDN. `compilePdf({ main, files })` erstatter filgrundlaget med `resetShadow`, `addSource` og `mapShadow`. Fulde diagnoser kræver `compiler.compile` som i demoen; `$typst.pdf()` skjuler dem. Initialiseringen deles og kan gentages efter fejl: wrapperen initialiseres før bibliotekets `LazyWasmModule`, som også gemmer afviste promises. Skrifter gives til `preloadFonts` som bytes efter HTTP-kontrol.

`compile-queue.ts` samler ventende ændringer og kasserer ældre revisioner/fejl. Objekt-URL'er frigives ved ny revision, fejl og nedlukning. Danske fejl adskiller indlæsning, skrift, kilde og kompilering og viser fil samt linje/kolonne med +1. Ti tests med falsk compiler dækker forløbene. **`#rapport-kompilering` og `ReportCompileCheck.tsx` fjernes ved R4**; testsiden er uden navigationspunkt.

Bygget WASM i `dist/assets/typst_ts_web_compiler_bg-D2mWRS72.wasm`: **28.325.178 bytes**. Samme WASM rapporterer **Typst 0.14.2** via `str(sys.version)` og PDF'ens Creator. Supplerende Node-kørsel danner PDF med begge fontfamilier indlejret, viser den faktiske diagnose `{ path: '/rapport.typ', range: '11:14-11:15', severity: 'error', message: 'unclosed delimiter' }` som linje 12/kolonne 15 og kompilerer efter rettelse. **173/6 ms er rene Node-kompileringstider med indlæst WASM, ikke browsermålinger.**

Typekontrol, 2.885 Node-tests, formattering/formatteringskontrol og build består. `PW_PORT=5195 npx playwright test tests/browser/report-compile.spec.ts` er forsøgt, men Chromium-start afvises med **`spawn EPERM`**; computer-use har ingen browsere. Browserfilen dækker lokal/lazy indlæsning, indlejrede fonte, PDF-header/størrelse, ingen eksterne HTTP-kald, syntaksfejl uden download, rettelse og nyt WASM-forsøg. **Browser-/cachetider og netværkskontrol skal stadig verificeres uden sandkassebegrænsningen.**

Browserkontrol ved den styrende agent 01.10.2026 (Chromium via Playwright mod lokal produktionsbygning): `tests/browser/report-compile.spec.ts` består. Første kompilering inklusive indlæsning af WASM og skrifter 479 ms, anden 5 ms. Ingen netværkskald uden for appens oprindelse, og dimensioneringssiden henter hverken WASM eller rapportskrifter. Målingerne er fra en lokal server og er ikke et løfte for den komplette rapport eller en fjern server.

Compiler-worker er vurderet og udskudt til **R4**, hvor formularens reaktion kan måles. 0.7.0's installerede API'er tilbyder ingen indbygget compiler-worker; en egen worker kræver beskedprotokol, fejltransport og livscyklus. Køen kan senere bruge en worker som sin compiler uden Typst-afhængighed.

Integrér compilerens lokale WASM-indlæsning, `disableDefaultFontAssets`, lokale `preloadFonts`, `mapShadow`/`addSource` og PDF-kompilering efter demoens mønster. Fejl skal vises forståeligt; diagnosernes nulbaserede linjer omregnes til viste linjenumre. Sammenfaldende liveændringer samles, og kun den seneste revision kan blive gældende PDF. Midlertidige PDF-URL'er frigives.

Fejl i indlæsning, font, skabelon eller kompilering må ikke efterlade en downloadknap til en forældet rapport. Der er ingen Word-nødudgang. Kompilering kontrolleres i den understøttede browser med samme pakke/version som produktionen.

## R3 — fælles figurer og Typst-layout

Opbygninger eksporterer vektor fra `construction-svg.ts`. **Rapportens egne originale kaldeargumenter** til opbygningsfiguren optages separat fra skærmkald: snitvalg, størrelse, signatur og alle øvrige visningsargumenter. Skærmreferencer er ikke tilstrækkelige. Det personlige designdiagram kommer fra **M5** som samme selvstændige SVG fra `personal-diagram-svg.ts` på skærm og i rapport, med Carlito i PDF (B-034 afløser Plotly-eksporten). Originalens snit/kurver/markører og valgbetingelser bevares; decimalkomma følger B-035. Afprøv den faktiske SVG i browserens Typst-compiler; kontrollér fonte, akser, etiketter, intervalbånd og clipping. M1's avancerede mellemregningsfigurer tilføjes ikke rapporten.

Referenceoptagelse er nu udført: `reference/report-figure-cases.json` har syv faktiske report-preview-forløb med effektive standardargumenter og eksportmål. Diagrammets rapporttitel, egne margener og 900 × 550-størrelse skal tilkobles under R3; M5's kompatibilitetsprøve er ikke en færdig rapportfigur. `RFIG-custom-input-only` er optagelsens scenarienavn, men dens faktisk observerede snitliste omfatter også uarmeret og 1 lag efter originalens genoprettede widgetstandarder. Ingen forventninger omskrives; en særskilt ren input-snitcase tilføjes før R3-implementation.

Demoens layout kopieres til den nye apps repo med dokumenteret oprindelse. Demoen selv forbliver uændret. Syntetiske billeder erstattes med de faktiske valgte figurer. Layoutet skal håndtere originalens linjeskift, indrykninger og punktopstillinger; demoens simple tekstfunktion er ikke i sig selv bevis for dette. Afsluttende afsnit bevarer deres overskrift, også ved tom tekst.

Kontrollér lange projektnavne, flerlinjet beskrivelse, lange materialer, tabelværdier, mm/cm, intervaller og yderområde. Overskrifter hænger sammen med følgende indhold, tabeller og billeder forbliver inden for margener, og sidehoved/sidefod har plads på alle sider. Fontvalg og nyt layout kan ændre linje- og sidefordeling i forhold til Word; dette forelægges som layoutændring, mens indholdet bevares.

PDF-indholdskontrollen følger princippet i `check_pdfs.py`: alle dynamiske tekster og tabelværdier skal kunne findes i PDF'en. Normalisering til PDF-tekstkontrol dokumenteres og må kun håndtere renderingsformat, ikke skjule manglende indhold. Figurdata kontrolleres separat uden tolerance. Sidebilleder gennemgås for overlap, clipping, afsnitsafstand, punktopstillinger og sideskift.

**R3-status — 01.10.2026:** Demoens
`skabelon/layout.typ` og `skabelon/rapport.typ` er kopieret med
oprindelseskommentar og tilpasset originalens rækkefølge, fed/kursiv, rammefri
tabeller, bogstavelige punkter, linjeskift og indrykninger. Tomme afsluttende
tekster beholder deres overskrift; `grundlag: null` udelader overskrift og tabel.
Brugerfelter og firmaprofil sendes alene som JSON via `mapShadow`; Typst-kilden
ændres ikke af formularindhold.

`src/report/profile-defaults.ts` dokumenterer hvert standardfelt med XML-element
eller Word-PDF-måling: margener 1701/1560/1134/1134 twips (top/bund/venstre/højre),
sidehoved/-fod 709/981 twips, logo 1534537 EMU bredt, målt placering, grøn
`#247322`, hvid kontaktlinje, Calibri → Carlito og Helvetica/Arial →
Liberation Sans. Titel, slogan, kontaktlinje, underskriftsby og de fem
afsluttende overskrifter/rækkefølge kommer fra originalskabelonen.
Header-/footer-afstandene er Word-ankermål; logo, slogan og sidetal har separate
målte positioner i profil/layout.

`reportFigures()` danner rapportens egne kald uden genberegning. Hele kaldets
argumenter og eksportlayout matcher præcist alle otte frosne figurforløb
(syv + ren input-snitcase), inklusive lagfordeling, geonetplacering, optimalnote,
status, mm/cm, mål/påskrift/signatur, diagramprikker, titel, margener og størrelse.
Python-tupler transporteres som JSON-arrays; rasterparametre `dpi`/`scale`
beholdes som kontroldata, men har ingen rasteriseringseffekt på SVG.
Ingen referenceforventninger eller fælles SVG-renderere er ændret.

`reportDocument(data, figures, assets, profile)` samler `PdfRequest`.
`loadReportAssets(baseUrl)` kan hente de versionerede aktiver ved rapportåbning;
R4 kan levere egne logobytes og profil. Compilerens eksisterende fontpreload
er fortsat nødvendig, selv om fontfiler også findes i requestens filgrundlag.
`node tools/build-report-pdfs.ts` genskaber de ti rapporttilfælde fra rå
UI-widgets/R1-opskriften og danner desuden `special-characters`. Alle PDF'er og
`.expected.json` ligger i `.local/output/r3/`. Feltet `strings` er listen til
PDF-tekstkontrol; SVG-tekst bliver konturer i PDF'en og kontrolleres særskilt
via figurdata og billeder. Normalisering må kun håndtere whitespace/ombrydning,
aldrig værdier, tegnsætning eller Unicode.

Kendte layoutforskelle og resterende kontrol:

- Carlito/Liberation Sans erstatter de originale skrifter; Typst former og
  ombryder tekst anderledes end Word. Linje- og sidefordeling er endnu ikke
  målt for R3 og kræver den styrende agents PDF-tekstkontrol og billedgennemgang.
- Layoutet anvender flydende tekst med sammenhængende overskrift/indhold,
  ikke hardkodede sideskift. Lange tekster og fontsubstitution kan flytte
  resultater, figurer og afslutning mellem sider.
- B-034/B-035 (samt den eksisterende B-040-farve i renderer) ændrer diagrammets
  udseende i forhold til Word-PDF'en: selvstændig SVG, nye farver, bånd,
  prikkede optimale kurver og decimalkomma. M1-figurer medtages ikke.
- Designdiagrammet bruger uændret fælles renderer med Carlito og en ydre
  SVG, der tilføjer rapporttitel og tilpasser til 900 × 550 samt margener
  70/20/70/60. Opbygningen bruger uændret fælles renderer, hvis naturlige
  proportioner indpasses på 1000 × 386 (340 uden signatur). Dette er
  transporttilpasning; tekstplacering og figurers interne udseende skal
  gennemgås visuelt.
- `construction-svg.ts` har fast Arial/Helvetica/sans-serif og ingen
  eksportindstilling for font/størrelse. PDF-fontvalget i denne SVG skal
  verificeres visuelt; en eksplicit fontindstilling kræver senere udvidelse
  af den fælles renderer, som ikke er tilladt i R3-opgaven.
- Baselinebilledet for Standard viser en tom 2-lagssøjle. De nyere optagne
  faktiske rapportkald udelader det ugyldige 2-lagssnit; R3 følger præcist
  de otte figurreferencer. Denne forskel skal vurderes ved samlet referencekontrol.
- Lokal Python/PyMuPDF-rendering kunne ikke startes i hjælperens sandkasse
  (den gamle venv kunne ikke starte sin basis-Python). Den aftalte
  tekstkontrol og sidebilleder udføres af den styrende agent efter R3.
  Ingen endelig PDF-layoutgodkendelse er registreret.

**Styrende gennemgang af R3 (01.10.2026).** To rettelser før merge:

- **Linjeafstand.** Første udgave satte linjen fra versalhøjde til grundlinje med 0 pt afstand mellem afsnit og tabelrækker, så linjer overlappede. Linjeboksen er nu skriftens ascender–descender (`top-edge: "ascender"`, `bottom-edge: "descender"`), som giver Words enkelte linjeafstand (Carlito 11 pt = 13,4 pt), og al afstand følger det gitter.
- **Opbygningsfigurens målestok.** Den fælles opbygnings-SVG (B-025) blev presset ind i originalens Plotly-felt 1000 × 386, hvilket klippede signaturforklaringen og gav ca. 4 pt tekst. Figuren sættes nu i originalens målestok, 0,16 mm/px (originalen: 1000 px = `Cm(16)`), højst 16 cm, centreret. Teksten får dermed originalens størrelse uanset antal snit. Originalens eksportmål kontrolleres fortsat i `tests/report-figures.test.ts`.

PDF-kontrol med PyMuPDF (princippet fra `check_pdfs.py`) af de ti rapporttilfælde og et tilfælde med Typst-specialtegn: alle dynamiske strenge og tabelværdier findes i PDF'en; slogan, kontaktlinje og sidetal `[n]` står på hver side; kun Carlito og Liberation Sans er indlejret; `#panic(...)` i brugertekst vises bogstaveligt. Tomme afsluttende tekster beholder deres overskrifter. Sidebilleder er gennemgået for overlap, clipping, afstande og sideskift.

Kendte forskelle fra Word-PDF'erne (til R6): skriftsubstitution (Calibri → Carlito, Helvetica → Liberation Sans) og figurernes udseende (B-025, B-034) ændrer linje- og sidefordeling; fx bliver `empty-text` 3 sider mod originalens 2. Word-baselinens opbygningsbilleder er skærmbilleder (jf. `report-contexts.json` scope) og viser en tom 2-lagssøjle, som originalens egne rapportkald udelader; rapporten følger rapportkaldene.

## R4 — rapportsiden og alle eksisterende valg

**R4-status — 01.10.2026:** `report-page.ts` og `Report.tsx` tilføjer `#rapport`
med fire nummererede Accordion-afsnit, syv projektfelter, dato, syv tekster,
grundlags-/materiale-/figurvalg, SVG-gennemsyn og PDF-generering via R1–R3.
Projektfelter, tekster og valg gemmes i `EditorContext`, også tomme værdier.
De tre nulstillinger har særskilt omfang. Dato og det startede liveforløb
bevares kun i den åbne appsession; genindlæsning starter med lokal dags dato.
Efter første generering kompileres ændringer automatisk med 180 ms samling
af tastetryk. Fingeraftrykket omfatter rå rapportfelter/valg, motorinput/resultat,
aktive indstillinger, SVG, standardfirmaprofil og begge Typst-kilder. Download
kræver den aktuelle revision; en bevaret gammel PDF vises som forældet. Begge
slags objekt-URL frigives ved erstatning/lukning. Firmaprofilen er R3's standard.

`tests/report-page.test.ts` sammenligner hele indholdsstrømmen i alle fem
frosne rapportcases præcist: sidehoved, undertekst, grøn grundlagslinje,
afsnitsoverskrifter/opsummeringer, expandere, captions, widgets, hjælpetekster,
værdier, deaktivering og rækkefølge. Kun den globale topbjælke og Streamlit-nøgler
udelades; datowidgettens Python-repræsentation transporteres til ISO.
Figurernes tilstedeværelse og overskrifter kontrolleres her; deres indhold
kontrolleres fortsat af R3. Filnavnsreglen og nulstilling/ugyldige valg dækkes.
Typekontrol, 2.950 Node-tests, format/formatkontrol og build består.

Den midlertidige compiler-side/test er afløst af `tests/browser/report.spec.ts`
med lagring, dato, nulstillinger, fuld PDF-kæde, skrifter, download/revision,
afvisning, netværk/sidefejl og faktiske WASM-/skabelonfejl. Playwright på port
5196 er forsøgt, men Chromium-start afvises med **`spawn EPERM`**. Browserforløb,
netværkskontrol, kompileringstider og formularens respons skal derfor kontrolleres
af den styrende agent; compiler-worker er ikke indført uden disse målinger.
Siden og PDF'en har fortsat særskilt visuel accept.

Fund: referencens intro omtaler stadig Word, selv om B-026 vælger PDF; teksten
er bevaret for præcis referenceparitet og kræver afklaring ved gennemgang.
Grundlagshjælpen bruger originalens mm også ved cm. Hjælps faktiske otte kapitler
indeholder ingen rapport-genvej; den ønskede »Gå til Rapport« er derfor tilføjet
under kapitlerne i `Help.tsx` sammen med ruten, uden at ændre kapitelindholdet.
Ingen R1–R3-moduler, dimensioneringskomponenter eller referencefiler er ændret.

Reference: `app.py` / `render_rapport` (8782), `_rapport_grundlag_valg` (8711), gemte felter (617–656), filnavn (9350–9354) og rapportfingeraftryk (9360).

- **Projektoplysninger:** Projekt, Beskrivelse, Omfang, Udføres for, Sagsbehandler, Sagsbehandler-mail, Kontrol og Dato. De syv felter Projekt–Kontrol huskes, inklusive bevidst tomme værdier (`app.py:617–631`). Datoen huskes ikke mellem sessioner og starter på lokal dags dato. Nulstil felter bevares.
- **Tekster:** syv redigerbare afsnit med Nulstil pr. afsnit. Tom tekst gengives tom; overskriften bevares.
- **Grundlag:** hver linje kan vælges fra/til. I Standard kan øverste/nederste materiales rapportnavn redigeres; det ændrer ikke beregning eller materialedata.
- **Snit:** Indtastet opbygning, Ustabiliseret opbygning, 1 lag og 2 lag geonet med originalens standardvalg, betingelser og synlighed.
- **Designdiagram:** til/fra, indtastet opbygningspunkt og endepunkter for 1/2 lag efter originalens regler.
- **Handlinger:** Generér rapport og Hent PDF; Word-knappen udgår efter B-026. Uden beregning vises Gå til Dimensionering.

PDF'en navngives `Dimensionering - {projekt} - {dato}.pdf` med originalens dato-/filnavnsbehandling. Demoens genereringsdato erstatter ikke brugerens valgte rapportdato.

**Ny godkendt lagring (B-030):** de syv redigerede tekster, grundlagslinjer, Standard-materialenavne, snitvalg og designdiagramvalg gemmes automatisk mellem sessioner. Tom tekst bevares uden standardfallback. Et gemt valg gælder kun, når det er gyldigt for den aktuelle beregning; ellers gælder originalens betingelse og standard. Bevar Nulstil pr. tekst og Nulstil felter; tilføj en fælles Nulstil tekster og valg til standard, som ikke nulstiller projektfelter, dato, firmaprofil eller beregning.

Et fingeraftryk omfatter beregningsinput/resultater, aktive indstillinger, rapportfelter, tekst, tilvalg, firmaprofil og layoutversion. Når noget ændres, spærres download, indtil en PDF for den aktuelle revision er klar. En ældre forhåndsvisning kan kun blive stående tydeligt markeret som forældet. Dette bevarer originalens spærring og omfatter de nye profilvalg.

**Visuel accept:** forelæg en faktisk rapportside med felter, tekstafsnit, figurvalg og downloadforløb før den betragtes som designgodkendt.

**B-046-hjælperstatus — 01.10.2026:** De syv rapporttekster har Fed/Kursiv/Punkt-værktøjer og et husket »Medtag i rapporten«-valg, som indgår i fælles nulstilling og PDF-revisionens fingeraftryk. Rå kontekststrenge er uændrede; `text-format.ts` danner et separat JSON-lag med afsnit, linjer/punkter, indrykning, underpunkter (inklusive standardens `o`) og tekststykker. Typst tegner rigtige punkter med hængende indrykning samt fed/kursiv uden at fortolke brugertekst som kildekode. Fravalgte afsnit mangler i dokumentdata og layout; medtagne tomme tekster bevarer overskriften. Fravalg af oplyste forudsætninger bevarer dimensioneringsgrundlag og grundlagstabel. De tre diagramvalg ligger i diagramkortet, som også vises ved fravalg; oprindelige betingelser og standarder er bevaret.

Typekontrol, alle **2.972 Node-tests**, formattering/formatteringskontrol og build består. Rapportsidens referencetest navngiver udelukkende B-043/B-046-afvigelserne. `node tools/build-report-pdfs.ts` danner 13 PDF'er uden diagnoser, inklusive `b046-formatted-text` og `b046-omitted-sections`, i `.local/output/r3/` med tekstforventninger og formateringsdata. PDF-tekstkontrol og sidebilledgennemgang udføres fortsat af den styrende agent før R6. Browserpakken på **port 5201** er forsøgt; alle syv forløb afvises før testhandlingerne med `browserType.launch: spawn EPERM`. Browserkontrol af værktøjer, markering/fokus, fravalg/revisionsspærring, genåbning og diagramkort skal derfor gentages uden sandkassebegrænsningen. Semble CLI er anvendt (cachelagring afvist); Serena-start er forsøgt, men logfilen under brugerens `.serena` er skrivebeskyttet i sandkassen. Ingen pakker er installeret eller referenceforventninger ændret.

## R5 — firmaprofil og lagring

**B-048-hjælperstatus — 01.10.2026:** Firmaprofilen har kortet »Medarbejdere« med
Navn, Initialer, Mail og Telefon samt tilføj/ret/slet. Gyldige værdier gemmes
automatisk og indgår i profilens eksport/import og nulstilling; standardkartoteket
er tomt. Ugyldige kladder markeres og erstatter ikke sidst gyldige data. Ugyldigt
kartotek i import afvises samlet. Version 1-profiler fra før B-048 uden kartotek
kan fortsat indlæses med tomt kartotek.

Sagsoplysninger har to personkolonner med kartotekvalg og manuelt redigerbare
felter. Den eksisterende `rap_kontrol` bevarer gemte navne. Nye felter og
»Kontrollant i bunden af rapporten« huskes og ryddes med »Nulstil felter«;
datoens hidtidige sessions-/nulstillingsforløb er bevaret. Personfelter, valg og
kartotek indgår i PDF-revisionens fingeraftryk. Rapportens separate JSON-personlag
viser initialer øverst med navnefallback, sagsbehandlerens navn/mail/telefon og
valgfrit kontrollantens navn/telefon/mail i en nabokolonne uden overskrifter.
Tomme linjer udelades. Originalens kontekststrenge og ti referenceforventninger
er uændrede; rapportsideudvidelserne navngives eksplicit som B-048 i testen.

Typekontrol, alle **2.976 Node-tests**, formattering/formatteringskontrol og build
består. `node tools/build-report-pdfs.ts` danner 15 PDF'er uden diagnoser, inklusive
`b048-uden-kontrollant` og `b048-med-kontrollant`, i `.local/output/r3/`. Alle 15
PDF'ers forventede tekster er kontrolleret med PyMuPDF med kun whitespace-normalisering.
De ti originale PDF'er er desuden byteidentiske med en isoleret kompilering med
layoutet fra worktreens HEAD før B-048; sammenligningen ligger lokalt i
`.local/compare-original-pdfs.mjs` og `.local/output/b048-before/`.
Begge B-048-eksemplers første og sidste sider er renderet og visuelt gennemgået;
initialer, telefonrækkefølge og de to underskriftskolonner er kontrolleret.

`PW_PORT=5202 npx playwright test tests/browser/report.spec.ts tests/browser/company-profile.spec.ts`
er forsøgt: alle ti forløb afvises ved Chromium-start med **`spawn EPERM`**, før
testhandlingerne udføres. Den nye browsertest dækker to personer, validering,
valg af begge roller, manuel rettelse, MutationObserver-spærring/ny revision,
genåbning, profilrundtur, sletning og nulstilling. Browserkontrol og den styrende
agents visuelle forelæggelse/R6 udestår. Semble CLI er anvendt (cachelagring afvist);
Serena-start er forsøgt, men logmappen under brugerens `.serena` er skrivebeskyttet
i sandkassen. Ingen pakker er installeret, og ingen referencefiler er ændret.

**R5-hjælperstatus — 01.10.2026:** Implementeret i worktree `r5-firmaprofil`:
ren profilmodel med feltvalidering, streng JSON-import/eksport inklusive MIME/base64-logo,
fletning i originalstandarden og bevarelse af alle fem afsnitsnøgler. Firmaprofil-fanen
bruger de godkendte kort/Tabs-komponenter og rapportens eksisterende kompileringskø,
PDF-visning og downloadspærring. Fanen huskes i sessionStorage. Små profilværdier ligger
i `msl.company-profile.v1`; logobytes ligger i IndexedDB under en uforanderlig revision.
Logoets transaktion afsluttes før profilen publiceres. Ved fejl vises en dansk besked,
og den sidst konsistente profil bruges; forrige revision bevares til genåbning.

Originalprofilen og Typst-layoutet er uændrede. `report-document.ts` understøttede allerede
PNG/JPEG/SVG og samtlige profilfelter, så yderligere layoutændringer var ikke nødvendige.
Supplerende kompilering med samme typst.ts/WASM bekræfter byteidentisk standard-PDF,
PNG-billedobjekt i ændret PDF og SVG-kompilering uden diagnoser. Eksempler ligger lokalt
i `.local/output/r5/`. Ni nye Node-tests dækker grænser, logoformat/checksum, fletning,
rundtur, ugyldig import, lagerfejl og konsistent genåbning. Alle 2.959 Node-tests,
typekontrol, formattering/formatteringskontrol og build består.

`PW_PORT=5198 npx playwright test tests/browser/company-profile.spec.ts tests/browser/report.spec.ts`
er forsøgt: alle otte browserstarter afvises med **`browserType.launch: spawn EPERM`**,
før testhandlingerne udføres. Browserforløb, netværks-/sidefejlskontrol og visuel gennemgang
skal derfor køres af den styrende agent uden denne sandkassebegrænsning. Serena er forsøgt,
men Python-sprogserveren kan ikke starte uden `uv`/`uvx`; Semble CLI er brugt.
Ingen pakker er installeret. Firmaprofilens visuelle accept og R6 udestår fortsat.

**Placering foreslået:** en særskilt Firmaprofil-fane på rapportsiden, med felter og PDF-forhåndsvisning ved siden af hinanden. Placeringen er et designforslag; et konkret udkast forelægges til godkendelse. Demoens Layout (kode)-fane medtages ikke, og der kommer ingen upload af hele Typst-skabeloner.

Profilen gælder alle rapporter. **Standardværdier udledes af originalrapporten og prototypens målte værdier, ikke demoens margener.** Hver værdi dokumenteres med kilde/måling; uundgåelige forskelle, fx fontsubstitution og linje-/sidefordeling, listes særskilt ved PDF-accept. Demoens redigeringsgrænser er kontrolgrænser, ikke nye standardværdier.

| Område        | Redigerbare værdier                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| Logo          | PNG/JPEG/SVG, højst 2 MB; bredde 15–90 mm; alle sider eller kun første                                    |
| Identitet     | Slogan, sidefodens kontaktlinje, firmafarve, sidefodens tekstfarve; farvede overskrifter fra som standard |
| Skrift        | Carlito/Liberation Sans til brødtekst og sidehoved/-fod; 9–13 pt                                          |
| Margener      | Top 15–60 mm, bund 20–60 mm, venstre/højre 10–40 mm                                                       |
| Sidetal       | `[1]` som standard eller `Side 1 af 3`                                                                    |
| Faste tekster | Titel og by ved underskrift                                                                               |
| Afslutning    | Overskrift og rækkefølge for de fem afsluttende afsnit                                                    |

Alle fem afsluttende afsnit findes altid i profilen og kan ikke slettes dér. Rapporten bevarer deres overskrifter også ved bevidst tom tekst. Profilen ændrer overskrifter/rækkefølge, ikke de syv afsnits standardindhold.

Gyldige ændringer anvendes og gemmes automatisk efter B-019; ugyldige værdier markeres og anvendes ikke. Live PDF-forhåndsvisning, Nulstil til standard og Importér/Eksportér profil som én JSON-fil **inklusive logo** medtages. Import validerer struktur, intervaller, farver, fontnavne, afsnitsnøgler og logoformat/størrelse, før den erstatter den aktive profil.

Små profilværdier kan ligge i det eksisterende browserlager. **IndexedDB foreslås til logoets binære data**, så en data-URL ikke opbruger localStorage. Logo og profil kobles via en revisionsreference; en gemmefejl skal vises og må ikke efterlade profilen med et manglende logo. Ingen navngivne dataprofiler, konti eller serverlagring tilføjes. Lagringen kontrolleres ved genåbning i samme browser, også efter profilimport/nulstilling.

**Visuel accept:** forelæg profilsiden med ændret logo, marginer, farver og omarrangerede overskrifter i live PDF. Demoens design er reference, ikke en allerede godkendt løsning.

## R6 — samlet accept af PDF

Forelæg PDF'er for Standard og Brugerdefineret, belastnings- og trafikklasse, mm/cm, intervalprodukt, ugyldig kombination og yderområde. Brug så vidt muligt de ti eksisterende referencecases; tilføj kun nødvendige lange tekster, fravalg, tomme afsnit og profilvariationer.

Kontrol omfatter indhold, figurdata, fonte, logo, indrykninger, punktopstillinger, alle sideskift, sidehoved/-fod, sidetal, snitvalg, filnavn og spærring efter ændringer. Firmaprofilens yderværdier må ikke producere overlappende indhold uden en tydelig fejl. Endelig PDF-layoutgodkendelse registreres med brugerens ordlyd; B-026's krav om perfekt opsætning er først opfyldt ved denne konkrete gennemgang.

**R6-forberedelse — hjælperstatus 01.10.2026.**
`node tools/build-r6-pdfs.ts` danner 31 PDF'er i `.local/output/r6/`. R3 og R6
deler rå cases, B-046/B-048/B-049-varianter og lokal compiler-/fontindlæsning.
Ingen browser, netværk, nye pakker eller nye referenceforventninger anvendes.
OUT-2's rå input læses fra `reference/dimensioning-page-cases.json`: trafikklasse
T1, Eᵤ = 10 MPa, TX160 og `under_inden/under_uden = vejdim`. Motoren genbruges
uændret; supplerende projekt- og persondata er syntetiske.

| PDF i `.local/output/r6/`                 | Hvad der afprøves                                                     |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `01-standard-bk4-mm.pdf`                  | Standard, belastningsklasse 4, mm; ugyldigt 2-lagssnit udelades       |
| `02-standard-to-geonetlag.pdf`            | Standard med gyldig 2-lagskombination                                 |
| `03-intervalprodukt-nx850.pdf`            | Intervalprodukt Tensar InterAx NX850, 1/2 lag og intervalbånd         |
| `04-standard-trafikklasse-t4.pdf`         | Standard, trafikklasse T4 og VejDim-grundlag                          |
| `05-brugerdefineret-tre-materialelag.pdf` | Brugerdefineret, tre materialelag, mm                                 |
| `06-brugerdefineret-manuel-phi.pdf`       | Brugerdefineret med manuelt angivet friktionsvinkel                   |
| `07-brugerdefineret-cm.pdf`               | Brugerdefineret med cm i tabeller og figurer                          |
| `08-tomme-afsnit.pdf`                     | Alle syv tekster bevidst tomme; overskrifter bevares                  |
| `09-fravalgt-grundlag.pdf`                | Alle grundlagslinjer fravalgt; tabel og overskrift udelades           |
| `10-lange-afsnit.pdf`                     | Lang forudsætningstekst med mange afsnit og sideskift                 |
| `11-specialtegn.pdf`                      | Bogstavelige Typst-specialtegn og flerlinjet beskrivelse              |
| `12-formateret-tekst.pdf`                 | B-046: fed, kursiv, punkter, underpunkter og hængende indrykning      |
| `13-fravalgte-afsnit.pdf`                 | B-046: afsnit og deres overskrifter fravalgt                          |
| `14-personer-uden-bundkolonne.pdf`        | Sagsbehandler i bunden; kvalitetssikring kun som initialer øverst     |
| `15-personer-med-bundkolonne.pdf`         | Sagsbehandler og kvalitetssikring i to bundkolonner; telefon før mail |
| `16-rettede-og-fravalgte-linjer.pdf`      | B-049: redigeret tekst/værdi og fravalgt resultatlinje                |
| `17-fravalgt-resultattabel.pdf`           | Alle resultatlinjer fravalgt; overskrift/indledning bevares           |
| `18-yderomraade-vejdim-out2.pdf`          | Trafikklasse T1 uden for diagrammet; VejDim under inden/uden          |
| `19-lange-projekt-og-tabeltekster.pdf`    | Lange projekt-/materialenavne, flerlinjet beskrivelse og tabelværdi   |
| `20-logo-15mm.pdf`                        | Logo 15 mm                                                            |
| `21-logo-90mm.pdf`                        | Logo 90 mm                                                            |
| `22-logo-kun-foerste-side.pdf`            | Logo og slogan kun på første side                                     |
| `23-margener-minimum.pdf`                 | Alle margener ved minimum: top/bund/venstre/højre                     |
| `24-margener-maksimum.pdf`                | Alle margener ved maksimum: top/bund/venstre/højre                    |
| `25-skrift-9pt.pdf`                       | Brødtekst 9 pt                                                        |
| `26-skrift-13pt.pdf`                      | Brødtekst 13 pt                                                       |
| `27-liberation-sans.pdf`                  | Liberation Sans som brødtekst                                         |
| `28-side-1-af-3.pdf`                      | Sidetal »Side 1 af 3« på standardsagens tre sider                     |
| `29-farvede-overskrifter.pdf`             | Overskrifter i firmafarven                                            |
| `30-lang-sidefod.pdf`                     | Lang kontaktlinje med ombrydning og reserveret plads                  |
| `31-anden-firmafarve.pdf`                 | Anden firmafarve i sidefod og overskrifter                            |

**Kontrol og genkørsel.** Hver PDF har `.expected.json` med alle dynamiske
strenge/tabelværdier, synlig formateret tekst, profil, figurkald og forbudt indhold;
`.content-check.json` og `.layout-check.json` dokumenterer resultaterne.
`manifest.json` samler dækning, sidetal, SHA-256 og kontrolstatus. Skriptet afviser
compilerdiagnoser, manglende/forbudt tekst og fejlet layout-delkontrol. De første ti
PDF'er skal være byteidentiske med R3. Deres kontrolsummer er desuden sammenlignet
med R3 fra **før** opgaven: alle ti er uændrede.

Tekstudtræk bruger systemets `pdftotext -raw -enc UTF-8` (programmet kan vælges
med `PDFTOTEXT`). Indholdsorden bevarer flerlinjede tabelværdier; Xpdfs `-layout`
kan indskyde næste rækkes etiket fra nabokolonnen. Kun whitespace/linjeombrydning
normaliseres, også efter en **eksisterende** bindestreg. Ingen værdier, tegnsætning
eller Unicode ændres. Ved sideskift udelades kun sidebaggrundens præcist verificerede
prefix i en separat brødtekststrøm; slogan, kontaktlinje og sidetal kontrolleres selv
på hver side. Forbudt indhold kontrolleres i begge strømme. SVG-tekst er konturer
og kontrolleres særskilt via figurkald og sidebilleder.

**Layout uden browser — delkontrol.** Typst 0.14.2 / typst.ts 0.7.0 bruger
`runWithWorld → compile → query` og `measure` i separate kontroldokumenter, uden
at ændre de leverede PDF'er. Målinger kontrollerer logo/slogan/titel, fri plads til
sidefod/sidetal og figurbredde. Faktiske billedankre eksporteres også, og logovalget
kontrolleres pr. side. Query afrunder til 0,01 pt; det er alene layoutgeometri,
**ikke** en beregningstolerance. Et forespurgt billedanker kan ligge før centrering
og er derfor ikke en fuld billedboks. Alle færdige tekstlinjers bokse og figurernes
interne clipping kan ikke kontrolleres pålideligt med disse Node-API'er. En separat
SVG-renderer er ikke installeret. `layoutStatus: partial` bevares derfor; styrende
agent overtager **alle tekst-/figurbokse og alle sider med PyMuPDF og billedkontrol**.
Originalens sidehovedankre og farvede sidefod til sidekanten er undtaget fra
brødtekstmarginerne.

**Fund og rettelser i `layout.typ`.**

- 90 mm logo overlappede slogan og titel. Slogan placeres mindst 0,5 mm under
  logoets bund, og tekstområdet mindst 2 mm under sloganet.
- Topmargin 15 mm gav titel-/sidehovedoverlap; bundmargin 20 mm gav overlap med
  sidetal. Margenerne fungerer nu som minimummer, når sidehoved/-fod kræver mere.
- Designdiagrammet var 160 mm bredt i et 130 mm tekstområde ved 40 mm sidemargener.
  Figurer begrænses nu til den tilgængelige bredde.
- Lang kontaktlinje kunne vokse ud af den faste 44 pt sidefod. Den ombrydes inden
  for tekstområdets bredde; flade, sidetal og bundreserve følger den målte højde.
  Billedkontrol afslørede desuden overlap mellem sidefodens linjer: flerlinjet
  kontakttekst bruger nu ascender–descender. Standardsidefod/-placering er uændret.
- Tabulatorindrykning (B-052) gav »expected integer, float, or decimal, found length«.
  Begge funktioner omregner til tal før `calc.rem` og tilbage til pt bagefter.

Windows' PDF-renderer dannede lokale PNG'er i `preview/` (99 sider); procesafslutningen
fejlede med `0xC0000005`. Stikprøver af logo, minimumsmargener, figurer og sidefod er
set, og sidefodens rettelse er genrenderet. Nogle PNG'er udelader sidebaggrund,
selv om PDF-tekst og compilerens billedankre findes; denne observation skal
**afklares i en uafhængig renderer** ved den styrende agents PyMuPDF-kontrol.
Windows-renderingen er ikke dokumentation for fuld, fejlfri visuel kontrol.

**Kendte forskelle fra Word-PDF'erne — liste til forelæggelsen.**
`.local/baseline-pdf` findes ikke her; Word-forskellene bygger på R3-status og den
styrende R3-gennemgang ovenfor, ikke en ny lokal Word-sammenligning.

- Calibri → Carlito og Helvetica/Arial → Liberation Sans. Typsts tekstformning og
  flydende layout ændrer linje-/sidefordeling; R3 målte `empty-text` til tre sider
  mod Word-originalens to. R6 har fortsat tre.
- Opbygningen følger den fælles SVG (B-025). Word-baselinens skærmbilleder har en tom
  2-lagssøjle; originale rapportkald udelader det ugyldige snit, som R3/R6 derfor også
  gør. Originalens målestok bevares op til pladsgrænsen; fonte/clipping kræver billedkontrol.
- Designdiagrammet er selvstændig SVG med farver, intervalbånd, prikkede optimale
  kurver og decimalkomma (B-034/B-035/B-040). Rapporttitel/margener er R3's
  transporttilpasning; kurverne er uændrede. M1-figurer medtages ikke.
- B-046/B-047/B-052: rigtige punkter, hængende indrykning, underpunkter med »◦«,
  fed/kursiv, tabulatorindrykning og fravalg af hele afsnit. Bevidst tomme,
  medtagne afsnit bevarer fortsat overskrifterne.
- B-048/B-049/B-052: initialer, »Kvalitetssikring:«, telefon i cifrepar før mail,
  valgfri ekstra bundkolonne samt redigerede/fravalgte tabellinjer.
- Profilvariationerne kan flytte sideskift yderligere: logo og små margener kræver
  reserveret plads, store sidemargener reducerer figurer, og lang sidefod bliver
  højere. Margenfelterne er minimummer her. Standardprofilens ti PDF'er er byteuændrede.

**Kontroller.** `npm run typecheck`, alle **2.994 Node-tests**, `npm run format`,
`npm run format:check` og `npm run build` består (på Windows via `npm.cmd`).
Begge PDF-byggescripts består: R3 danner 17 PDF'er, R6 danner 31 PDF'er/99 sider
med bestået indholdskontrol og layout-delkontrol. Særskilt streng TypeScript-kontrol
af byggescripts og delte værktøjer består også. Build har den eksisterende
advarsel om store chunks. Ingen pakker er installeret; intet er committet eller
merget, og beskyttede filer er uændrede.

**Udestår hos styrende agent:** PyMuPDF-/billedkontrol inklusive den observerede
Windows-rendererafvigelse, direkte Word-baselinesammenligning og konkret forelæggelse
med forskelslisten. Download-/spærringsforløb i browseren er ikke genkørt af disse
scripts. Endelig PDF-godkendelse efter B-026 er fortsat en særskilt beslutning.

## Konkrete cases pr. del

RC-ALL betyder alle ti eksisterende cases i `reference/report-contexts.json`, med deres egne rå input og tilvalg. Nye referencecases optages fra isoleret a330cfd før den berørte implementation og må ikke overskrive forventninger. FIG-input henviser til mellemregningsplanens fire fastlagte sager.

| Del | Konkrete cases/input                                                                                               | Kontrol                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | RC-ALL; baseline `empty-text.pdf`; FIG-001 med alle grundlagslinjer fravalgt                                       | Eksakte strenge/tabeller; tom tekst bevarer overskrift; grundlagsoverskrift/tabel fjernes ved fravalg                                 |
| R2  | FIG-001 PDF; tre hurtige profilændringer; compilerfejl ved ugyldig lokal testskabelon                              | Seneste revision, forståelig fejl, spærret gammel download; første indlæsning/cache                                                   |
| R3  | FIG-001–004; rapportvalg kun 1 lag, kun 2 lag, intet snit, alle gyldige snit; signatur til/fra                     | Originale rapportkald med størrelse/signatur/snitvalg; figurdata, SVG-fonte og Typst-rendering                                        |
| R4  | Projekt “MSL test”; tom Beskrivelse; valgt dato; tomt tekstafsnit; genåbning; FIG-003→FIG-001                      | Syv felter huskes, dato starter på dags dato; tekster/valg huskes; ugyldige gemte valg bruger originalstandard; tre slags nulstilling |
| R5  | Originalt målt profilgrundlag; nyt PNG-logo; SVG-logo; 2 MB-grænse; margin-/fontgrænser; eksport/import; genåbning | Standardernes kilde, validering, logo og lagerrevision, fem overskrifter inkl. tom tekst, live preview                                |
| R6  | RC-ALL; lange projekt/materialetekster; baseline empty-text; R3's snitfravalg; ændret logo/profil                  | Komplet PDF-indhold, sideskift, overskrifter, punktopstillinger, figurer, filnavn og eksplicit afvigelsesliste                        |

## Rækkefølge og afslutning

1. M5 fra mellemregningsplanen, derefter **R1** datadannelse.
2. **R2** browsercompiler og **R3** fælles figurer/skabelon.
3. **R4** rapportside og **R5** firmaprofil, med særskilte designudkast.
4. **R6** samlet PDF-gennemgang og brugeraccept.

Nye tests målrettes dataparitet, de ændrede download-/lagerforløb og layoutets konkrete risici efter B-021. Der køres ikke fuld browserpakke for hver kosmetisk justering. README, migrationsplan og funktionsmatrix opdateres med faktisk afsluttet omfang og åbne acceptpunkter.

Browserarkitektur og rækkefølge er godkendt i B-029. Senere kræves særskilt godkendelse af M5, M1-figurer, profilsiden, rapportsiden og den endelige PDF. Arbejde sker på `codex/`-grenen; gammel app og demo ændres ikke, og der merges eller offentliggøres ikke.
