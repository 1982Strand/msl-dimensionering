# MSL Dimensionering

Migrering af det eksisterende Streamlit-værktøj til React, TypeScript, Vite og shadcn/ui.

Status: kortlægning og referencekontrol er i gang. 2.062 beregningscases og 24 trin i brugerforløb er registreret fra den uændrede reference og genkørt med samme resultater. Ingen ny beregningsmotor eller brugerflade er implementeret endnu.

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

Referenceversionen er fastlagt til den committede og pushede gamle app, commit `a330cfd6734ac2478be1304a362c69f94e412d25`. Valg af beregningsmotor afklares efter kortlægningen. Planen er et udkast til fælles gennemgang, ikke en allerede godkendt implementeringsplan.
