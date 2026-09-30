# MSL Dimensionering

Migrering af det eksisterende Streamlit-værktøj til React, TypeScript, Vite og shadcn/ui.

Status: beregningskernen og sammensætningen af Standard/Brugerdefineret er porteret til TypeScript efter B-014. 2.753 tests består: beregninger, grænsetilfælde, sammensatte dimensioneringsforløb, redigerbare grunddata, indstillinger og korrelationer. De oprindelige referencecases matcher Python uden numerisk tolerance; godkendte forbedringer har særskilte adfærdstests. TypeScript/Typst-prototypen har desuden genereret ti rapportcases. React/Vite/shadcn-udkastet omfatter Materialer, Designdiagrammer, Trafikklasse-korrelation, Indstillinger og dimensioneringsformularer med browserlagring. Opbygningsfigurer er tilkoblet og designgodkendt i B-025; seks originalcases matcher alle figurdata. Fire målrettede browserforløb for dimensionering/figurer består. Seks produktoversigter matcher originalens faktiske HTML. De tidligere 22 browserforløb bestod på Windows/Linux ved 46d8280; CI omfatter nu 23. Designretningen er godkendt i B-020.

- Arbejdsmappe: `C:\MSL-Dimensionering`
- Nyt repository: https://github.com/1982Strand/msl-dimensionering
- Eksisterende app: `C:\geonet_beregning`
- Kilderepository: https://github.com/1982Strand/Geonet_beregning

## Aftalt ramme

Beregninger, datagrundlag og funktionalitet skal bevares. Ændringer af eksisterende virkemåde kræver brugerens udtrykkelige godkendelse. Det gælder også fejlrettelser og optimeringer, når de ændrer resultater eller adfærd. Appens design og visualisering af opbygninger skal godkendes særskilt af brugeren.

## Projektets dokumenter

- [Delplan for mellemregninger](docs/MELLEMREGNINGER_PLAN.md) — M1–M9, godkendt rækkefølge, konkrete cases og særskilt figuraccept.
- [Delplan for rapport og firmaprofil](docs/RAPPORT_PLAN.md) — godkendt browserkompilering, bevarede rapportdata og lagring/nulstilling af rapporttekster og valg.
- [Personligt designdiagram M5](docs/PERSONLIGT_DESIGNDIAGRAM.md) — original Plotly-specifikation/hover og SVG gennem Typst; konkret designaccept afventes.
- [Migrationsplan](docs/MIGRATIONSPLAN.md) — forslag til faser, leverancer og godkendelser.
- [Foreløbig funktionskortlægning](docs/FUNKTIONSKORTLAEGNING.md) — kendte områder og kontrolpunkter.
- [Beslutningslog](docs/BESLUTNINGER.md) — aftaler, åbne spørgsmål og ændringsforslag.
- [Fastlagt kildegrundlag](docs/REFERENCESTATUS.md) — referenceversion, standarddata og kontrolstatus.
- [Arbejdsregler](AGENTS.md) — bindende rammer for kommende udvikling.
- [Detaljeret funktionsmatrix](docs/FUNKTIONSMATRIX.md) — underfunktioner, standarder, kilder og kontroldækning.
- [Referencekontrol](reference/README.md) — reproducerbare kørsler, resultater og begrænsninger.
- [Fund til afklaring](docs/FUND.md) — observeret adfærd, som ikke må ændres stiltiende.
- [Arkitekturvalg](docs/ARKITEKTURVALG.md) — konkrete muligheder efter kortlægningen.
- [Evaluering af rapportgenerering i TypeScript](docs/RAPPORT_EVALUERING.md) — Word/PDF, LibreOffice, mulige forbedringer og afprøvningskriterier.
- [Typst-afprøvning](docs/TYPST_AFPROEVNING.md) — ti genererede rapportcases, PDF som primært format og begrænsninger ved PDF til Word.

Referenceversionen er fastlagt til den committede og pushede gamle app, commit `a330cfd6734ac2478be1304a362c69f94e412d25`. TypeScript er valgt til beregningsmotoren i B-014. Lokal lagring i samme browser/computer er valgt i B-019. Opbygningsdesignet er godkendt i B-025. PDF alene med Typst, lokal download og redigerbar firmaprofil er besluttet i B-026–028; Word-eksport udgår. Delplaner og browserkompilering er godkendt i B-029. M5 er implementeret som visuelt udkast: alle 11 optagne Plotly-specifikationer og fire oprindelige figurer matcher uden tolerance. 22 målrettede Node-tests, ét nyt browserforløb og fire SVG'er gennem browserens Typst-compiler består. Syv rapportfigurcases er optaget separat. B-030 godkender kommende lagring/nulstilling af rapporttekster og valg. Øvrige mellemregninger og rapportintegration er fortsat åbne; figurer, rapportdesign, adgang og offentliggørelse har særskilt accept.

## Lokalt grunddataudkast

```powershell
npm ci
npm run build
npm run preview
```

Åbn `http://127.0.0.1:5174/`. Se [udkastets funktioner, kontroller og afgrænsning](docs/MATERIALEUDKAST.md).

Udkastet omfatter Designdiagrammer og Trafikklasse-korrelation med direkte redigering, kurver, regneeksempel og CSV. Se [grunddataudkastets omfang](docs/GRUNDDATAUDKAST.md) og [Indstillinger med kontroller og resterende arbejde](docs/INDSTILLINGER.md).

## Beregningsmotor

Se [motorens omfang og kontrol](docs/BEREGNINGSMOTOR.md). Fra projektmappen, med Node 24 eller nyere:

```powershell
npm ci
npm run typecheck
npm test
npm run format:check
```

Motoren kører uden Python. Python bruges alene til at genoptage/kontrollere de uafhængige referenceforventninger. Serena er konfigureret til TypeScript/Python, og Semble bruges til at finde implementeringer.

- [Redigerbare grunddata](docs/DATAREDIGERING.md) — porterede normaliseringer, JSON-indlæsning og kontroller.
- [Forslag til enklere redigering](docs/REDIGERINGSFORSLAG.md) — direkte redigering, ændringsoversigt og fortryd er godkendt. R-004 afventer vurdering; dataprofiler er afvist.
- [Ændringsvisning, historik og lokal lagring](docs/REDIGERING_OG_LAGRING.md) — implementeret grundlag, kontrol og resterende browserintegration.

[Dimensioneringsudkast](docs/DIMENSIONERINGSUDKAST.md) — Standard/Brugerdefineret, produktvalg, inputlagring, resultater og resterende figur-/rapportarbejde.
