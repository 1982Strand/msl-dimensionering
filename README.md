# MSL Dimensionering

Migrering af det eksisterende Streamlit-værktøj til React, TypeScript, Vite og shadcn/ui.

Status: planlægning. Ingen beregningsmotor eller brugerflade er implementeret endnu.

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
- [Observeret kildegrundlag](docs/REFERENCESTATUS.md) — status ved opstart; endnu ikke en godkendt referenceversion.
- [Arbejdsregler](AGENTS.md) — bindende rammer for kommende udvikling.

Referenceversionen er fastlagt til den committede og pushede gamle app, commit `a330cfd6734ac2478be1304a362c69f94e412d25`. Valg af beregningsmotor afklares efter kortlægningen. Planen er et udkast til fælles gennemgang, ikke en allerede godkendt implementeringsplan.
