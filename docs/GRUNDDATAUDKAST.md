# Grunddata — Materialer, Designdiagrammer og VejDim

30. september 2026. Fungerende React-udkast i den godkendte designretning B-020. Hele appen er fortsat under migrering.

## Afprøvning

Start med `npm run build` og `npm run preview` i `C:\MSL-Dimensionering`.

- Materialer: `http://127.0.0.1:5174/#materialer`
- Designdiagrammer: `http://127.0.0.1:5174/#diagrammer`
- Trafikklasse-korrelation: `http://127.0.0.1:5174/#vejdim`

De tre sider deler samme browserlager og Fortryd/Gentag-historik. Gyldige celleændringer anvendes, når indtastningen afsluttes med fokusflytning eller Enter, og gemmes automatisk efter B-017–019. Diagramvalget huskes også. Genindlæsning starter en ny fortrydelseshistorik, mens data bevares. Korrupte gemte data overskrives ikke; skrivefejl vises, og ændringer fra en anden fane kræver genindlæsning før videre redigering.

## Designdiagrammer

Alle seks diagrammer, originale scanninger, Eₒ-værdier og belastningsklasser er med. Råkurvernes punkter, akser, legendetekster, hovertekster og farver følger originalens Plotly-specifikation. Punkter med manglende værdier udelades på samme måde som i Python. De originale direkte aflæste celler markeres med fed skrift; ændrede celler viser standardværdien i gult.

Alle fire tabelkolonner kan redigeres direkte. Rækker kan tilføjes/slettes, dubletter afvises, og null og 0 forbliver forskellige værdier. Gendan celle/række, filter, fortryd/gentag, nulstilling af ét diagram og nulstilling af alle diagrammer er koblet til automatisk lagring. Den aktive opslagstabel bygges med den allerede kontrollerede datamotor.

## VejDim

De oprindelige 48 kørsler og 17 kolonner er med. Trafikklasse og Eᵤ er låst og står fast ved vandret rulning. Ubundet tykkelse og samlet højde beregnes. Trin i talfelterne er indtastningstrin, ikke nye restriktioner på de bevarede data: eksempelvis er BL = 448 eller 458 mm gyldige værdier med et trin på 10 mm.

Korrelationstabellen, afvigelserne, markeringerne `*`/`†`, asfaltpakken, regelteksten og regneeksemplet bruger de aktive kørsler og diagrammer. Regneeksemplet vælger T3/Eᵤ15 eller originalens første gyldige reservepunkt efter strenge områderegler. Metodens fire trin og de seks faste forudsætninger er overført fra originalen.

CSV eksporteres med alle 17 kolonner, semikolon, UTF-8 BOM, citering af specialtegn og beregnede totaler. Indholdet sammenlignes mod originalens Pandas-eksport med LF som fælles linjeskift; platformens LF/CRLF-forskel indgår ikke som en tal-/indholdsforskel.

## Kontrol

- 2.746 motor-/datatests består på Node 24.19.0. 132 nye sammenligninger omfatter rådiagrammer, CSV, korrelations-/asfalttekster, dækningsområder, regneeksemplets mellemregninger og regeltekster.
- Referencecases er optaget før den tilsvarende implementering fra en frisk udpakning af `a330cfd`. Begge nye optageværktøjer er genkørt i sammenligningstilstand. Ingen forventninger eller numeriske tolerancer er ændret.
- Alle seks scanninger er kontrolleret byte for byte mod den gamle commit.
- 17 Playwright-forløb består i Chromium: de 11 eksisterende materialeprøver plus seks forløb for diagramredigering/kurveopdatering, fælles historik/navigation, rækkehandlinger/dubletter, null/0/grænser, VejDim/CSV/genåbning og visning af alle seks diagrammer på desktop/mobil.
- Typekontrol, produktionsbygning og formateringskontrol består. GitHub-kontrollen kører også på Windows/Linux.
- Desktop- og mobilbilleder er visuelt gennemgået. Lokale billeder ligger i `output/grunddata/`; testernes profiler er isolerede fra brugerens browserdata.

## Afgrænsning og næste trin

Dette afslutter ikke hele F-04/F-09/F-11. Dimensioneringsformularer, produktvalg, samtlige apptekster, indstillingssiden, hjælpelinks, opbygningsfigurer og fuld rapporteksport er endnu ikke koblet til React. Den oprindelige samlede tekst om antal afvigelser fra diagrammanualen skal fortsat gennemgås sammen med de resterende apptekster; celle-/rækkeafvigelser og originalens seksdecimalers sammenligningsregel er allerede bevaret i ændringsvisningen.

De tre navigationslinks gør grunddataudkastet afprøveligt; de er ikke et endeligt forslag til hele appens navigation. Firmalogo og opbygningsvisualisering kræver særskilt accept. R-004 er fortsat ikke implementeret. Browserkontrollen omfatter Chromium; øvrige browsere, tilgængelighed og fulde Streamlit/React-forløb udestår.

Plotly indlæses først på diagramsiden. Den særskilte fil er cirka 1,15 MB før komprimering (381 kB gzip), hvilket giver en byggeadvarsel om filstørrelsen. Materialesiden henter ikke denne fil. Dette er et kendt optimeringspunkt før offentliggørelse, ikke en beregningsafvigelse.

Næste plantrin er indstillinger og dimensioneringsformularer i den godkendte designretning, med samme standarder, afhængigheder og referencekontrol. Der er ikke ændret i den gamle app, og intet er offentliggjort.
