# Delplan: PDF-rapport og redigerbar firmaprofil

30.09.2026. **Forslag til godkendelse før kodning (A-011).** Følger `CODEX-OPGAVE.md`, AGENTS.md og B-026–028. PDF alene med Typst og lokal download er besluttet; browserkompilering og nedenstående arbejdsrækkefølge forelægges nu. Ingen rapportkode eller demo ændres med denne plan.

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

Overskrifter, afsnitsrækkefølge og tekstindhold bevares. Bevidst tomme tekster udelades uden standardfallback. Fravalgt grundlag fjerner den relevante tabel og overskrift. FUND-005 og A-006 ændres ikke: rapportstandardtekster tilpasses ikke automatisk til beregningssagen. De syv standardtekster flyttes ikke ind i firmaprofilen.

## R2 — browsercompiler og driftsforløb

Integrér compilerens lokale WASM-indlæsning, `disableDefaultFontAssets`, lokale `preloadFonts`, `mapShadow`/`addSource` og PDF-kompilering efter demoens mønster. Fejl skal vises forståeligt; diagnosernes nulbaserede linjer omregnes til viste linjenumre. Sammenfaldende liveændringer samles, og kun den seneste revision kan blive gældende PDF. Midlertidige PDF-URL'er frigives.

Fejl i indlæsning, font, skabelon eller kompilering må ikke efterlade en downloadknap til en forældet rapport. Der er ingen Word-nødudgang. Kompilering kontrolleres i den understøttede browser med samme pakke/version som produktionen.

## R3 — fælles figurer og Typst-layout

Opbygninger eksporterer vektor fra `construction-svg.ts`. Det personlige designdiagram kommer fra **M5**, med samme figurmodel som skærmen. Originalens snit/kurver/markører og valgbetingelser bevares. Kontrollér at SVG-tekst tegnes med de indlejrede fonte, og at akser/etiketter ikke klippes i PDF'en. M1's avancerede mellemregningsfigurer tilføjes ikke rapporten.

Demoens layout kopieres først efter plangodkendelse til den nye apps repo med dokumenteret oprindelse. Demoen selv forbliver uændret. Syntetiske billeder erstattes med de faktiske valgte figurer. Layoutet skal håndtere originalens linjeskift, indrykninger og punktopstillinger; demoens simple tekstfunktion er ikke i sig selv bevis for dette. Dens afsluttende afsnit skal også følge originalens regel om udeladelse af tom tekst.

Kontrollér lange projektnavne, flerlinjet beskrivelse, lange materialer, tabelværdier, mm/cm, intervaller og yderområde. Overskrifter hænger sammen med følgende indhold, tabeller og billeder forbliver inden for margener, og sidehoved/sidefod har plads på alle sider. Fontvalg og nyt layout kan ændre linje- og sidefordeling i forhold til Word; dette forelægges som layoutændring, mens indholdet bevares.

PDF-indholdskontrollen følger princippet i `check_pdfs.py`: alle dynamiske tekster og tabelværdier skal kunne findes i PDF'en. Normalisering til PDF-tekstkontrol dokumenteres og må kun håndtere renderingsformat, ikke skjule manglende indhold. Figurdata kontrolleres separat uden tolerance. Sidebilleder gennemgås for overlap, clipping, afsnitsafstand, punktopstillinger og sideskift.

## R4 — rapportsiden og alle eksisterende valg

Reference: `app.py` / `render_rapport` (8782), `_rapport_grundlag_valg` (8711), gemte felter (617–656), filnavn (9350–9354) og rapportfingeraftryk (9360).

- **Projektoplysninger:** Projekt, Beskrivelse, Omfang, Udføres for, Sagsbehandler, Sagsbehandler-mail, Kontrol og Dato. Standarddato er lokal dags dato, som i originalen. Nulstil felter bevares; værdier inklusive bevidst tomme felter huskes i samme browser/computer.
- **Tekster:** syv redigerbare afsnit med Nulstil pr. afsnit. Tom tekst udelader afsnittet.
- **Grundlag:** hver linje kan vælges fra/til. I Standard kan øverste/nederste materiales rapportnavn redigeres; det ændrer ikke beregning eller materialedata.
- **Snit:** Indtastet opbygning, Ustabiliseret opbygning, 1 lag og 2 lag geonet med originalens standardvalg, betingelser og synlighed.
- **Designdiagram:** til/fra, indtastet opbygningspunkt og endepunkter for 1/2 lag efter originalens regler.
- **Handlinger:** Generér rapport og Hent PDF; Word-knappen udgår efter B-026. Uden beregning vises Gå til Dimensionering.

PDF'en navngives `Dimensionering - {projekt} - {dato}.pdf` med originalens dato-/filnavnsbehandling. Demoens genereringsdato erstatter ikke brugerens valgte rapportdato.

Et fingeraftryk omfatter beregningsinput/resultater, aktive indstillinger, rapportfelter, tekst, tilvalg, firmaprofil og layoutversion. Når noget ændres, spærres download, indtil en PDF for den aktuelle revision er klar. En ældre forhåndsvisning kan kun blive stående tydeligt markeret som forældet. Dette bevarer originalens spærring og omfatter de nye profilvalg.

**Visuel accept:** forelæg en faktisk rapportside med felter, tekstafsnit, figurvalg og downloadforløb før den betragtes som designgodkendt.

## R5 — firmaprofil og lagring

**Placering foreslået:** en særskilt Firmaprofil-fane på rapportsiden, med felter og PDF-forhåndsvisning ved siden af hinanden. Placeringen er et designforslag; et konkret udkast forelægges til godkendelse. Demoens Layout (kode)-fane medtages ikke, og der kommer ingen upload af hele Typst-skabeloner.

Profilen gælder alle rapporter og starter med den nuværende rapports identitet og demoens angivne standardværdier. Alle eksisterende standardværdier dokumenteres ved porteringen; nye margin-/fontvalg kræver endelig PDF-accept.

| Område        | Redigerbare værdier                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| Logo          | PNG/JPEG/SVG, højst 2 MB; bredde 15–90 mm; alle sider eller kun første                                    |
| Identitet     | Slogan, sidefodens kontaktlinje, firmafarve, sidefodens tekstfarve; farvede overskrifter fra som standard |
| Skrift        | Carlito/Liberation Sans til brødtekst og sidehoved/-fod; 9–13 pt                                          |
| Margener      | Top 15–60 mm, bund 20–60 mm, venstre/højre 10–40 mm                                                       |
| Sidetal       | `[1]` som standard eller `Side 1 af 3`                                                                    |
| Faste tekster | Titel og by ved underskrift                                                                               |
| Afslutning    | Overskrift og rækkefølge for de fem afsluttende afsnit                                                    |

Alle fem afsluttende afsnit findes altid i profilen og kan ikke slettes dér. Rapportens regel om at udelade bevidst tom afsnitstekst bevares. Profilen ændrer overskrifter/rækkefølge, ikke de syv afsnits standardindhold.

Gyldige ændringer anvendes og gemmes automatisk efter B-019; ugyldige værdier markeres og anvendes ikke. Live PDF-forhåndsvisning, Nulstil til standard og Importér/Eksportér profil som én JSON-fil **inklusive logo** medtages. Import validerer struktur, intervaller, farver, fontnavne, afsnitsnøgler og logoformat/størrelse, før den erstatter den aktive profil.

Små profilværdier kan ligge i det eksisterende browserlager. **IndexedDB foreslås til logoets binære data**, så en data-URL ikke opbruger localStorage. Logo og profil kobles via en revisionsreference; en gemmefejl skal vises og må ikke efterlade profilen med et manglende logo. Ingen navngivne dataprofiler, konti eller serverlagring tilføjes. Lagringen kontrolleres ved genåbning i samme browser, også efter profilimport/nulstilling.

**Visuel accept:** forelæg profilsiden med ændret logo, marginer, farver og omarrangerede overskrifter i live PDF. Demoens design er reference, ikke en allerede godkendt løsning.

## R6 — samlet accept af PDF

Forelæg PDF'er for Standard og Brugerdefineret, belastnings- og trafikklasse, mm/cm, intervalprodukt, ugyldig kombination og yderområde. Brug så vidt muligt de ti eksisterende referencecases; tilføj kun nødvendige lange tekster, fravalg, tomme afsnit og profilvariationer.

Kontrol omfatter indhold, figurdata, fonte, logo, indrykninger, punktopstillinger, alle sideskift, sidehoved/-fod, sidetal, snitvalg, filnavn og spærring efter ændringer. Firmaprofilens yderværdier må ikke producere overlappende indhold uden en tydelig fejl. Endelig PDF-layoutgodkendelse registreres med brugerens ordlyd; B-026's krav om perfekt opsætning er først opfyldt ved denne konkrete gennemgang.

## Rækkefølge og afslutning

1. M5 fra mellemregningsplanen, derefter **R1** datadannelse.
2. **R2** browsercompiler og **R3** fælles figurer/skabelon.
3. **R4** rapportside og **R5** firmaprofil, med særskilte designudkast.
4. **R6** samlet PDF-gennemgang og brugeraccept.

Nye tests målrettes dataparitet, de ændrede download-/lagerforløb og layoutets konkrete risici efter B-021. Der køres ikke fuld browserpakke for hver kosmetisk justering. README, migrationsplan og funktionsmatrix opdateres med faktisk afsluttet omfang og åbne acceptpunkter.

Planen kræver først brugerens godkendelse af browserarkitekturen og rækkefølgen. Senere kræves særskilt godkendelse af M5, M1-figurer, profilsiden, rapportsiden og den endelige PDF. Arbejde sker på `codex/`-grenen; gammel app og demo ændres ikke, og der merges eller offentliggøres ikke.
