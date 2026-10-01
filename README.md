# MSL Dimensionering

Migrering af det eksisterende Streamlit-værktøj til dimensionering af MSL-opbygninger med geonet til en webapp i React, TypeScript, Vite og shadcn/ui. Beregninger, standardværdier og funktioner bevares; ændringer kræver brugerens godkendelse.

**Status 01.10.2026:** Migreringen er færdig og godkendt til intern brug (B-060–B-062). Alle otte sider, mellemregningerne og rapport-PDF'en med firmaprofil virker; beregningsmotoren er kontrolleret mod originalen uden tolerance. 3.012 enhedstests og 75 browserforløb består, herunder automatisk tilgængelighedskontrol. Dækning og godkendte afvigelser står i [Accept](docs/ACCEPT.md). Offentliggørelse på firmaets hjemmeside afklares senere.

## Kom i gang

Kræver Node 24 eller nyere.

**Start appen:** dobbeltklik på `Start MSL Dimensionering.cmd`. Filen installerer afhængigheder første gang, bygger appen, når koden er ændret, starter serveren og åbner http://127.0.0.1:5174/ i browseren. Kører serveren allerede, åbnes appen blot. Luk serverens vindue for at stoppe den.

For udviklere:

```powershell
npm ci
npm run dev            # udviklingsserver
npm run build          # typekontrol og produktionsbygning
npm run preview        # http://127.0.0.1:5174/
```

Kontroller:

```powershell
npm run typecheck
npm test               # motor-, data- og referencetests
npm run format:check
npm run test:browser   # Playwright-forløb (egen port: $env:PW_PORT=5181)
node tools/build-r6-pdfs.ts  # R6-PDF'er, kontrolleret mod det godkendte sæt (B-055)
```

Python bruges kun til at optage og efterprøve referencer fra den gamle app; se [reference/README.md](reference/README.md).

## Arbejdsgang

Claude Code styrer udviklingen; Codex bruges som hjælper i separate worktrees (B-033, B-059). Alt samles på `main`; opgavegrene flettes ind efter gennemgang og slettes straks (B-061). Regler, roller og grene står i [AGENTS.md](AGENTS.md). Serena og Semble bruges til kodesøgning (B-015).

## Dokumenter

**Styring**

- [Arbejdsregler](AGENTS.md)
- [Beslutningslog](docs/BESLUTNINGER.md)
- [Migrationsplan og status](docs/MIGRATIONSPLAN.md)
- [Accept: dækning og afvigelser](docs/ACCEPT.md)
- [Fund til afklaring](docs/FUND.md)

**Delplaner**

- [Mellemregninger](docs/MELLEMREGNINGER_PLAN.md) — M1–M9.
- [Rapport og firmaprofil](docs/RAPPORT_PLAN.md) — R1–R6.
- [Geonet-database og Hjælp](docs/SIDER_PLAN.md)

**Områder**

- [Beregningsmotor](docs/BEREGNINGSMOTOR.md)
- [Dataredigering](docs/DATAREDIGERING.md)
- [Redigering og lagring](docs/REDIGERING_OG_LAGRING.md)
- [Redigeringsforslag](docs/REDIGERINGSFORSLAG.md)
- [Materialer](docs/MATERIALEUDKAST.md)
- [Grunddata](docs/GRUNDDATAUDKAST.md)
- [Indstillinger](docs/INDSTILLINGER.md)
- [Dimensionering](docs/DIMENSIONERINGSUDKAST.md)
- [Opbygningsfigurer](docs/OPBYGNINGSFIGURER.md)
- [Sådan er resultatet beregnet M1](docs/KOBLING_M1.md)
- [Designdiagram M5](docs/PERSONLIGT_DESIGNDIAGRAM.md)
- [φᵥ-opsummering M6](docs/PHI_OPSUMMERING.md)

**Reference og kortlægning**

- [Referencestatus](docs/REFERENCESTATUS.md)
- [Referencekontrol](reference/README.md)
- [Funktionsmatrix](docs/FUNKTIONSMATRIX.md)
- [Funktionskortlægning](docs/FUNKTIONSKORTLAEGNING.md)

**Historik: design- og temaudkast (fjernet ved oprydningen, B-059)**

- [Designudkast](docs/DESIGNUDKAST.md)
- [Temaudkast](docs/TEMAUDKAST.md)

**Rapport og arkitektur (delvis historik)**

- [Arkitekturvalg](docs/ARKITEKTURVALG.md)
- [Rapportskabelon](docs/RAPPORTSKABELON.md)
- [Typst-afprøvning](docs/TYPST_AFPROEVNING.md)
- [Rapportevaluering](docs/RAPPORT_EVALUERING.md)

## Kilder

- Arbejdsmappe: `C:\MSL-Dimensionering` — https://github.com/1982Strand/msl-dimensionering (privat)
- Reference: `C:\geonet_beregning`, commit `a330cfd` — https://github.com/1982Strand/Geonet_beregning
