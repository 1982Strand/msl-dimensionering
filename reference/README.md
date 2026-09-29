# Referencekontrol

Kilde: commit `a330cfd6734ac2478be1304a362c69f94e412d25` fra den gamle app. Profil: indbyggede standardværdier, jf. B-008. Kontrollen ændrer ikke kilden eller brugerdataene i `C:\geonet_beregning`.

## Registreret og genkørt

| Fil | Indhold | Kontrol |
| --- | --- | --- |
| `inventory.json` | 13 aktive Python-filer, 426 funktioner, 98 widget-kald, signaturer, kildepositioner og direkte session-state-opslag | Statisk registrering; ingen påstand om fuld adfærdsdækning |
| `core-cases.json` | 2.062 cases fordelt på 21 grupper samt standarddata | Genkørsel af originalen matcher de registrerede resultater |
| `ui-flows.json` | 24 registrerede trin: inputs, valg, indstillinger, seneste dimensionering og rapportens beregningstekster | Genkørsel matcher; alle otte navigationssider besøgt |
| `figures.json` | 8 Plotly-figurer fordelt på 4 scenarier fra den rigtige app, inklusive geometri, labels og mål | Figurdata genkøres mod originalen; ingen pixel-/designgodkendelse |
| `environment.json` | Python 3.12.10 på Windows og 65 registrerede pakkeversioner | Beskriver miljøet for referencekørslerne |
| `report-template-audit.json` | Skabelonens 35 pakkedele, 26 markører, 2 tabeller, skrifttyper og sidemål | Strukturel læsning; ingen layout- eller hastighedskontrol |
| `report-contexts.json` | Ti cases med den originale Word-byggers faktiske skabelondata | Registreret og genkørt; syntetiske metadata, eksisterende faglige tekster bevaret |
| `report-prototype-results.json` | PDF-indhold, sideantal, figurbilleder, runtime og indledende tider | Original Word-vej mod isoleret TypeScript/Typst-prototype; ingen designgodkendelse |

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

| Case | Input/handling | Observeret resultat |
| --- | --- | --- |
| UI-001 | Ny Standard-session, Eu 10 MPa, klasse 4, TX160 | Uarmeret 900 mm; ét lag 650 mm; to lag afvises af diagrammet |
| UI-002 | Eu ændres til 5 MPa | Ét lag 850 mm; to lag 750 mm |
| UI-003 | NX850 vælges ved Eu 5 MPa, klasse 4 | Konservativt ét lag 750 mm; to lag 650 mm; produktets intervaldata bevares |
| UI-005 | Materialer besøges, derefter tilbage | Eu 5 bevares; produktet vender tilbage til TX160, jf. FUND-001 |
| UI-traffic-T1-3 | Trafikklasse T1 ved Eu 3 | Afvist under diagramområdet; gammel `sidste_dim` fjernes |
| UI-traffic-T4-10 | Trafikklasse T4 ved Eu 10 | Ækvivalent Eo 107,6 MPa; ét lag 700 mm |
| UI-008 | Nulstil i topbjælken | Standard-input genetableres, inklusive Eu 10 og belastningsklasse |
| UI-009–011 | Brugerdefineret: to standardlag, tredje manuelt lag, manuel phi 38,5° | Lag/input og beregningsresultater registreres på hvert trin |
| UI-013 | Visningsenhed ændres fra mm til cm | Beregningsdata er uændrede; kontrol med eksplicit assertion |
| UI-015 | Klassisk Standard tilvælges | Klassisk tilstand registreres med dens oprunding og opbygning |
| UI-016 | Rapport åbnes efter blokeret beregning | Intet gammelt beregningsresultat kan anvendes |
| UI-017 | Ny session efter gemte indstillingsændringer | cm og 100 mm oprunding genindlæses fra testens midlertidige filer |

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
