# Delplan: PDF-rapport og redigerbar firmaprofil

30.09.2026. **Godkendt i A-011/B-029 med brugerens præciseringer.** Følger den genlæste/rettede `CODEX-OPGAVE.md`, AGENTS.md og B-026–030. Browserkompilering med typst.ts og rækkefølgen er godkendt. De konkrete visuelle udkast forelægges særskilt; demoen ændres ikke.

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

Opbygninger eksporterer vektor fra `construction-svg.ts`. **Rapportens egne originale kaldeargumenter** til opbygningsfiguren optages separat fra skærmkald: snitvalg, størrelse, signatur og alle øvrige visningsargumenter. Skærmreferencer er ikke tilstrækkelige. Det personlige designdiagram kommer fra **M5**, med samme Plotly-specifikation som skærmen og SVG-eksport via plotly.js. Originalens snit/kurver/markører og valgbetingelser bevares. Afprøv den faktiske Plotly-SVG i browserens Typst-compiler; kontrollér fonte, akser, etiketter, intervalbånd og clipping. M1's avancerede mellemregningsfigurer tilføjes ikke rapporten.

Referenceoptagelse er nu udført: `reference/report-figure-cases.json` har syv faktiske report-preview-forløb med effektive standardargumenter og eksportmål. Diagrammets rapporttitel, egne margener og 900 × 550-størrelse skal tilkobles under R3; M5's kompatibilitetsprøve er ikke en færdig rapportfigur. `RFIG-custom-input-only` er optagelsens scenarienavn, men dens faktisk observerede snitliste omfatter også uarmeret og 1 lag efter originalens genoprettede widgetstandarder. Ingen forventninger omskrives; en særskilt ren input-snitcase tilføjes før R3-implementation.

Demoens layout kopieres til den nye apps repo med dokumenteret oprindelse. Demoen selv forbliver uændret. Syntetiske billeder erstattes med de faktiske valgte figurer. Layoutet skal håndtere originalens linjeskift, indrykninger og punktopstillinger; demoens simple tekstfunktion er ikke i sig selv bevis for dette. Afsluttende afsnit bevarer deres overskrift, også ved tom tekst.

Kontrollér lange projektnavne, flerlinjet beskrivelse, lange materialer, tabelværdier, mm/cm, intervaller og yderområde. Overskrifter hænger sammen med følgende indhold, tabeller og billeder forbliver inden for margener, og sidehoved/sidefod har plads på alle sider. Fontvalg og nyt layout kan ændre linje- og sidefordeling i forhold til Word; dette forelægges som layoutændring, mens indholdet bevares.

PDF-indholdskontrollen følger princippet i `check_pdfs.py`: alle dynamiske tekster og tabelværdier skal kunne findes i PDF'en. Normalisering til PDF-tekstkontrol dokumenteres og må kun håndtere renderingsformat, ikke skjule manglende indhold. Figurdata kontrolleres separat uden tolerance. Sidebilleder gennemgås for overlap, clipping, afsnitsafstand, punktopstillinger og sideskift.

## R4 — rapportsiden og alle eksisterende valg

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

## R5 — firmaprofil og lagring

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
