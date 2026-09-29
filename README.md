# MSL Dimensionering

Migrering af det eksisterende Streamlit-værktøj til React, TypeScript, Vite og shadcn/ui.

Status: beregningskernen og sammensætningen af Standard/Brugerdefineret er porteret til TypeScript efter B-014. 2.337 tests består: 2.062 oprindelige beregningscases, 255 ekstra grænsetilfælde, 17 sammensatte dimensioneringsforløb og tre dæknings-/standardkontroller. Resultaterne matcher Python-referencen uden numerisk tolerance. TypeScript/Typst-prototypen har desuden genereret ti rapportcases. React-brugerfladen er endnu ikke implementeret.

- Arbejdsmappe: `C:\MSL-Dimensionering`
- Nyt repository: https://github.com/1982Strand/msl-dimensionering
- Eksisterende app: `C:\geonet_beregning`
- Kilderepository: https://github.com/1982Strand/Geonet_beregning

## Aftalt ramme

Beregninger, datagrundlag og funktionalitet skal bevares. Ændringer af eksisterende virkemåde kræver brugerens udtrykkelige godkendelse. Det gælder også fejlrettelser og optimeringer, når de ændrer resultater eller adfærd. Appens design og visualisering af opbygninger skal godkendes særskilt af brugeren.

## Projektets dokumenter

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

Referenceversionen er fastlagt til den committede og pushede gamle app, commit `a330cfd6734ac2478be1304a362c69f94e412d25`. TypeScript er valgt til beregningsmotoren i B-014. Visuelt design, datalagring, adgang og offentliggørelse afklares fortsat særskilt.

## Beregningsmotor

Se [motorens omfang og kontrol](docs/BEREGNINGSMOTOR.md). Fra projektmappen, med Node 24 eller nyere:

```powershell
npm ci
npm run typecheck
npm test
npm run format:check
```

Motoren kører uden Python. Python bruges alene til at genoptage/kontrollere de uafhængige referenceforventninger. Serena er konfigureret til TypeScript/Python, og Semble bruges til at finde implementeringer.
