# Migrationsplan og status

Oprettet 29. september 2026, samlet 30. september 2026. Aftaler og godkendelser står i [BESLUTNINGER.md](BESLUTNINGER.md). Tidligere statusafsnit findes i Git-historikken (senest `f5e66f2`).

## Formål og ramme

Den eksisterende Streamlit-app (`C:\geonet_beregning`, reference `a330cfd`) omskrives til React, TypeScript, Vite og shadcn/ui. Beregninger, standardværdier, gyldighedsområder, afrundinger, advarsler og funktioner bevares (B-003, B-008). Beregningsmotoren er flyttet til TypeScript (B-014); Python bruges kun som uafhængig reference. Ændringer af virkemåde, design og visualiseringer kræver brugerens godkendelse. Arbejdsgang og roller står i [AGENTS.md](../AGENTS.md) (B-033).

## Aktuel status — 01.10.2026

| Område                                                            | Status                                                                                                                                                                                                 | Dokument                                                                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Reference og kontrolgrundlag                                      | Fastlagt ved `a330cfd`. 2.062 core-cases, UI-snapshots samt figur-, produkt- og rapportreferencer er optaget fra isoleret original                                                                     | [REFERENCESTATUS.md](REFERENCESTATUS.md), [reference/README.md](../reference/README.md)                                                  |
| Beregningsmotor                                                   | Porteret og kontrolleret uden tolerance. 2.810 Node-tests, 29 browserforløb og typekontrol består                                                                                                      | [BEREGNINGSMOTOR.md](BEREGNINGSMOTOR.md)                                                                                                 |
| Grunddata: Materialer, Designdiagrammer, Trafikklasse-korrelation | React-editorer med direkte redigering, ændringsvisning, fortryd og automatisk lagring (B-017–019). R-004 afventer vurdering                                                                            | [MATERIALEUDKAST.md](MATERIALEUDKAST.md), [GRUNDDATAUDKAST.md](GRUNDDATAUDKAST.md), [REDIGERING_OG_LAGRING.md](REDIGERING_OG_LAGRING.md) |
| Indstillinger                                                     | Felter, standarder, afhængigheder og lagring. Dynamiske afsnitsopsummeringer og alle Gælder-markeringer udestår                                                                                        | [INDSTILLINGER.md](INDSTILLINGER.md)                                                                                                     |
| Dimensionering                                                    | Formularer, produktvalg (B-023), produktoversigt og layout (B-024), opbygningsfigurer (B-025)                                                                                                          | [DIMENSIONERINGSUDKAST.md](DIMENSIONERINGSUDKAST.md), [OPBYGNINGSFIGURER.md](OPBYGNINGSFIGURER.md)                                       |
| Mellemregninger                                                   | M5 færdig som egen SVG i variant 4-stil (B-034/B-035). M6 færdig. M1 færdig og godkendt (B-038–B-040). M2 udgår (B-032). M3, M4, M7, M8 og M9 udestår                                                  | [MELLEMREGNINGER_PLAN.md](MELLEMREGNINGER_PLAN.md)                                                                                       |
| Rapport og firmaprofil                                            | Plan godkendt (B-026–030): kun PDF med Typst i browseren, lokal download, redigerbar firmaprofil. R1–R6 er ikke implementeret; prototypen ligger i `spikes/report-typescript/`                         | [RAPPORT_PLAN.md](RAPPORT_PLAN.md)                                                                                                       |
| Geonet-database-side                                              | Færdig og godkendt (B-036, B-041): tabel, søgning, sortering og noter kontrolleret mod originalen                                                                                                      | [SIDER_PLAN.md](SIDER_PLAN.md)                                                                                                           |
| Hjælp-side                                                        | Færdig og godkendt (B-036, B-041): otte kapitler, formler, figurer, kilder og »gå til« kontrolleret mod originalen                                                                                     | [SIDER_PLAN.md](SIDER_PLAN.md)                                                                                                           |
| Navigation og samlet brugerflade                                  | Syv af originalens otte sider findes; Rapport mangler. Komponenter godkendt (B-037, bl.a. Sidebar til navigation). Samlet navigation, forside og visuel accept udestår. Designretning godkendt (B-020) | —                                                                                                                                        |
| Adgang, hosting og offentliggørelse                               | Webapp med lokal lagring i browseren (B-019, B-027). Adgang og hosting er ikke valgt (A-004)                                                                                                           | [ARKITEKTURVALG.md](ARKITEKTURVALG.md)                                                                                                   |

## Resterende arbejde i rækkefølge

1. **M3, M4, M7, M8 og M9** efter mellemregningsplanen.
2. **Rapport** R1 → R6: rapportdata, compiler i browseren, figurer og layout, rapportside, firmaprofil og samlet PDF-accept. `spikes/report-typescript/` udgår, når R2 afløser den.
3. **Indstillingernes resterende markeringer, samlet navigation og forside**, med visuel godkendelse.
4. **Samlet accept** (fase 5 nedenfor) og afklaring af adgang og hosting.

## Faser og acceptkriterier

**Fase 0 — reference og rammer (udført).** Referencen er den committede gamle app `a330cfd6734ac2478be1304a362c69f94e412d25` (B-007). Kildearkiv, lokale JSON-data, miljøoplysninger og kontrolsummer ligger lokalt i `reference-private/a330cfd/` uden for Git.

**Fase 1 — funktionsfortegnelse.** Alle otte sider og deres underfunktioner registreres med stabile ID'er, kilde, referencecase, ny implementation og kontrolstatus i [FUNKTIONSMATRIX.md](FUNKTIONSMATRIX.md). Sjældent brugte funktioner må ikke udgå stiltiende.

**Fase 2 — referencecases.** Originalens output optages, før den tilsvarende nye kode skrives, fra et isoleret arkiv af referencen, og eksisterende forventninger overskrives aldrig. Dækningen skal omfatte:

- belastnings- og trafikklasse, Standard og Brugerdefineret;
- uarmeret og et eller to geonetlag, samt produktvalg og -grupper;
- gyldighedsgrænser, oprunding, minimumstykkelser, lagfordeling og geonetplacering;
- mm/cm, redigerede data og indstillinger, rapportvalg og hele brugerforløb.

Accept: samme diskrete udfald, gyldighed, advarsler og oprundede og viste værdier. Tolerancer kræver særskilt godkendelse og må aldrig skjule ændret tykkelse, grænseafgørelse eller produktvalg.

**Fase 3 — design og visualisering.** Konkrete udkast med realistiske, syntetiske data. Appdesign og opbygnings- og figurvisualisering godkendes hver for sig. Et godkendt udkast tillader ikke ændrede beregningsregler.

**Fase 4 — implementering i afgrænsede dele.** Domænelogik, data, brugerflade og rapport holdes adskilt. Hver del afsluttes med:

- sammenligning mod referencen;
- opdatering af funktionsmatrixen;
- registrering af eventuelle godkendte afvigelser.

**Fase 5 — samlet accept og offentliggørelse.**

- Alle referencecases og hele forløb fra input til PDF skal køres.
- Aftalte browsere, skærmstørrelser, tilgængelighed og lagring skal kontrolleres.
- En oversigt over dækning og afvigelser skal foreligge.
- Versionsmærkning og mulighed for tilbagerulning skal være på plads.

Offentliggørelse først efter brugerens accept af den konkrete version.

## Procedure for forbedringer

Beskriv eksisterende adfærd med en konkret case, foreslået ny adfærd, begrundelse, påvirkede resultater, arbejdsgange og figurer samt kontrolmetode. Forelæg forslaget for brugeren, og registrér svaret, før ændringen indføres. Rutinemæssig intern strukturering kræver ikke ekstra godkendelse, når adfærden bevares og kontrolleres mod referencen.
