# Opbygningsfigurer — visuelt udkast

Udkastet vises under Resultater på `/#dimensionering`. Brugeren har bedt om at tage opbygningsfigurerne som næste trin. Endelig visuel godkendelse afventes; generel designgodkendelse B-020 omfatter ikke automatisk figurerne.

## Indhold og reference

- Standard viser tre snit: ustabiliseret bærelagstykkelse samt ét/to lag geonet.
- Brugerdefineret viser desuden den indtastede opbygning og en stiplet referencelinje ved dens samlede tykkelse.
- Alle snit deler lodret skala og underbundsniveau. Materialer står i originalens rækkefølge og farvetyper. Den eksisterende motor fordeler tykkelserne efter aktive regler og oprunding.
- Geonet vises som røde linjer på de oprindelige koter. Ved to lag følger det øverste net indstillingen for laggrænse/mindste dæklag. Placeringsbeskeder bruger samme lagfordeling som tegningen; en anbefaling om maksimal afstand vises som anbefaling.
- Intervalprodukter viser den konservative opbygning og den optimale tykkelse som grøn prikket linje. Linjens tooltip indeholder originalens mellemregning. Materialelag har tooltip med fuldt navn og tykkelse.
- Ugyldige kombinationer vises som tomme, stiplede felter med originalens tekst, uden materialer, underbund eller geonet. Status for overskud/underskud følger originalen.
- Indstillinger for mm/cm, produktpåskrift, målsætningsstreg, måltal og signatur virker og gemmes. På små skærme rulles snittene vandret, så deres indbyrdes skala bevares.

`construction.ts` oversætter beregningsresultater til originalens figurdata. `construction-svg.ts` laver en selvstændig SVG med tekstombrydning og escaped brugerdata. React viser denne SVG. Rapporttilkobling er endnu ikke udført; den samme renderer kan anvendes dér, så en separat figurimplementation undgås.

## Kontrol

`tools/capture_construction_reference.py` observerer kald til originalens `ui.snit` og `core.diagram.byg_snit` i et isoleret arkiv af a330cfd. Seks cases er fastlåst i `reference/construction-cases.json` og genkørt uden forskelle. Alle kolonnedata, lag, koter, tykkelser, statustekster, optimale mellemregninger og visningsargumenter matcher TypeScript uden tolerance. Det er en datakontrol, ikke en påstand om identiske pixels eller godkendt design.

To målrettede Node-tests dækker originaldata samt selvstændig SVG, skjulte visningsdele, ugyldige snit og escaping. Ét browserforløb kontrollerer fælles målestok, original tykkelse/netkote, skift af netplacering med tilsvarende advarsel, mm/cm, tre/fire snit, visningsindstillinger, genåbning og mobilrulning. De tre eksisterende dimensioneringsforløb består også. Samlet består 2.753 Node-tests, typekontrol og produktionsbygning. CI omfatter nu 23 browserforløb; de tidligere 22 bestod på Windows/Linux ved 46d8280.

Gennemsete screenshots er gemt lokalt i `output/construction-review/`. Det forelagte opbygningsdesign er godkendt 30.09.2026 i B-025 (A-010 besvaret), og udkastmærkningen er fjernet. Rapportens egne figurkald er nu optaget i `reference/report-figure-cases.json`; tilkobling/kontrol af samme figur i PDF udestår under R3.
