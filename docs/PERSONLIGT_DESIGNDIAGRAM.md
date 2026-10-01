# M5 — personligt designdiagram

30.09.2026. Implementeret efter godkendelse A-011/B-029. **M5-visningen følger nu B-034/B-035: selvstændig SVG i variant 4-stil med decimalkomma; rapporttilkoblingen er ikke færdig.**

`src/engine/personal-diagram.ts` porterer originalens `core/diagram.py:29` / `byg_designdiagram` og `app.py:4568–4634` / `_phi_kurver`, `_tegn_designdiagram`. Datagrundlag og referencekontrol er uændret. `personal-diagram-svg.ts` omdanner specifikationen til en typet model og tegner samme SVG til skærm og rapport uden DOM eller Plotly. Plotly bruges fortsat til råkurver andre steder i appen.

Kurver, korrektioner, rækkefølge, signaturposter, intervalbånd, optimal/konservativ markering, akser og skala følger originalens data. Farver, gitter, prikkede optimale kurver, 10 % bånd og signaturboks øverst til højre følger den godkendte demo. Hover vælger nærmeste datapunkt på kurven inden for 16 SVG-enheder; resultatpunkter har forrang inden for 14. Værdi vises først med decimalkomma. Piletaster følger punkter/skifter kurve, og Escape fjerner markeringen. Punkter bruger eksakte tykkelser, før oprunding. X-aksen og hover er fortsat cm, også når opbygningsfigurer vises i mm. Brugerdefineret har de to originale markørvalg, som huskes i browseren. Skjul af endepunkter påvirker φ-kurverne på samme måde som i originalen.

De nye SVG-tests dækker de 10 optagne specifikationer, den optagne fejlcase og fire `figures.json`-diagrammer samt escaping, reservefarve, ugyldige koordinater, decimalkomma og eksportlighed. Ukendte navne tegnes neutralt; ikke-endelige koordinater filtreres. Figuren skaleres til containerens bredde.

Den statiske Plotly-temadefinition er kopieret fra originalens fastlåste figurreference til `personal-diagram-template.json`. Produktionskoden henter ikke forventede kurver eller beregningsresultater fra referencefiler.

## Reference og kontrol

`tools/capture_personal_diagram_reference.py` observerer originalens faktiske figurkald i AppTest af et isoleret Git-arkiv. Den ændrer ikke gamle arbejdsfiler. `--record` nægter at overskrive en eksisterende referencefil; uden flag sammenlignes det optagne output.

| Reference                   | Tilstand og dækket gren                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| FIG-001–004                 | Standard/Brugerdefineret, BK4, mm/cm, ugyldig 2-lagsløsning, NX850-interval, egne φ-værdier pr. kurve |
| M5-custom-hidden-points     | Begge markørvalg skjult, originalens kobling til φ-kurver                                             |
| M5-custom-manual-phi40      | Manuel φ = 40°                                                                                        |
| M5-custom-traffic-t4-eu7    | Trafikklasse T4, Eᵤ7, interpoleret Eₒ = 91,85329286335927                                             |
| M5-standard-traffic-t4-eu10 | Trafikklasse T4, Eᵤ10, Eₒ = 107,6                                                                     |
| M5-scaled-boundary          | Direkte originalkald med skala 0,8; randkurvenavn og alle koordinater                                 |
| M5-per-curve-phi            | Direkte originalkald med φ35/40/42 for de tre kurver                                                  |
| M5-empty-table              | Originalens fejl ved tom tabel; ingen opdigtet standardfigur                                          |

To uændrede Node-tests sammenligner de 10 hele Plotly-specifikationer, fejlcassen og alle otte UI-kalds argumenter uden tolerance. De fire eksisterende specifikationer i `figures.json` sammenlignes direkte og er uændrede. SVG-visningen tilføjer 19 tests; den samlede pakke består med **2.776 tests**.

Browserforløbet er tilpasset SVG og udvidet med tastaturbetjening. Det er forsøgt i denne worktree, men Chromium-start blev afvist af sandkassen med `spawn EPERM`; browseradfærden er derfor endnu ikke genkontrolleret. Typekontrol og formatering består. Standardbygningen blev blokeret af Vites midlertidige konfigurationsfil i det delte `node_modules`; bygningen består med `--configLoader native`. Vites eksisterende advarsel om store pakker er fortsat til stede.

## SVG gennem Typst

`src/ui/personal-diagram-export.ts` returnerer SVG direkte fra den fælles renderer. Mål og skrift kan vælges til rapporten; standarden er demoens 680 × 400 og `'Segoe UI', Carlito, system-ui, sans-serif`. Der er ikke længere browserbaseret tekstmåling eller fontindlæsning ved SVG-eksport. Typst indlæser selv rapportens fonte.

`tools/verify_personal_diagram_pdf.mjs` bruger browserens faktiske typst.ts og typst-ts-web-compiler **0.7.0**, læst fra demoens installerede afhængigheder. Demoen ændres ikke. Det er en isoleret integrationstest, ikke den færdige R2-compiler eller et nyt rapportlayout.

Den tidligere Plotly-milepæl kompilerede fire SVG'er (Standard, interval, Brugerdefineret/interval og skala 0,8) til PDF med Carlito uden Typst-diagnoser og gennemgik siderne visuelt. Integrationsværktøjet er nu tilpasset SVG-rendereren og gemmer `m5-svg-typst.pdf`. Materialet ligger lokalt i `output/personal-diagram-review/` og uploades ikke til Git.

Rapportens originale overskrift, egne margener og eksportmål (900 × 550 for diagrammet) er registreret i `reference/report-figure-cases.json`; de tilkobles under R3. Integrationsværktøjets diagrammer er alene en SVG-kompatibilitetsprøve og udgør ikke endelig PDF-designaccept.

## Fortsat åbent

Den konkrete M5-visning er godkendt i B-034/B-035, som afløser B-031. Øvrige mellemregninger, rapportside, firmaprofil, fuld PDF-indholdskontrol og endeligt layout er fortsat åbne.
