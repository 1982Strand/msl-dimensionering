# Migrationsplan og status

Oprettet 29. september 2026, samlet 30. september 2026. Aftaler og godkendelser står i [BESLUTNINGER.md](BESLUTNINGER.md). Tidligere statusafsnit findes i Git-historikken (senest `f5e66f2`).

## Formål og ramme

Den eksisterende Streamlit-app (`C:\geonet_beregning`, reference `a330cfd`) omskrives til React, TypeScript, Vite og shadcn/ui. Beregninger, standardværdier, gyldighedsområder, afrundinger, advarsler og funktioner bevares (B-003, B-008). Beregningsmotoren er flyttet til TypeScript (B-014); Python bruges kun som uafhængig reference. Ændringer af virkemåde, design og visualiseringer kræver brugerens godkendelse. Arbejdsgang og roller står i [AGENTS.md](../AGENTS.md) (B-033).

## Aktuel status — 01.10.2026 (opdateret)

| Område                                                            | Status                                                                                                                                                                                                                                                            | Dokument                                                                                                                                 |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Reference og kontrolgrundlag                                      | Fastlagt ved `a330cfd`. 2.062 core-cases, UI-snapshots samt figur-, produkt- og rapportreferencer er optaget fra isoleret original                                                                                                                                | [REFERENCESTATUS.md](REFERENCESTATUS.md), [reference/README.md](../reference/README.md)                                                  |
| Beregningsmotor                                                   | Porteret og kontrolleret uden tolerance. 2.810 Node-tests, 29 browserforløb og typekontrol består                                                                                                                                                                 | [BEREGNINGSMOTOR.md](BEREGNINGSMOTOR.md)                                                                                                 |
| Grunddata: Materialer, Designdiagrammer, Trafikklasse-korrelation | React-editorer med direkte redigering, ændringsvisning, fortryd og automatisk lagring (B-017–019). R-004 afventer vurdering                                                                                                                                       | [MATERIALEUDKAST.md](MATERIALEUDKAST.md), [GRUNDDATAUDKAST.md](GRUNDDATAUDKAST.md), [REDIGERING_OG_LAGRING.md](REDIGERING_OG_LAGRING.md) |
| Indstillinger                                                     | Felter, standarder, afhængigheder og lagring. Dynamiske afsnitsopsummeringer og alle Gælder-markeringer udestår                                                                                                                                                   | [INDSTILLINGER.md](INDSTILLINGER.md)                                                                                                     |
| Dimensionering                                                    | Formularer, produktvalg (B-023), produktoversigt og layout (B-024), opbygningsfigurer (B-025)                                                                                                                                                                     | [DIMENSIONERINGSUDKAST.md](DIMENSIONERINGSUDKAST.md), [OPBYGNINGSFIGURER.md](OPBYGNINGSFIGURER.md)                                       |
| Mellemregninger                                                   | Færdige: M1 (B-038–B-040), M3/M7, M4, M5 (B-034/B-035), M6, M8 og M9. M2 udgår (B-032). Dimensioneringssiden godkendt (B-042)                                                                                                                                     | [MELLEMREGNINGER_PLAN.md](MELLEMREGNINGER_PLAN.md), [DIMENSIONERINGSUDKAST.md](DIMENSIONERINGSUDKAST.md)                                 |
| Rapport og firmaprofil                                            | Plan godkendt (B-026–030). R1 rapportdata, R2 PDF-kompilering i browseren og R3 layout og figurer og R4 rapportside (godkendt B-044) er færdige; R5 firmaprofil (B-045) og R6 endelig PDF-godkendelse (B-055) er færdige                                          | [RAPPORT_PLAN.md](RAPPORT_PLAN.md)                                                                                                       |
| Geonet-database-side                                              | Færdig og godkendt (B-036, B-041): tabel, søgning, sortering og noter kontrolleret mod originalen                                                                                                                                                                 | [SIDER_PLAN.md](SIDER_PLAN.md)                                                                                                           |
| Hjælp-side                                                        | Færdig og godkendt (B-036, B-041): otte kapitler, formler, figurer, kilder og »gå til« kontrolleret mod originalen                                                                                                                                                | [SIDER_PLAN.md](SIDER_PLAN.md)                                                                                                           |
| Navigation og samlet brugerflade                                  | Alle otte sider er samlet i shadcn Sidebar (B-037) med originalens grupper, ikoner og versionsfod, hash-links, ikonvisning og mobilskuffe. Dimensionering er startside. Browserkontrol er tilføjet; temagennemgangen er færdig og godkendt (B-058, B-059). Samlet accept udestår | —                                                                                                                                        |
| Adgang, hosting og offentliggørelse                               | Webapp med lokal lagring i browseren (B-019, B-027). Adgang og hosting er ikke valgt (A-004)                                                                                                                                                                      | [ARKITEKTURVALG.md](ARKITEKTURVALG.md)                                                                                                   |

## Resterende arbejde i rækkefølge

1. **Samlet temagennemgang** (B-042): færdig og godkendt (B-058, B-059). Temaet er gennemført på alle sider med tokens, fælles sidehoved, shadcn-kontroller, beskeder og tabeller; de globale tabelregler er fjernet.
2. **Oprydning før brug:** udført (B-059). Designudkastets sider (`#designudkast`, `#designudkast-sidebar`) med hjælpedata og særskilt browsertest, temaudkastet (`#temaudkast`) med CSS og skærmudklip, de ubrugte shadcn-komponenter Card, Progress og Sonner samt `spikes/report-typescript/` med testkommando og konfigurationshenvisninger er fjernet. Dokumentationen bevares som historik. Mærket »Under udvikling« og fodnoten »Udkast · …« er fjernet sammen med temaet (B-058).
3. **Samlet accept** (fase 5 nedenfor) og afklaring af adgang og hosting (A-004). Merge til `main` og offentliggørelse kun efter brugerens aftale.

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
