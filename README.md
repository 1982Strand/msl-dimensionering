# MSL Dimensionering

Migrering af det eksisterende Streamlit-værktøj til dimensionering af MSL-opbygninger med geonet til en webapp i React, TypeScript, Vite og shadcn/ui. Beregninger, standardværdier og funktioner bevares; ændringer kræver brugerens godkendelse.

**Status 30.09.2026:** Beregningsmotoren er porteret til TypeScript og kontrolleret mod originalen uden tolerance (2.757 tests). Grunddata, indstillinger, dimensionering, opbygningsfigurer, designdiagram og φᵥ-opsummering fungerer med automatisk lagring i browseren. Mellemregninger, rapport med firmaprofil, Geonet-database, Hjælp og samlet navigation udestår. Se [Migrationsplan og status](docs/MIGRATIONSPLAN.md).

## Kom i gang

Kræver Node 24 eller nyere.

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
```

Python bruges kun til at optage og efterprøve referencer fra den gamle app; se [reference/README.md](reference/README.md).

## Arbejdsgang

Claude Code styrer udviklingen; Codex bruges som hjælper i separate worktrees (B-033). Integrationsgrenen er `codex/reference-kortlaegning` (udkast-PR #1). Regler, roller og grene står i [AGENTS.md](AGENTS.md). Serena og Semble bruges til kodesøgning (B-015).

## Dokumenter

**Styring**

- [Arbejdsregler](AGENTS.md)
- [Beslutningslog](docs/BESLUTNINGER.md)
- [Migrationsplan og status](docs/MIGRATIONSPLAN.md)
- [Fund til afklaring](docs/FUND.md)

**Delplaner**

- [Mellemregninger](docs/MELLEMREGNINGER_PLAN.md) — M1–M9.
- [Rapport og firmaprofil](docs/RAPPORT_PLAN.md) — R1–R6.

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
- [Designdiagram M5](docs/PERSONLIGT_DESIGNDIAGRAM.md)
- [φᵥ-opsummering M6](docs/PHI_OPSUMMERING.md)

**Reference og kortlægning**

- [Referencestatus](docs/REFERENCESTATUS.md)
- [Referencekontrol](reference/README.md)
- [Funktionsmatrix](docs/FUNKTIONSMATRIX.md)
- [Funktionskortlægning](docs/FUNKTIONSKORTLAEGNING.md)

**Rapport og arkitektur**

- [Arkitekturvalg](docs/ARKITEKTURVALG.md)
- [Rapportskabelon](docs/RAPPORTSKABELON.md)
- [Typst-afprøvning](docs/TYPST_AFPROEVNING.md)
- [Rapportevaluering](docs/RAPPORT_EVALUERING.md)

## Kilder

- Arbejdsmappe: `C:\MSL-Dimensionering` — https://github.com/1982Strand/msl-dimensionering (privat)
- Reference: `C:\geonet_beregning`, commit `a330cfd` — https://github.com/1982Strand/Geonet_beregning
