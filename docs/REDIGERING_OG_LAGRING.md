# Godkendt ændringsvisning, historik og lokal lagring

30. september 2026. Grundlag: B-017–019. De oprindelige beregninger og indbyggede standarddata er uændrede.

## Implementeret grundlag

- `edit-review.ts`: sammenligner tabeller med indbyggede standarder; giver før-/efterværdier, ændrede felter og nye/fjernede rækker samt filtrering til ændringer. Ingen af disse visningsdata ændrer beregningsgrundlaget.
- `edit-session.ts`: fælles Fortryd/Gentag for datasektioner og gendannelse af standardcelle/række gennem den eksisterende validering. Historik består af præcise datakopier; den ligger kun i hukommelsen i den aktive session.
- `session-storage.ts`: læser/skriver ét versioneret JSON-dokument gennem browserens `getItem`/`setItem`-grænseflade. Dokumentet har aktuelle materialer, diagrammer, VejDim-rækker, indstillinger og et felt til brugerindtastede formularværdier. Versionsmærket er internt format, ikke brugerprofiler.
- `saved-editor.ts`: kobler gyldige ændringer, fortryd/gentag og nulstilling til automatisk lagring af det samlede aktuelle dokument. Nulstilling af en sektion bevarer øvrige sektioner og formularværdier. Gemmefejl returneres til kommende brugerflade; aktive rettelser bevares, og lagring kan forsøges igen.

Materialeudkastet tilkobler nu `window.localStorage` til `open_saved_editor`. Åbning med manglende data giver uændrede standarder. Ugyldige, utilgængelige eller ukendte formatversioner giver en fejl frem for at overskrive de gemte data. Navigation inden for appen skal bevare editorinstansen; genindlæsning genskaber værdierne og starter ny fortrydhistorik.

Lagret indeholder ikke beregningsresultater, PDF-filer eller historik. Input skal genskabe resultater gennem den samme beregningsmotor. Der er ingen automatisk import af gamle lokale brugerfiler og ingen ændring af indbyggede standardværdier.

## Bevarelse af data

Den gamle `_diagram_afvigelser` sammenligner tal med afrunding til seks decimaler. Otte cases fra originalen blev fastlåst før implementeringen i `reference/review-cases.json`. TypeScript giver samme markeringer. Dette er originalens visningsregel, ikke en ny beregningstolerance.

Et nyt snapshot skal indlæses uden ændring af værdierne. Det bevarer også bevidst tomme materialefelter og slettede diagramrækker. Den gamle JSON-indlæsers udfyldning af manglende maskekrav fra standarden ligger fortsat uændret i den særskilte legacy-loader. Den bruges ikke til at genåbne den nye apps egne komplette snapshots, da den ellers ville ændre brugerens gemte tomme felt. Denne forskel følger B-019's krav om at bevare indtastede data mellem sessioner.

Materialer matches til standarden ved navn; diagrammer ved Eu; VejDim ved T/Eu med rækkeindeks til at skelne dubletter. Omdøbning af materiale fremstår som ny række og manglende standardrække. Der indføres ingen nye permanente ID'er eller dubletafvisninger. En brugerdefineret række uden standard kan ikke gendannes til en opdigtet værdi.

## Kontrol og afgrænsning

**2.614 tests består** på Node 24.19.0: tidligere 2.582 tests, otte originale markeringseksempler, ti tests af ændringsvisning/historik og fjorten lagrings-/integrationsprøver. Typekontrol og formatering består. `reference/edit-history-results.json` registrerer omfang og kontrolsummer.

Lagringsprøver bruger et isoleret lager med samme `getItem`/`setItem`-grænseflade. De kontrollerer genåbning, alle datasektioner, indtastede værdier, null/0, fortryd/gentag, standardgendannelse, afviste ændringer, ukendt format og læse-/skrivefejl. En beregningsprøve følger diagramændring → fortryd → gentag gennem den rigtige TypeScript-motor.

De oprindelige adapterprøver er senere suppleret med 11 browserforløb for Materialer, inklusive faktisk localStorage, genåbning, fejlvisning og flere faner. Se `MATERIALEUDKAST.md`. Øvrige tabeller, dimensioneringsformularer og navigation mangler stadig tilkobling. Inputfelternes konkrete gyldighedsregler og afhængigheder skal bevares under denne tilkobling. R-004 er fortsat uafklaret; ingen Excel-indsætning er implementeret.

Lagringen er personlig for samme webadresse, browserprofil og computer. Rydning af webstedets data fjerner værdierne; privat browsing giver ikke almindelig varig lagring. Dette følger [browserens localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage). Hosting/adgang, endeligt design og publicering er ikke besluttet.
