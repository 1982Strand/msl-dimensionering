# M5 — personligt designdiagram

30.09.2026. Implementeret efter godkendelse A-011/B-029. **M5-visningen er godkendt i B-031; rapporttilkoblingen er ikke færdig.**

`src/engine/personal-diagram.ts` porterer originalens `core/diagram.py:29` / `byg_designdiagram` og `app.py:4568–4634` / `_phi_kurver`, `_tegn_designdiagram`. Samme Plotly-specifikation bruges i React og ved SVG-eksport. Den eksisterende plotly.js-pakke indlæses efter behov; hover bevares.

Kurver, korrektioner, rækkefølge, signatur, intervalbånd, optimal/konservativ markering, akser, skala og hovertekster følger originalen. Punkter bruger eksakte tykkelser, før oprunding. X-aksen og hover er fortsat cm, også når opbygningsfigurer vises i mm. Det er originalens adfærd. Brugerdefineret har de to originale markørvalg, som huskes i browseren. Skjul af endepunkter påvirker φ-kurverne på samme måde som i originalen.

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

To målrettede Node-tests sammenligner alle 11 hele Plotly-specifikationer og alle otte UI-kalds argumenter uden tolerance. De fire eksisterende specifikationer i `figures.json` sammenlignes direkte og er uændrede. Sammen med 17 originale dimensioneringsforløb, dækningskontrol og to konstruktionstests består **22 målrettede Node-tests**. Hele den tidligere motorpakke er ikke genkørt i denne milepæl.

Ét browserforløb består for reel hover, markørvalg, genåbning, hurtige ændringer og synlige akser på en smal skærm. Typekontrol og produktionsbygning består; Vites eksisterende advarsel om store pakker er fortsat til stede. Den fulde browserpakke er ikke genkørt.

## SVG gennem Typst

`src/ui/plotly-export.ts` eksporterer vektor med `Plotly.toImage` fra en kopi af samme specifikation, så skærmdata ikke muteres. Et valgfrit fontvalg understøtter rapportens indlejrede fonte.

`tools/verify_personal_diagram_pdf.mjs` bruger browserens faktiske typst.ts og typst-ts-web-compiler **0.7.0**, læst fra demoens installerede afhængigheder. Demoen ændres ikke. Det er en isoleret integrationstest, ikke den færdige R2-compiler eller et nyt rapportlayout.

Fire SVG'er (Standard, interval, Brugerdefineret/interval og skala 0,8) er kompileret til en PDF med Carlito uden Typst-diagnoser. SVG'erne indeholder vektorer frem for rasterbilleder. PDF'en er renderet med Poppler, og alle fire sider er visuelt gennemgået for kurver, intervalbånd, markører, signatur og specialtegn. Ved fontskift kan eksporten indlæse den samme font i browseren før Plotlys tekstmåling. Materialet ligger lokalt i `output/personal-diagram-review/` og uploades ikke til Git.

Rapportens originale overskrift, egne margener og eksportmål (900 × 550 for diagrammet) er registreret i `reference/report-figure-cases.json`; de tilkobles under R3. Test-PDF'ens 1000 × 380-diagrammer er alene en SVG-kompatibilitetsprøve. De udgør ikke endelig PDF-designaccept.

## Fortsat åbent

Den konkrete M5-visning er godkendt i B-031. Den eksisterende udkastmærkning fjernes med næste kodeændring. M6/M2 er næste godkendte arbejdsdel; øvrige mellemregninger, rapportside, firmaprofil, fuld PDF-indholdskontrol og endeligt layout er fortsat åbne.
