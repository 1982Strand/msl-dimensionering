# Referencekontrol

Kilde: commit `a330cfd6734ac2478be1304a362c69f94e412d25` fra den gamle app. Profil: indbyggede standardværdier, jf. B-008. Kontrollen ændrer ikke kilden eller brugerdataene i `C:\geonet_beregning`.

## Registreret og genkørt

| Fil                             | Indhold                                                                                                             | Kontrol                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `inventory.json`                | 13 aktive Python-filer, 426 funktioner, 98 widget-kald, signaturer, kildepositioner og direkte session-state-opslag | Statisk registrering; ingen påstand om fuld adfærdsdækning                         |
| `core-cases.json`               | 2.062 cases fordelt på 21 grupper samt standarddata                                                                 | Genkørsel af originalen matcher de registrerede resultater                         |
| `ui-flows.json`                 | 24 registrerede trin: inputs, valg, indstillinger, seneste dimensionering og rapportens beregningstekster           | Genkørsel matcher; alle otte navigationssider besøgt                               |
| `figures.json`                  | 8 Plotly-figurer fordelt på 4 scenarier fra den rigtige app, inklusive geometri, labels og mål                      | Figurdata genkøres mod originalen; ingen pixel-/designgodkendelse                  |
| `environment.json`              | Python 3.12.10 på Windows og 65 registrerede pakkeversioner                                                         | Beskriver miljøet for referencekørslerne                                           |
| `report-template-audit.json`    | Skabelonens 35 pakkedele, 26 markører, 2 tabeller, skrifttyper og sidemål                                           | Strukturel læsning; ingen layout- eller hastighedskontrol                          |
| `report-contexts.json`          | Ti cases med den originale Word-byggers faktiske skabelondata                                                       | Registreret og genkørt; syntetiske metadata, eksisterende faglige tekster bevaret  |
| `report-prototype-results.json` | PDF-indhold, sideantal, figurbilleder, runtime og indledende tider                                                  | Original Word-vej mod isoleret TypeScript/Typst-prototype; ingen designgodkendelse |

Inventarlisten og referencecases indeholder kildecommit og SHA-256 for de aktive Python-filer. Skabelonauditten registrerer kildecommit og skabelonens egne kontrolsummer; miljøfilen registrerer runtime og pakkeversioner. Forventede resultater er hentet fra den eksisterende kode, ikke fra en ny beregningsimplementation. Cases omfatter også afviste/ugyldige input. Et stort caseantal er ikke i sig selv dokumentation for komplet dækning eller faglig korrekthed.

### Dækning af beregninger

- 540 diagramcases: alle 45 Eu-rækker × 6 Eo-kolonner × ét/to geonetlag. Rækker uden for en konkret kurves dækning bevarer deres fejlresultat.
- 270 trafikklasseopslag med standardregler, 504 opslag med forskellige yderområderegler og 18 cases omkring tolerancens grænse.
- 64 korrektionscases, 24 beregninger med oprundingsvalg, 52 oprundingscases og 21 friktionsvinkelafrundinger.
- 108 lagfordelinger og 27 beregninger med koblet lagfordeling/friktionsvinkel.
- 252 geonetplaceringer, 9 placeringer i materialelag og 4 overlægscases.
- 18 produktoversigter, 18 produktgrupperinger, 21 produkt/materiale-valideringer og 30 inputvalideringer.
- 39 Cv-opslag, 27 længdeformateringer, 9 normaliseringer og 7 særtilfælde for beregningsinput.

Core-cases tester de enkelte modulers kontrakter. De bærer kun de indstillinger, der står i deres `input`; de er ikke alle fulde brugerforløb. Eksempelvis fastlægges klassens minimum i `app.py`, før det sendes til core. De faktiske standardindstillinger og komplette sammensatte resultater er derfor også registreret i `ui-flows.json`.

### Udvalgte konkrete referenceforløb

| Case             | Input/handling                                                        | Observeret resultat                                                        |
| ---------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| UI-001           | Ny Standard-session, Eu 10 MPa, klasse 4, TX160                       | Uarmeret 900 mm; ét lag 650 mm; to lag afvises af diagrammet               |
| UI-002           | Eu ændres til 5 MPa                                                   | Ét lag 850 mm; to lag 750 mm                                               |
| UI-003           | NX850 vælges ved Eu 5 MPa, klasse 4                                   | Konservativt ét lag 750 mm; to lag 650 mm; produktets intervaldata bevares |
| UI-005           | Materialer besøges, derefter tilbage                                  | Eu 5 bevares; produktet vender tilbage til TX160, jf. FUND-001             |
| UI-traffic-T1-3  | Trafikklasse T1 ved Eu 3                                              | Afvist under diagramområdet; gammel `sidste_dim` fjernes                   |
| UI-traffic-T4-10 | Trafikklasse T4 ved Eu 10                                             | Ækvivalent Eo 107,6 MPa; ét lag 700 mm                                     |
| UI-008           | Nulstil i topbjælken                                                  | Standard-input genetableres, inklusive Eu 10 og belastningsklasse          |
| UI-009–011       | Brugerdefineret: to standardlag, tredje manuelt lag, manuel phi 38,5° | Lag/input og beregningsresultater registreres på hvert trin                |
| UI-013           | Visningsenhed ændres fra mm til cm                                    | Beregningsdata er uændrede; kontrol med eksplicit assertion                |
| UI-015           | Klassisk Standard tilvælges                                           | Klassisk tilstand registreres med dens oprunding og opbygning              |
| UI-016           | Rapport åbnes efter blokeret beregning                                | Intet gammelt beregningsresultat kan anvendes                              |
| UI-017           | Ny session efter gemte indstillingsændringer                          | cm og 100 mm oprunding genindlæses fra testens midlertidige filer          |

## Gentag kontrollen

Kør fra `C:\MSL-Dimensionering` med den gamle apps eksisterende virtuelle miljø:

```powershell
& 'C:\geonet_beregning\.venv\Scripts\python.exe' tools/inventory_legacy.py
& 'C:\geonet_beregning\.venv\Scripts\python.exe' tools/capture_core_reference.py
& 'C:\geonet_beregning\.venv\Scripts\python.exe' tools/capture_ui_reference.py
& 'C:\geonet_beregning\.venv\Scripts\python.exe' tools/capture_figure_reference.py
& 'C:\geonet_beregning\.venv\Scripts\python.exe' -m unittest discover -s tools -p 'test_*.py' -v
```

En anden kildecheckout kan angives med `--legacy-repo PATH`; den skal indeholde den fastlagte commit. Værktøjerne læser committen med `git archive` og pakker den ud i en frisk midlertidig mappe. Lokale ændringer, ignorerede brugerdata og historiske backupfiler indlæses ikke som aktiv app. Pythonmiljøets pakker fremgår af `environment.json`.

Standardkørsel sammenligner med de eksisterende forventninger. `--record` opretter en ny referencefil og afviser at overskrive en eksisterende fil. Der er ingen automatisk accept/update-funktion. Ændringer af godkendte forventninger skal være synlige i Git og begrundet i beslutningsloggen. Den statiske inventarliste kan derimod regenereres.

Ved genkørsel accepteres ingen numerisk tolerance. JSON-objekters rækkefølge ignoreres; værdier, typer og lister sammenlignes. TypeScript-kontrollen i `tests/` sammenligner direkte med de frosne JSON-forventninger. Den kører ingen Pythonkode; originale Python-genkørsler gendanner fortsat numeriske tabelnøgler eksplicit.

## Begrænsninger og resterende arbejde

- Streamlits testmiljø kører den rigtige `app.py`, men er ikke en rigtig browser. Segmentvælgere betjenes via session-state, andre kontroller via deres test-API. Dette beviser ikke klik-, tastatur- eller layoutadfærd i browseren.
- Standardmeddelelser og rapportens beregningstekster er registreret. Alle specialbyggede HTML-advarsler er endnu ikke registreret i en samlet tekstkontrol.
- Datatabelredigering, dubletter/slettede materialer, ugyldig JSON, alle indstillingskombinationer, sortering, hjælpelinks og eksportknapper mangler fuld forløbskontrol.
- Rapport-siden er kørt uden et gyldigt beregningsresultat; rapportens tabeller/tekster er testet direkte på gyldige dimensioneringer. Den isolerede rapportprototype har desuden dannet ti originale DOCX/Word-PDF'er og ti Typst-PDF'er med indholdskontrol. Standard-casens sider er visuelt gennemgået i begge motorer. Rapportsidens samlede billed-/downloadforløb og LibreOffice er stadig ikke verificeret.
- Brugerens samlede accept af de repræsentative cases udestår. TypeScript-motorens automatiske migreringskontrol består for det registrerede omfang, jf. `docs/BEREGNINGSMOTOR.md`. Browseradfærd og komplet app er ikke dermed godkendt.

Kontrolværktøjet har desuden fire egne tests: ændret tykkelse afvises, boolesk/numerisk typeforveksling afvises, eksisterende forventninger kan ikke overskrives, og objektfelters rækkefølge giver ikke falske forskelle.

## TypeScript-kontrol efter B-014

- `engine-boundaries.json`: 255 yderligere originale Python-forventninger for afrunding, formatering, normalisering, klassegrænser og redigerede/manglende tabelværdier. Optagelsen overskriver ikke eksisterende forventninger.
- `src/engine/defaults.json`: indbyggede konstanter fra referencecommitten; ingen lokale brugerdata eller forventede beregningsresultater bruges som programlogik. Kontrolleres med `tools/export_engine_data.py --check`.
- `tests/engine-reference.test.ts`: alle 2.062 originale cases og kontrol af uændrede input/defaults.
- `tests/engine-boundaries.test.ts`: alle 255 ekstra cases.
- `tests/dimensionering.test.ts`: gendanner input fra de 17 aktive dimensioneringssnapshots og sammenligner hele resultatet inklusive rapportdata. De syv snapshots på andre sider er ikke selvstændige beregningskørsler.
- Node 24.19.0: 2.337 tests består. Ingen numerisk tolerance eller omskrivning af de oprindelige forventninger. Se `typescript-engine-results.json`.

```powershell
npm ci
npm run typecheck
npm test
& C:\geonet_beregning\.venv\Scripts\python.exe tools/capture_engine_boundaries.py
& C:\geonet_beregning\.venv\Scripts\python.exe tools/export_engine_data.py --check
```

## Supplerende dataredigering

Seneste UI-udvidelse: `table-ui-cases.json` fastlåser 20 sammenligninger af rådiagrammer, CSV, viste tabeller og dækningsområder samt aflæsningsmarkeringer. `table-explanation-cases.json` fastlåser 112 sammenligninger af regneeksemplets mellemregninger, cellevalg og regeltekster. Genkør med `tools/capture_table_ui_reference.py` og `tools/capture_table_explanation.py` (valgfrit `--legacy-repo PATH`). Uden `--record` sammenlignes eksisterende forventninger; de seks scanninger kontrolleres byte for byte. CSV-linjeskift kanoniseres til LF. Samlet TypeScript-kontrol er nu 2.746 tests; browserkontrollen er særskilt med 17 forløb. Se `docs/GRUNDDATAUDKAST.md`.

`editing-cases.json` indeholder 150 forventninger fra uændrede originale datafunktioner og isoleret filindlæsning/gemning. `data-flow-cases.json` indeholder 86 forventninger for korrelationer, trafiktekster og redigerede data gennem beregningsmotoren. `tests/editing.test.ts` og `tests/data-flow.test.ts` matcher dem præcist og kontrollerer uændrede input. Samlet består 2.582 tests inklusive dækningskontroller. Se `docs/DATAREDIGERING.md` for omfang, genkørsel og begrænsninger. Den tidligere `typescript-engine-results.json` bevares som dokumentation for første motorleverance; den nye kontrol ligger i `editing-results.json`.

## M5 og rapportens egne figurkald — 30.09.2026

`personal-diagram-cases.json` registrerer otte originale UI-kald og tre direkte særtilfælde for `byg_designdiagram`, inklusive hele Plotly-specifikationer. De fire oprindelige `figures.json`-specifikationer er bevaret og sammenlignes direkte. To målrettede tests dækker alle cases/argumenter uden tolerance; sammen med dimensionerings-/konstruktionskontrol består 22 tests. Se `docs/PERSONLIGT_DESIGNDIAGRAM.md` for browser- og SVG/Typst-kontrol.

`report-figure-cases.json` registrerer syv originale rapport-preview-forløb: renderargumenter, faktisk snitliste, effektive standarder, størrelse, signatur og eksportlayout. Chrome/rastereksport er erstattet af en neutral PNG under optagelsen; argumentdannelse og geometri udføres af originalen. Dette er en kald-/geometrireference, ikke en raster- eller PDF-sammenligning. Scenarienavne er ikke bevis for snitvalg; de observerede `snit_liste`-værdier er normative, jf. rapportplanens note om custom-input-only.

`report-figure-extra-cases.json` (`tools/capture_report_figure_reference.py --extra`) er den rene input-snitcase, som RAPPORT_PLAN.md kræver før R3: Brugerdefineret, Eᵤ 5, NX850, i rapporten kun »Indtastet opbygning« valgt (uarmeret, 1 og 2 lag fravalgt). Den observerede snitliste er `['Indtastet opbygning']`. Optaget 01.10.2026 fra isoleret `a330cfd`; ny sammenligning af begge filer gav samme resultat.

Genkørsel: `tools/capture_personal_diagram_reference.py` og `tools/capture_report_figure_reference.py` med den gamle apps Python-miljø. Uden `--record` sammenlignes; med flag nægtes eksisterende målfiler, også før originalen startes. Begge kører isoleret a330cfd. Ingen eksisterende forventninger er overskrevet.

## Aktiv M6 og korrigeret M2-kortlægning

`phi-summary.json` registrerer 11 originale AppTest-forløb, fire uændrede AST-helpercases og de originale funktionskald. Kode-/HTML-tekster sammenlignes uden normalisering af whitespace eller numerisk tolerance. Se `docs/PHI_OPSUMMERING.md`. Genkør med `tools/capture_phi_reference.py`; `--record` afviser eksisterende målfil før optagelse. M2-helperen har ingen kald og aktiveres ikke efter B-032.

## Geonet-database og Hjælp (S1/S2, B-036)

`tools/capture_pages_reference.py` optager fra isoleret `a330cfd` den viste side for Geonet-database samt Hjælp (standardvisning og alle kapitler åbne), hjælpeparserens output (`laes_kapitler`) med typenavne, `KILDEDOKUMENTER` og kontrolsummer for kapitelfilerne. Resultatet er `reference/pages-cases.json`; `--record` opretter kun, og uden flag sammenlignes. Første optagelse og en ny sammenligning gav samme resultat.

`tools/capture_dimensioning_page_reference.py` optager fra isoleret `a330cfd` hele den viste dimensioneringsside (hovedområdet uden sidebjælke og stylesheet) som et træ i visningsrækkefølge: blokke (kolonner, expandere, popupper, faner, containere) med deres indstillinger og elementer med fuldt protobuf-indhold. Grundlag for M3, M4, M7, M8 og M9. 14 tilfælde: FIG-001–004, TR-1/2, OUT-1/2, PH-1/2 og varianterne FIG-001/002 med præcise værdier (`afrunding.vis_eksakt`), FIG-003 med øverste net ved dæklaget (`lagfordeling.netplacering = daeklag`) og TR-1 med SG-tykkelsen i den aktive VejDim-række T4/Eᵤ 10 øget med 50 mm. Reduktioner, der er markeret i filen: HTML med `<svg` gemmes som sha256 og længde, Plotly-figurer kun som type og placering, dataframes som kolonner, indeks, rækker og kolonnekonfiguration, og widgets som type, nøgle, etiket, værdi, valgmuligheder, deaktivering og hjælp. Figurerne kontrolleres i deres egne referencer. Første optagelse med sha256 af Plotly-specifikationen var ikke stabil, fordi Plotly tildeler nye id'er pr. kørsel; den ucommittede fil blev slettet, værktøjet rettet og optagelsen gentaget. Resultatet er `reference/dimensioning-page-cases.json`; `--record` opretter kun, og uden flag sammenlignes. Ny sammenligning gav samme resultat.

Med `--extra` optages tre supplerende tilfælde for grene, de 14 ikke dækker: LT-1 (Brugerdefineret, Eᵤ 15, belastningsklasse 3, TX160, mm) og LT-2 (samme med NX850 i cm), begge med tillæg for mindste lagtykkelse pr. lagtype (`lagfordeling.restlag = vd`), samt MIN-1 (Brugerdefineret, Eᵤ 30, belastningsklasse 4, NX850) med samlet minimumstykkelse. Resultatet er `reference/dimensioning-page-extra-cases.json`. Første optagelse gav en tom fil, fordi optageværktøjet overskrev listen over tilfælde med resultatlisten; den ucommittede fil blev slettet, fejlen rettet og optagelsen gentaget. Ny sammenligning af begge filer gav samme resultat.

De otte kapitelfiler er kopieret uændret fra `a330cfd` til `src/content/hjaelp/`. Kontrolsummerne i referencen gælder arkivets bytes med CRLF; projektet gemmer markdown med LF (`.gitattributes`). Indholdet er identisk efter normalisering af linjeskift, og originalens parser læser med normaliserede linjeskift.
