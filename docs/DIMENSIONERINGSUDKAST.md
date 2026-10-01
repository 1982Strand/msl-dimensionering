# Dimensioneringsformularer i React

Udkastet findes på `/#dimensionering`. Standard og Brugerdefineret er koblet til den eksisterende TypeScript-motor og bruger de aktive materialer, diagrammer, VejDim-kørsler og indstillinger.

Originalens inputvalg bevares: Eᵤ eller Cv, belastningsklasse 1–6 eller trafikklasse T1–T6, navngivne geonetprodukter og i Brugerdefineret ét til tre materialelag med tykkelser i mm. Manuel materialefriktion, kornstørrelse, lagtype og overskrivning af φᵥ er tilkoblet. Minimum 200 mm pr. indtastet lag og øvrige originale feltgrænser gælder fortsat. Standard starter med Eᵤ 10 MPa og klasse 4; Brugerdefineret starter med 300 mm Stabilgrus SGII 0-32 og 400 mm Bundsikringssand.

Formularerne har særskilte værdier pr. tilstand og automatisk lagring i samme browser/computer. Nulstilling rydder dimensioneringsfelter, mens tilstand, grunddata og indstillinger bevares, som originalens nulstilling gør. B-023 godkender bevaret gyldigt Standard-produkt ved navigation; originalens referencecase UI-005 ændres ikke.

Resultatkort viser φᵥ-korrigeret uarmeret tykkelse, tykkelser med ét/to geonetlag og reduktioner. Procenter vises som hele procenttal efter originalens formattering. Afvist trafikgrundlag skjuler resultater. »Alle produkter« følger originalens syv kolonner: Produkt, Klasse, Indeks, 1 lag, Sparet, 2 lag, Sparet. Ugyldige tykkelser og besparelser vises som »—«; Klasse følger det aktuelle belastnings-/trafikgrundlag. Standardorden, kolonnesortering, konservative intervaltykkelser, valgt produkt og rå referencebesparelser er bevaret. Validerings- og placeringsbeskeder kommer fra den porterede motor.

Efter brugerens fire browserkommentarer (B-024) ligger klassevalgene vandret med ombrydning på små skærme. Designdiagrammet og Cv-korrelationstabellen åbnes i popupper, som ikke ændrer hovedboksens størrelse. De kan lukkes med kryds, Escape eller klik udenfor, og fokus vender tilbage til åbningsknappen.

## Kontrol

- Formularadapteren matcher alle 17 originale dimensioneringspayloads uden tolerance, inklusive manuelle lag, φᵥ, trafikklasse og indstillinger.
- Ni nye originale widgetsnapshots registrerer standarder, felter, grænser, produktlabels og afhængigheder. Optagelse sker fra et isoleret arkiv af a330cfd; eksisterende referenceforventninger overskrives ikke.
- Seks nye produktoversigter er optaget fra originalens faktiske HTML i et isoleret arkiv af a330cfd. Alle 120 rækker, kolonner, standardorden og billedtekster matcher i Standard/Brugerdefineret, belastnings-/trafikklasse og mm/cm. Capture-værktøjet nægter ændring af eksisterende forventninger.
- Tre målrettede browserforløb består: resultater og procentvisning, intervalprodukt, B-023, genåbning, afvist trafikklasse, Cv, manuelle materialer, φᵥ, ændret oprunding, integergrænse, afgrænset nulstilling, vandrette klassevalg, popupper, syv produktkolonner/sortering og mobilvisning.
- 2.751 motor-/datatests, typekontrol og produktionsbygning består. De tidligere 21 browserforløb bestod på Windows og Linux ved 6429265; CI omfatter nu 22.

## Stadig under udvikling

Opbygningsfigurer er tilkoblet med originalens tre/fire snit, fælles lodrette skala, netkoter, optimale niveauer, indtastet reference og visningsindstillinger. Seks originale figurcases matcher uden tolerance. Placeringsbeskeder følger den tegnede lagfordeling. Se `OPBYGNINGSFIGURER.md`; det forelagte design er godkendt i B-025. PDF-kontrol og andre figurers visuelle accept udestår.

M1, M3/M7, M4, M5, M6 og M8 er tilkoblet. M1 er godkendt i B-039/B-040; M5 bruger den fælles SVG-renderer efter B-034/B-035/B-040. M9 genskaber de resterende sidetekster, nøgletal, materialetabel og resultatfremhævelser. Produktoversigtens eksisterende datamodel genbruges. Rapporttilkobling, eventuel særskilt komplet M7-tabelkontrol og visuel accept af de endnu ikke godkendte dele udestår. Se den godkendte `MELLEMREGNINGER_PLAN.md`.

Cv-korrelationstabellen og M8-trafikklasse-korrelationen findes lokalt som popupper. Forsiden starter fortsat på Materialer under udviklingen. Samlet navigation og visuel accept behandles senere. Dette udkast er ikke en færdig offentlig app.

Procentindtastning af materialelag og »Anden armering (manuel)« er ikke eksponeret i den gamle apps aktive brugerflade. De indføres ikke som nye forløb uden afklaring; se FUND-002.

## Aktiv φᵥ-opsummering — M6, 30.09.2026

Originalens aktive formelkolonne er nu porteret med præcise tal, fortegn, linjeskift og afrundingsnoter. Elleve originale UI-cases, fire helpercases og ét nyt browserforløb kontrollerer den. Se PHI_OPSUMMERING.md. De ubrugte M2-tabeller forbliver skjult efter B-032; aktive fulde regnelinjer følger i M1. M5’s udkastmarkering er fjernet efter B-031.

## M9 — resterende sidetekster, 01.10.2026

Visningsmodellen i `src/engine/dimensioning-page.ts` danner tekstnoder og tag-/attributnoder. React viser tekst og titler direkte uden rå HTML; originalens inline-stile opbevares alene som metadata til den præcise referencekontrol. Typografi og farver følger appens tema (B-020/B-040). Sideoverskrifter omkring de færdige figurkomponenter kommer fra M9; deres beregninger, SVG, widgets og filer er uændrede. »Alle produkter« er en lukket shadcn Accordion efter B-037. Rækkefølgen er resultat, netvalg, resultatkort, status, opbygning, netdetaljer, designdiagram, produkter, M1 og kontrol-/udførelsesexpandere.

`tests/dimensioning-page.test.ts` sammenligner hvert M9-element i rækkefølge med de 17 optagelser, inklusive fravær. Serialiseringen følger originalens HTML-escaping ved hvert kald: Pythons `html.escape` for escaped tekst/titler, bogstavelige inline-stile og den oprindelige numeriske entitet `&#966;`. Sidens originale markdown-introduktion har et uescaped apostroftegn; dette bevares i referenceprojektionen og vises som sikker React-tekst. Ingen whitespace-normalisering, tolerance eller ændring af referencefiler.

| M9-element | Referencekontrol |
| --- | --- |
| Sidehoved og begge trinhoveder | Fuld tekst/HTML, opsummeringer, enheder, afrunding, k med sænket φ, tilstedeværelse |
| Underetiketter og nøgletal | Fuld boks, klasse/trafikklasse, belastning/anvendelse, alle tabelrækker og hoverforklaring |
| Faste forudsætninger | Original tekst og opsummering, også Standard med afvist trafikgrundlag |
| Materialetabel | Hoved, lagnumre, φ, metalinjer, Samlet og hjælpetekst; M6 ejer formelkolonnen |
| Resultat og Vælg geonet | Originale sidehovednoter og trafikklassens frostforbehold |
| Resultatkort | Alle værdier, beregnet-noter, rå reference, reduktioner, procenter, betinget badge/titel og holder-tekst |
| Yderområde/afvisning | Hele beskeden med fremhævelser og valgt reference; fravær ved gyldigt driftspunkt |
| Opbygning og designdiagram | Originale noter; figurerne ejes fortsat af opbygningskomponenten/M5 |
| Alle produkter | Etiket/antal og lukket starttilstand; eksisterende produktoversigt ejer tabel/sortering |

Originalens forhold bevares: begge aktive kald til resultatkort bruger `standard=False`, så Standard viser »Nødvendig uden geonet« og »1/2 lag geonet«. Badgereglen prioriterer 2 lag, hvis de holder, og derefter 1 lag; den er ikke ændret til en ny minimumssøgning. Trin 2 kalder φᵥ »vægtet« også ved manuel overskrivning. Materialetabellens Samlet viser altid mm, mens trinopsummeringen og resultater følger mm/cm. LT-1 har en tom statusplads. Ingen af disse forhold er rettet.

Typecheck, alle 2.909 Node-tests, format, format:check og build består. Build har den eksisterende advarsel om store JavaScript-chunks. `tests/browser/dimensioning-page.spec.ts` dækker FIG-002, TR-2, cm/mm, fremhævelser, oprindelig rækkefølge, lukket produkt-Accordion, mobile mål og afvisning i begge tilstande. Eksisterende `dimensioning.spec.ts` kontrollerer fortsat alle gyldige tykkelser og procenter og kontrollerer nu også fravær af ugyldige kort. Browserforsøget på port 5194 er blokeret ved Chromium-start (spawn EPERM); browserkontrol og visuel accept skal genkøres ved integration. M9-kontrollen dækker de optagne 17 tilfælde; ikke-optagne grene som manuel materialetabel og trafikgrundlag uden VejDim-punkter følger originalkoden, men er ikke en udvidet referenceoptagelse.

## Kortlægning af hele referencetræet (M9)

Tabellen er genereret med `node tools/dimensioning-page-inventory.ts`, som afviser ukendte elementer. `tests/helpers/dimensioning-page-coverage.ts` klassificerer referencen uafhængigt af M9-modellen. »widgets (UI-reference)« henviser til `reference/dimensioning-ui-cases.json`; diagramvalg i M5 er desuden kontrolleret af M5. »produktoversigten« omfatter tabel, knapper og tabelbilledtekst. Topbjælkens fulde containertræ, logo, versionsnavn og Nulstil er »uden for siden«.

<!-- M9_INVENTORY_START -->
Kortlægningen omfatter alle 907 blade og 721 blokke i de 17 tilfælde. Stier er nulbaserede indeks fra page gennem children, fx 2.1.2.0. Hvert blad forekommer én gang. Fælles kolonne-/containerblokke hører til M9-layoutet; blokkenes indhold følger de særskilte ejere.

| Tilfælde | Del | Elementstier | Blokstier |
| --- | --- | --- | --- |
| FIG-001 | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| FIG-001 | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.1.3`, `2.1.2`, `3`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.5`, `4.6` |
| FIG-001 | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.2.0`, `3.0`, `3.1`, `3.2`, `4.0`, `4.1`, `4.3`, `4.5.0`, `4.6.2` | `4.7` |
| FIG-001 | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `2.1.1.3.0`, `4.2.0.0` | — |
| FIG-001 | M3/M7 | `4.4`, `6.0`, `6.1`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| FIG-001 | opbygningsfiguren | `4.5.1` | — |
| FIG-001 | M4 | `4.6.0`, `4.6.1` | — |
| FIG-001 | M5 | `4.6.3` | — |
| FIG-001 | produktoversigten | `4.7.0.0.0.0`, `4.7.0.0.1.0`, `4.7.0.0.2.0`, `4.7.0.0.3.0`, `4.7.0.0.4.0`, `4.7.0.0.5.0`, `4.7.0.0.6.0`, `4.7.1` | `4.7.0`, `4.7.0.0`, `4.7.0.0.0`, `4.7.0.0.1`, `4.7.0.0.2`, `4.7.0.0.3`, `4.7.0.0.4`, `4.7.0.0.5`, `4.7.0.0.6` |
| FIG-001 | M1 | `5.0` | `5` |
| FIG-001-EKSAKT | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| FIG-001-EKSAKT | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.1.3`, `2.1.2`, `3`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.5`, `4.6` |
| FIG-001-EKSAKT | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.2.0`, `3.0`, `3.1`, `3.2`, `4.0`, `4.1`, `4.3`, `4.5.0`, `4.6.2` | `4.7` |
| FIG-001-EKSAKT | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `2.1.1.3.0`, `4.2.0.0` | — |
| FIG-001-EKSAKT | M3/M7 | `4.4`, `6.0`, `6.1`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| FIG-001-EKSAKT | opbygningsfiguren | `4.5.1` | — |
| FIG-001-EKSAKT | M4 | `4.6.0`, `4.6.1` | — |
| FIG-001-EKSAKT | M5 | `4.6.3` | — |
| FIG-001-EKSAKT | produktoversigten | `4.7.0.0.0.0`, `4.7.0.0.1.0`, `4.7.0.0.2.0`, `4.7.0.0.3.0`, `4.7.0.0.4.0`, `4.7.0.0.5.0`, `4.7.0.0.6.0`, `4.7.1` | `4.7.0`, `4.7.0.0`, `4.7.0.0.0`, `4.7.0.0.1`, `4.7.0.0.2`, `4.7.0.0.3`, `4.7.0.0.4`, `4.7.0.0.5`, `4.7.0.0.6` |
| FIG-001-EKSAKT | M1 | `5.0` | `5` |
| FIG-002 | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| FIG-002 | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.1.3`, `2.1.2`, `3`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.6`, `4.7` |
| FIG-002 | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.2.0`, `3.0`, `3.1`, `3.2`, `4.0`, `4.1`, `4.4`, `4.6.0`, `4.7.2` | `4.8` |
| FIG-002 | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `2.1.1.3.0`, `4.2.0.0` | — |
| FIG-002 | M4 | `4.3`, `4.7.0`, `4.7.1` | — |
| FIG-002 | M3/M7 | `4.5`, `6.0`, `6.1`, `6.2`, `6.3`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| FIG-002 | opbygningsfiguren | `4.6.1` | — |
| FIG-002 | M5 | `4.7.3` | — |
| FIG-002 | produktoversigten | `4.8.0.0.0.0`, `4.8.0.0.1.0`, `4.8.0.0.2.0`, `4.8.0.0.3.0`, `4.8.0.0.4.0`, `4.8.0.0.5.0`, `4.8.0.0.6.0`, `4.8.1` | `4.8.0`, `4.8.0.0`, `4.8.0.0.0`, `4.8.0.0.1`, `4.8.0.0.2`, `4.8.0.0.3`, `4.8.0.0.4`, `4.8.0.0.5`, `4.8.0.0.6` |
| FIG-002 | M1 | `5.0` | `5` |
| FIG-002-EKSAKT | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| FIG-002-EKSAKT | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.1.3`, `2.1.2`, `3`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.6`, `4.7` |
| FIG-002-EKSAKT | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.2.0`, `3.0`, `3.1`, `3.2`, `4.0`, `4.1`, `4.4`, `4.6.0`, `4.7.2` | `4.8` |
| FIG-002-EKSAKT | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `2.1.1.3.0`, `4.2.0.0` | — |
| FIG-002-EKSAKT | M4 | `4.3`, `4.7.0`, `4.7.1` | — |
| FIG-002-EKSAKT | M3/M7 | `4.5`, `6.0`, `6.1`, `6.2`, `6.3`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| FIG-002-EKSAKT | opbygningsfiguren | `4.6.1` | — |
| FIG-002-EKSAKT | M5 | `4.7.3` | — |
| FIG-002-EKSAKT | produktoversigten | `4.8.0.0.0.0`, `4.8.0.0.1.0`, `4.8.0.0.2.0`, `4.8.0.0.3.0`, `4.8.0.0.4.0`, `4.8.0.0.5.0`, `4.8.0.0.6.0`, `4.8.1` | `4.8.0`, `4.8.0.0`, `4.8.0.0.0`, `4.8.0.0.1`, `4.8.0.0.2`, `4.8.0.0.3`, `4.8.0.0.4`, `4.8.0.0.5`, `4.8.0.0.6` |
| FIG-002-EKSAKT | M1 | `5.0` | `5` |
| FIG-003 | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| FIG-003 | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.1.3`, `2.1.2`, `3`, `3.1`, `3.1.0`, `3.1.0.0`, `3.1.0.0.0`, `3.1.0.0.1`, `3.1.0.2`, `3.1.0.2.0`, `3.1.0.2.1`, `3.1.0.2.2`, `3.1.0.2.3`, `3.1.0.4`, `3.1.0.4.0`, `3.1.0.4.1`, `3.1.0.4.2`, `3.1.0.4.3`, `3.1.1`, `3.1.1.1`, `3.1.1.2`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.6`, `4.7` |
| FIG-003 | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.2.0`, `3.0`, `3.1.0.0.0.0`, `3.1.0.1`, `3.1.0.2.0.0`, `3.1.0.2.3.0`, `3.1.0.3`, `3.1.0.4.0.0`, `3.1.0.4.3.0`, `3.1.0.5`, `3.1.0.6`, `3.1.0.7`, `4.0`, `4.1`, `4.4`, `4.6.0`, `4.7.2` | `4.8` |
| FIG-003 | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `2.1.1.3.0`, `3.1.0.0.1.0`, `3.1.0.2.1.0`, `3.1.0.2.2.0`, `3.1.0.4.1.0`, `3.1.0.4.2.0`, `3.1.0.8`, `4.2.0.0`, `4.7.3`, `4.7.4` | — |
| FIG-003 | M6 | `3.1.1.0`, `3.1.1.1.0`, `3.1.1.1.1`, `3.1.1.2.0`, `3.1.1.2.1`, `3.1.1.3` | — |
| FIG-003 | M4 | `4.3`, `4.7.0`, `4.7.1` | — |
| FIG-003 | M3/M7 | `4.5`, `6.0`, `6.1`, `6.2`, `6.3`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| FIG-003 | opbygningsfiguren | `4.6.1` | — |
| FIG-003 | M5 | `4.7.5` | — |
| FIG-003 | produktoversigten | `4.8.0.0.0.0`, `4.8.0.0.1.0`, `4.8.0.0.2.0`, `4.8.0.0.3.0`, `4.8.0.0.4.0`, `4.8.0.0.5.0`, `4.8.0.0.6.0`, `4.8.1` | `4.8.0`, `4.8.0.0`, `4.8.0.0.0`, `4.8.0.0.1`, `4.8.0.0.2`, `4.8.0.0.3`, `4.8.0.0.4`, `4.8.0.0.5`, `4.8.0.0.6` |
| FIG-003 | M1 | `5.0` | `5` |
| FIG-003-DAEKLAG | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| FIG-003-DAEKLAG | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.1.3`, `2.1.2`, `3`, `3.1`, `3.1.0`, `3.1.0.0`, `3.1.0.0.0`, `3.1.0.0.1`, `3.1.0.2`, `3.1.0.2.0`, `3.1.0.2.1`, `3.1.0.2.2`, `3.1.0.2.3`, `3.1.0.4`, `3.1.0.4.0`, `3.1.0.4.1`, `3.1.0.4.2`, `3.1.0.4.3`, `3.1.1`, `3.1.1.1`, `3.1.1.2`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.6`, `4.7` |
| FIG-003-DAEKLAG | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.2.0`, `3.0`, `3.1.0.0.0.0`, `3.1.0.1`, `3.1.0.2.0.0`, `3.1.0.2.3.0`, `3.1.0.3`, `3.1.0.4.0.0`, `3.1.0.4.3.0`, `3.1.0.5`, `3.1.0.6`, `3.1.0.7`, `4.0`, `4.1`, `4.4`, `4.6.0`, `4.7.2` | `4.8` |
| FIG-003-DAEKLAG | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `2.1.1.3.0`, `3.1.0.0.1.0`, `3.1.0.2.1.0`, `3.1.0.2.2.0`, `3.1.0.4.1.0`, `3.1.0.4.2.0`, `3.1.0.8`, `4.2.0.0`, `4.7.3`, `4.7.4` | — |
| FIG-003-DAEKLAG | M6 | `3.1.1.0`, `3.1.1.1.0`, `3.1.1.1.1`, `3.1.1.2.0`, `3.1.1.2.1`, `3.1.1.3` | — |
| FIG-003-DAEKLAG | M4 | `4.3`, `4.7.0`, `4.7.1` | — |
| FIG-003-DAEKLAG | M3/M7 | `4.5`, `6.0`, `6.1`, `6.2`, `6.3`, `6.4`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| FIG-003-DAEKLAG | opbygningsfiguren | `4.6.1` | — |
| FIG-003-DAEKLAG | M5 | `4.7.5` | — |
| FIG-003-DAEKLAG | produktoversigten | `4.8.0.0.0.0`, `4.8.0.0.1.0`, `4.8.0.0.2.0`, `4.8.0.0.3.0`, `4.8.0.0.4.0`, `4.8.0.0.5.0`, `4.8.0.0.6.0`, `4.8.1` | `4.8.0`, `4.8.0.0`, `4.8.0.0.0`, `4.8.0.0.1`, `4.8.0.0.2`, `4.8.0.0.3`, `4.8.0.0.4`, `4.8.0.0.5`, `4.8.0.0.6` |
| FIG-003-DAEKLAG | M1 | `5.0` | `5` |
| FIG-004 | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| FIG-004 | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.1.3`, `2.1.2`, `3`, `3.1`, `3.1.0`, `3.1.0.0`, `3.1.0.0.0`, `3.1.0.0.1`, `3.1.0.2`, `3.1.0.2.0`, `3.1.0.2.1`, `3.1.0.2.2`, `3.1.0.2.3`, `3.1.0.4`, `3.1.0.4.0`, `3.1.0.4.1`, `3.1.0.4.2`, `3.1.0.4.3`, `3.1.1`, `3.1.1.1`, `3.1.1.2`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.6`, `4.7` |
| FIG-004 | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.2.0`, `3.0`, `3.1.0.0.0.0`, `3.1.0.1`, `3.1.0.2.0.0`, `3.1.0.2.3.0`, `3.1.0.3`, `3.1.0.4.0.0`, `3.1.0.4.3.0`, `3.1.0.5`, `3.1.0.6`, `3.1.0.7`, `4.0`, `4.1`, `4.4`, `4.6.0`, `4.7.2` | `4.8` |
| FIG-004 | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `2.1.1.3.0`, `3.1.0.0.1.0`, `3.1.0.2.1.0`, `3.1.0.2.2.0`, `3.1.0.4.1.0`, `3.1.0.4.2.0`, `3.1.0.8`, `4.2.0.0`, `4.7.3`, `4.7.4` | — |
| FIG-004 | M6 | `3.1.1.0`, `3.1.1.1.0`, `3.1.1.1.1`, `3.1.1.2.0`, `3.1.1.2.1`, `3.1.1.3` | — |
| FIG-004 | M4 | `4.3`, `4.7.0`, `4.7.1` | — |
| FIG-004 | M3/M7 | `4.5`, `6.0`, `6.1`, `6.2`, `6.3`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| FIG-004 | opbygningsfiguren | `4.6.1` | — |
| FIG-004 | M5 | `4.7.5` | — |
| FIG-004 | produktoversigten | `4.8.0.0.0.0`, `4.8.0.0.1.0`, `4.8.0.0.2.0`, `4.8.0.0.3.0`, `4.8.0.0.4.0`, `4.8.0.0.5.0`, `4.8.0.0.6.0`, `4.8.1` | `4.8.0`, `4.8.0.0`, `4.8.0.0.0`, `4.8.0.0.1`, `4.8.0.0.2`, `4.8.0.0.3`, `4.8.0.0.4`, `4.8.0.0.5`, `4.8.0.0.6` |
| FIG-004 | M1 | `5.0` | `5` |
| TR-1 | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| TR-1 | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.2`, `3`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.5`, `4.6` |
| TR-1 | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.2.0`, `3.0`, `3.1`, `3.2`, `4.0`, `4.1`, `4.3`, `4.5.0`, `4.6.2` | `4.7` |
| TR-1 | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `4.2.0.0` | — |
| TR-1 | M8 | `2.1.1.3.0`, `2.1.1.3.1`, `2.1.1.3.2` | `2.1.1.3` |
| TR-1 | M3/M7 | `4.4`, `6.0`, `6.1`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| TR-1 | opbygningsfiguren | `4.5.1` | — |
| TR-1 | M4 | `4.6.0`, `4.6.1` | — |
| TR-1 | M5 | `4.6.3` | — |
| TR-1 | produktoversigten | `4.7.0.0.0.0`, `4.7.0.0.1.0`, `4.7.0.0.2.0`, `4.7.0.0.3.0`, `4.7.0.0.4.0`, `4.7.0.0.5.0`, `4.7.0.0.6.0`, `4.7.1` | `4.7.0`, `4.7.0.0`, `4.7.0.0.0`, `4.7.0.0.1`, `4.7.0.0.2`, `4.7.0.0.3`, `4.7.0.0.4`, `4.7.0.0.5`, `4.7.0.0.6` |
| TR-1 | M1 | `5.0` | `5` |
| TR-1-SG | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| TR-1-SG | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.2`, `3`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.5`, `4.6` |
| TR-1-SG | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.2.0`, `3.0`, `3.1`, `3.2`, `4.0`, `4.1`, `4.3`, `4.5.0`, `4.6.2` | `4.7` |
| TR-1-SG | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `4.2.0.0` | — |
| TR-1-SG | M8 | `2.1.1.3.0`, `2.1.1.3.1`, `2.1.1.3.2` | `2.1.1.3` |
| TR-1-SG | M3/M7 | `4.4`, `6.0`, `6.1`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| TR-1-SG | opbygningsfiguren | `4.5.1` | — |
| TR-1-SG | M4 | `4.6.0`, `4.6.1` | — |
| TR-1-SG | M5 | `4.6.3` | — |
| TR-1-SG | produktoversigten | `4.7.0.0.0.0`, `4.7.0.0.1.0`, `4.7.0.0.2.0`, `4.7.0.0.3.0`, `4.7.0.0.4.0`, `4.7.0.0.5.0`, `4.7.0.0.6.0`, `4.7.1` | `4.7.0`, `4.7.0.0`, `4.7.0.0.0`, `4.7.0.0.1`, `4.7.0.0.2`, `4.7.0.0.3`, `4.7.0.0.4`, `4.7.0.0.5`, `4.7.0.0.6` |
| TR-1-SG | M1 | `5.0` | `5` |
| TR-2 | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| TR-2 | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.2`, `3`, `3.1`, `3.1.0`, `3.1.0.0`, `3.1.0.0.0`, `3.1.0.0.1`, `3.1.0.2`, `3.1.0.2.0`, `3.1.0.2.1`, `3.1.0.2.2`, `3.1.0.2.3`, `3.1.0.4`, `3.1.0.4.0`, `3.1.0.4.1`, `3.1.0.4.2`, `3.1.0.4.3`, `3.1.1`, `3.1.1.1`, `3.1.1.2`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.6`, `4.7` |
| TR-2 | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.2.0`, `3.0`, `3.1.0.0.0.0`, `3.1.0.1`, `3.1.0.2.0.0`, `3.1.0.2.3.0`, `3.1.0.3`, `3.1.0.4.0.0`, `3.1.0.4.3.0`, `3.1.0.5`, `3.1.0.6`, `3.1.0.7`, `4.0`, `4.1`, `4.4`, `4.6.0`, `4.7.2` | `4.8` |
| TR-2 | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `3.1.0.0.1.0`, `3.1.0.2.1.0`, `3.1.0.2.2.0`, `3.1.0.4.1.0`, `3.1.0.4.2.0`, `3.1.0.8`, `4.2.0.0`, `4.7.3`, `4.7.4` | — |
| TR-2 | M8 | `2.1.1.3.0`, `2.1.1.3.1`, `2.1.1.3.2` | `2.1.1.3` |
| TR-2 | M6 | `3.1.1.0`, `3.1.1.1.0`, `3.1.1.1.1`, `3.1.1.2.0`, `3.1.1.2.1`, `3.1.1.3` | — |
| TR-2 | M4 | `4.3`, `4.7.0`, `4.7.1` | — |
| TR-2 | M3/M7 | `4.5`, `6.0`, `6.1`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| TR-2 | opbygningsfiguren | `4.6.1` | — |
| TR-2 | M5 | `4.7.5` | — |
| TR-2 | produktoversigten | `4.8.0.0.0.0`, `4.8.0.0.1.0`, `4.8.0.0.2.0`, `4.8.0.0.3.0`, `4.8.0.0.4.0`, `4.8.0.0.5.0`, `4.8.0.0.6.0`, `4.8.1` | `4.8.0`, `4.8.0.0`, `4.8.0.0.0`, `4.8.0.0.1`, `4.8.0.0.2`, `4.8.0.0.3`, `4.8.0.0.4`, `4.8.0.0.5`, `4.8.0.0.6` |
| TR-2 | M1 | `5.0` | `5` |
| OUT-1 | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| OUT-1 | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.2`, `3` |
| OUT-1 | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.1.4`, `2.1.2.0`, `3.0`, `3.1`, `3.2` | — |
| OUT-1 | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2` | — |
| OUT-1 | M8 | `2.1.1.3.0`, `2.1.1.3.1`, `2.1.1.3.2` | `2.1.1.3` |
| OUT-2 | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| OUT-2 | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.2`, `3`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.5`, `4.6` |
| OUT-2 | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.1.4`, `2.1.2.0`, `3.0`, `3.1`, `3.2`, `4.0`, `4.1`, `4.3`, `4.5.0`, `4.6.2` | `4.7` |
| OUT-2 | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `4.2.0.0` | — |
| OUT-2 | M8 | `2.1.1.3.0`, `2.1.1.3.1`, `2.1.1.3.2` | `2.1.1.3` |
| OUT-2 | M3/M7 | `4.4`, `6.0`, `6.1`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| OUT-2 | opbygningsfiguren | `4.5.1` | — |
| OUT-2 | M4 | `4.6.0`, `4.6.1` | — |
| OUT-2 | M5 | `4.6.3` | — |
| OUT-2 | produktoversigten | `4.7.0.0.0.0`, `4.7.0.0.1.0`, `4.7.0.0.2.0`, `4.7.0.0.3.0`, `4.7.0.0.4.0`, `4.7.0.0.5.0`, `4.7.0.0.6.0`, `4.7.1` | `4.7.0`, `4.7.0.0`, `4.7.0.0.0`, `4.7.0.0.1`, `4.7.0.0.2`, `4.7.0.0.3`, `4.7.0.0.4`, `4.7.0.0.5`, `4.7.0.0.6` |
| OUT-2 | M1 | `5.0` | `5` |
| PH-1 | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| PH-1 | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.1.3`, `2.1.2`, `3`, `3.1`, `3.1.0`, `3.1.0.0`, `3.1.0.0.0`, `3.1.0.0.1`, `3.1.0.2`, `3.1.0.2.0`, `3.1.0.2.1`, `3.1.0.2.2`, `3.1.0.2.3`, `3.1.0.4`, `3.1.0.4.0`, `3.1.0.4.1`, `3.1.0.4.2`, `3.1.0.4.3`, `3.1.1`, `3.1.1.1`, `3.1.1.2`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.6`, `4.7` |
| PH-1 | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.2.0`, `3.0`, `3.1.0.0.0.0`, `3.1.0.1`, `3.1.0.2.0.0`, `3.1.0.2.3.0`, `3.1.0.3`, `3.1.0.4.0.0`, `3.1.0.4.3.0`, `3.1.0.5`, `3.1.0.6`, `3.1.0.7`, `4.0`, `4.1`, `4.4`, `4.6.0`, `4.7.2` | `4.8` |
| PH-1 | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `2.1.1.3.0`, `3.1.0.0.1.0`, `3.1.0.2.1.0`, `3.1.0.2.2.0`, `3.1.0.4.1.0`, `3.1.0.4.2.0`, `3.1.0.8`, `3.1.0.9`, `4.2.0.0`, `4.7.3`, `4.7.4` | — |
| PH-1 | M6 | `3.1.1.0`, `3.1.1.1.0`, `3.1.1.1.1`, `3.1.1.2.0`, `3.1.1.2.1`, `3.1.1.3` | — |
| PH-1 | M4 | `4.3`, `4.7.0`, `4.7.1` | — |
| PH-1 | M3/M7 | `4.5`, `6.0`, `6.1`, `6.2`, `6.3`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| PH-1 | opbygningsfiguren | `4.6.1` | — |
| PH-1 | M5 | `4.7.5` | — |
| PH-1 | produktoversigten | `4.8.0.0.0.0`, `4.8.0.0.1.0`, `4.8.0.0.2.0`, `4.8.0.0.3.0`, `4.8.0.0.4.0`, `4.8.0.0.5.0`, `4.8.0.0.6.0`, `4.8.1` | `4.8.0`, `4.8.0.0`, `4.8.0.0.0`, `4.8.0.0.1`, `4.8.0.0.2`, `4.8.0.0.3`, `4.8.0.0.4`, `4.8.0.0.5`, `4.8.0.0.6` |
| PH-1 | M1 | `5.0` | `5` |
| PH-2 | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| PH-2 | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.1.3`, `2.1.2`, `3`, `3.1`, `3.1.0`, `3.1.0.0`, `3.1.0.0.0`, `3.1.0.0.1`, `3.1.0.2`, `3.1.0.2.0`, `3.1.0.2.1`, `3.1.0.2.2`, `3.1.0.2.3`, `3.1.0.4`, `3.1.0.4.0`, `3.1.0.4.1`, `3.1.0.4.2`, `3.1.0.4.3`, `3.1.1`, `3.1.1.1`, `3.1.1.2`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.6`, `4.7` |
| PH-2 | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.2.0`, `3.0`, `3.1.0.0.0.0`, `3.1.0.1`, `3.1.0.2.0.0`, `3.1.0.2.3.0`, `3.1.0.3`, `3.1.0.4.0.0`, `3.1.0.4.3.0`, `3.1.0.5`, `3.1.0.6`, `3.1.0.7`, `4.0`, `4.1`, `4.4`, `4.6.0`, `4.7.2` | `4.8` |
| PH-2 | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `2.1.1.3.0`, `3.1.0.0.1.0`, `3.1.0.2.1.0`, `3.1.0.2.2.0`, `3.1.0.4.1.0`, `3.1.0.4.2.0`, `3.1.0.8`, `4.2.0.0`, `4.7.3`, `4.7.4` | — |
| PH-2 | M6 | `3.1.1.0`, `3.1.1.1.0`, `3.1.1.1.1`, `3.1.1.2.0`, `3.1.1.2.1`, `3.1.1.3` | — |
| PH-2 | M4 | `4.3`, `4.7.0`, `4.7.1` | — |
| PH-2 | M3/M7 | `4.5`, `6.0`, `6.1`, `6.2`, `6.3`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| PH-2 | opbygningsfiguren | `4.6.1` | — |
| PH-2 | M5 | `4.7.5` | — |
| PH-2 | produktoversigten | `4.8.0.0.0.0`, `4.8.0.0.1.0`, `4.8.0.0.2.0`, `4.8.0.0.3.0`, `4.8.0.0.4.0`, `4.8.0.0.5.0`, `4.8.0.0.6.0`, `4.8.1` | `4.8.0`, `4.8.0.0`, `4.8.0.0.0`, `4.8.0.0.1`, `4.8.0.0.2`, `4.8.0.0.3`, `4.8.0.0.4`, `4.8.0.0.5`, `4.8.0.0.6` |
| PH-2 | M1 | `5.0` | `5` |
| LT-1 | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| LT-1 | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.1.3`, `2.1.2`, `3`, `3.1`, `3.1.0`, `3.1.0.0`, `3.1.0.0.0`, `3.1.0.0.1`, `3.1.0.2`, `3.1.0.2.0`, `3.1.0.2.1`, `3.1.0.2.2`, `3.1.0.2.3`, `3.1.0.4`, `3.1.0.4.0`, `3.1.0.4.1`, `3.1.0.4.2`, `3.1.0.4.3`, `3.1.1`, `3.1.1.1`, `3.1.1.2`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.5`, `4.6` |
| LT-1 | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.2.0`, `3.0`, `3.1.0.0.0.0`, `3.1.0.1`, `3.1.0.2.0.0`, `3.1.0.2.3.0`, `3.1.0.3`, `3.1.0.4.0.0`, `3.1.0.4.3.0`, `3.1.0.5`, `3.1.0.6`, `3.1.0.7`, `4.0`, `4.1`, `4.3`, `4.5.0`, `4.6.2` | `4.7` |
| LT-1 | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `2.1.1.3.0`, `3.1.0.0.1.0`, `3.1.0.2.1.0`, `3.1.0.2.2.0`, `3.1.0.4.1.0`, `3.1.0.4.2.0`, `3.1.0.8`, `4.2.0.0`, `4.6.3`, `4.6.4` | — |
| LT-1 | M6 | `3.1.1.0`, `3.1.1.1.0`, `3.1.1.1.1`, `3.1.1.2.0`, `3.1.1.2.1`, `3.1.1.3` | — |
| LT-1 | M3/M7 | `4.4`, `6.0`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| LT-1 | opbygningsfiguren | `4.5.1` | — |
| LT-1 | M4 | `4.6.0`, `4.6.1` | — |
| LT-1 | M5 | `4.6.5` | — |
| LT-1 | produktoversigten | `4.7.0.0.0.0`, `4.7.0.0.1.0`, `4.7.0.0.2.0`, `4.7.0.0.3.0`, `4.7.0.0.4.0`, `4.7.0.0.5.0`, `4.7.0.0.6.0`, `4.7.1` | `4.7.0`, `4.7.0.0`, `4.7.0.0.0`, `4.7.0.0.1`, `4.7.0.0.2`, `4.7.0.0.3`, `4.7.0.0.4`, `4.7.0.0.5`, `4.7.0.0.6` |
| LT-1 | M1 | `5.0` | `5` |
| LT-2 | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| LT-2 | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.1.3`, `2.1.2`, `3`, `3.1`, `3.1.0`, `3.1.0.0`, `3.1.0.0.0`, `3.1.0.0.1`, `3.1.0.2`, `3.1.0.2.0`, `3.1.0.2.1`, `3.1.0.2.2`, `3.1.0.2.3`, `3.1.0.4`, `3.1.0.4.0`, `3.1.0.4.1`, `3.1.0.4.2`, `3.1.0.4.3`, `3.1.1`, `3.1.1.1`, `3.1.1.2`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.6`, `4.7` |
| LT-2 | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.2.0`, `3.0`, `3.1.0.0.0.0`, `3.1.0.1`, `3.1.0.2.0.0`, `3.1.0.2.3.0`, `3.1.0.3`, `3.1.0.4.0.0`, `3.1.0.4.3.0`, `3.1.0.5`, `3.1.0.6`, `3.1.0.7`, `4.0`, `4.1`, `4.4`, `4.6.0`, `4.7.2` | `4.8` |
| LT-2 | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `2.1.1.3.0`, `3.1.0.0.1.0`, `3.1.0.2.1.0`, `3.1.0.2.2.0`, `3.1.0.4.1.0`, `3.1.0.4.2.0`, `3.1.0.8`, `4.2.0.0`, `4.7.3`, `4.7.4` | — |
| LT-2 | M6 | `3.1.1.0`, `3.1.1.1.0`, `3.1.1.1.1`, `3.1.1.2.0`, `3.1.1.2.1`, `3.1.1.3` | — |
| LT-2 | M4 | `4.3`, `4.7.0`, `4.7.1` | — |
| LT-2 | M3/M7 | `4.5`, `6.0`, `6.1`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| LT-2 | opbygningsfiguren | `4.6.1` | — |
| LT-2 | M5 | `4.7.5` | — |
| LT-2 | produktoversigten | `4.8.0.0.0.0`, `4.8.0.0.1.0`, `4.8.0.0.2.0`, `4.8.0.0.3.0`, `4.8.0.0.4.0`, `4.8.0.0.5.0`, `4.8.0.0.6.0`, `4.8.1` | `4.8.0`, `4.8.0.0`, `4.8.0.0.0`, `4.8.0.0.1`, `4.8.0.0.2`, `4.8.0.0.3`, `4.8.0.0.4`, `4.8.0.0.5`, `4.8.0.0.6` |
| LT-2 | M1 | `5.0` | `5` |
| MIN-1 | uden for siden | `0.0.0.0`, `0.0.1.0.0` | `0`, `0.0`, `0.0.0`, `0.0.1`, `0.0.1.0` |
| MIN-1 | M9 (fælles layout) | — | `1`, `1.0`, `1.1`, `2`, `2.1`, `2.1.0`, `2.1.1`, `2.1.1.3`, `2.1.2`, `3`, `3.1`, `3.1.0`, `3.1.0.0`, `3.1.0.0.0`, `3.1.0.0.1`, `3.1.0.2`, `3.1.0.2.0`, `3.1.0.2.1`, `3.1.0.2.2`, `3.1.0.2.3`, `3.1.0.4`, `3.1.0.4.0`, `3.1.0.4.1`, `3.1.0.4.2`, `3.1.0.4.3`, `3.1.1`, `3.1.1.1`, `3.1.1.2`, `4`, `4.2`, `4.2.0`, `4.2.1`, `4.6`, `4.7` |
| MIN-1 | M9 | `1.0.0`, `2.0`, `2.1.0.0`, `2.1.1.0`, `2.1.2.0`, `3.0`, `3.1.0.0.0.0`, `3.1.0.1`, `3.1.0.2.0.0`, `3.1.0.2.3.0`, `3.1.0.3`, `3.1.0.4.0.0`, `3.1.0.4.3.0`, `3.1.0.5`, `3.1.0.6`, `3.1.0.7`, `4.0`, `4.1`, `4.4`, `4.6.0`, `4.7.2` | `4.8` |
| MIN-1 | widgets (UI-reference) | `1.1.0`, `2.1.0.1`, `2.1.0.2`, `2.1.1.1`, `2.1.1.2`, `2.1.1.3.0`, `3.1.0.0.1.0`, `3.1.0.2.1.0`, `3.1.0.2.2.0`, `3.1.0.4.1.0`, `3.1.0.4.2.0`, `3.1.0.8`, `4.2.0.0`, `4.7.3`, `4.7.4` | — |
| MIN-1 | M6 | `3.1.1.0`, `3.1.1.1.0`, `3.1.1.1.1`, `3.1.1.2.0`, `3.1.1.2.1`, `3.1.1.3` | — |
| MIN-1 | M4 | `4.3`, `4.7.0`, `4.7.1` | — |
| MIN-1 | M3/M7 | `4.5`, `6.0`, `6.1`, `7.0`, `7.1`, `7.2` | `6`, `7` |
| MIN-1 | opbygningsfiguren | `4.6.1` | — |
| MIN-1 | M5 | `4.7.5` | — |
| MIN-1 | produktoversigten | `4.8.0.0.0.0`, `4.8.0.0.1.0`, `4.8.0.0.2.0`, `4.8.0.0.3.0`, `4.8.0.0.4.0`, `4.8.0.0.5.0`, `4.8.0.0.6.0`, `4.8.1` | `4.8.0`, `4.8.0.0`, `4.8.0.0.0`, `4.8.0.0.1`, `4.8.0.0.2`, `4.8.0.0.3`, `4.8.0.0.4`, `4.8.0.0.5`, `4.8.0.0.6` |
| MIN-1 | M1 | `5.0` | `5` |
<!-- M9_INVENTORY_END -->
