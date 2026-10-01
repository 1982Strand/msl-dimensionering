# Dæknings- og afvigelsesoversigt til samlet accept

Opdateret 01.10.2026 efter oprydningen (B-059), tilgængelighedskontrollen og fastlåsningen af R6-sættet (B-055) samt rammerne i B-060. Referencegrundlaget er den gamle app `a330cfd6734ac2478be1304a362c69f94e412d25` med indbyggede standardværdier (B-007/B-008). Oversigten bygger på de læste tests og [beslutningsloggen](BESLUTNINGER.md), ikke på en ny godkendelse. Den detaljerede funktionskobling står i [FUNKTIONSMATRIX.md](FUNKTIONSMATRIX.md).

## 1. Referencedækning

Alle **34 filer** i `reference/*.json` er optalt nedenfor. »Cases« betyder antal elementer i `cases`; »snapshots« og andre navngivne arrays tælles særskilt. Optællinger af historiske resultaters `tests`/`checks` er antal registrerede felter, ikke nye testcases. Filer med overlappende input lægges ikke sammen til ét antal uafhængige sager. »Ingen« betyder, at ingen af de nuværende `tests/*.test.ts` eller `tests/browser/*.spec.ts` læser filen; filen kan fortsat være historisk dokumentation.

Henvisninger via `tests/helpers/dimensioning-page.ts` og `tools/report-cases.ts` er angivet som indirekte læsning. Rapportens Node-tests og PDF-byggescripts er forskellige kontroller.

| Fil i `reference/` | Optalt indhold | Testfiler, der læser filen | Hvad der sammenlignes / afgrænsning |
| --- | --- | --- | --- |
| `construction-cases.json` | 6 cases | `tests/construction.test.ts` | Hele `ui.snit`-kolonner og effektive figurvalg: lag, netpositioner, optimale noter og status; desuden SVG-fravalg/escaping. |
| `core-cases.json` | 2.062 cases; 18 standardfelter | `tests/engine-reference.test.ts` | Fuld streng objektlighed og uændret input: opslag, korrektion, afrunding, lagfordeling, trafikregler, produktgrupper, placering og valideringsbeskeder; også indbyggede standarder. |
| `data-flow-cases.json` | 86 cases | `tests/data-flow.test.ts` | Korrelation og redigeret beregningsgrundlag, returværdier/fejltyper og uændrede input. |
| `dimensioning-page-cases.json` | 14 cases | Via `tests/helpers/dimensioning-page.ts`: `tests/dimensioning-page-reference.test.ts`, `tests/dimensioning-page.test.ts`, `tests/result-checks.test.ts`, `tests/net-details.test.ts`, `tests/traffic-popover.test.ts`; også `tests/settings-page.test.ts`, `tests/report-page.test.ts` og `tests/browser/settings.spec.ts` importerer hjælperen, men sammenligner deres egne referencer | M3/M7 komplette afsnit/status, M4 HTML og titelhjælp, M8 popuptræ og M9 elementer/rækkefølge/fravær. Hjælperkontrollen genskaber input og finder viste tykkelser; ingen fuld DOM-/pixelparitet. |
| `dimensioning-page-extra-cases.json` | 3 cases: LT-1, LT-2, MIN-1 | Samme læsere som `dimensioning-page-cases.json` | Tillæg for restlag/VD-minima og samlet minimum; samme delvise sidetræskontrol som ovenfor. |
| `dimensioning-ui-cases.json` | 9 snapshots | `tests/product-picker.test.ts` | Første snapshots Standard-produktliste og etiketter bruges til de 20 produkter, rækkefølge, seriegrupper og mærker. Alle ni widget-snapshots sammenlignes ikke automatisk. |
| `edit-history-results.json` | 6 testresultatfelter, 6 kontrolfelter | Ingen | Historisk resultatregistrering, bl.a. 8 markeringseksempler og 2.614 beståede tests; ingen nutidig automatisk genkontrol af registreringen. |
| `editing-cases.json` | 150 cases | `tests/editing.test.ts` | Originale editor-/JSON-hjælpere: normalisering, tabelopbygning, returværdier/fejltyper og ingen inputmutation. Kodede ikke-endelige tal dekodes før sammenligning. |
| `editing-results.json` | 7 testresultatfelter, 5 kontrolfelter | Ingen | Historisk editor-/datakontrol; registreringen er ikke en aktiv testfixture. |
| `engine-boundaries.json` | 255 cases | `tests/engine-boundaries.test.ts` | Eksakt Python-afrunding/-formatering, normalisering, Eo-klasse, standardspecifikation og beregningsgrænser. |
| `environment.json` | 65 pakkeversioner samt Python-/platformoplysninger | Ingen | Dokumentation af referencemiljø, ingen resultatkontrol. |
| `figures.json` | 4 FIG-poster | `tests/personal-diagram.test.ts`, `tests/personal-diagram-svg.test.ts` | Det personlige diagrams `charts[1]`: fuld Plotly-specifikation og SVG-modellens kurver/bånd/punkter/akser/signatur. Øvrige registrerede diagrammer og pixels sammenlignes ikke her. |
| `inventory.json` | 13 kildefiler, 426 funktionsposter og 98 widgetposter | Ingen | Statisk fortegnelse, ingen automatisk sammenligning med den nye app. |
| `kobling-cases.json` | 8 cases med i alt 8 figurkald | `tests/kobling-explanation.test.ts`, `tests/kobling-figures.test.ts` | M1-trin, HTML-krop, tal, enheder, fremhævelser og synlighed; figurernes rå data, akser, etiketter, signatur og originalens SVG-kodning. Nyt udseende efter B-034/B-039/B-040 kontrolleres særskilt. |
| `material-ui-results.json` | 3 testresultatfelter, 6 kontrolfelter | Ingen | Historisk Materialer-gennemgang, bl.a. 11 browserforløb; ikke dokumentation for en ny browserkørsel. |
| `pages-cases.json` | Geonet-database: 14 events, herunder 20 × 25 = 500 celler; Hjælp: 68 standardevents, 234 alle-åbne-events, 8 kapitler og 8 kildedokumenter | `tests/geonet-database.test.ts`, `tests/hjaelp.test.ts` | Alle databasekolonner/-celler/-hjælpetekster og fem noter; hjælpeparser, hele tekst-/formel-/figur-/knapstrømmen i original rækkefølge samt ruter. |
| `personal-diagram-cases.json` | 11 cases, heraf 1 fejlcase | `tests/personal-diagram.test.ts`, `tests/personal-diagram-svg.test.ts` | Fuld Plotly-specifikation eller præcis fejltekst; originalkald og SVG-data/akser/signatur. Godkendt SVG-stil er ikke pixelparitet med Plotly. |
| `phi-summary.json` | 11 cases og 4 helpercases; 4 kaldstedsregistre | `tests/phi-summary.test.ts`, `tests/browser/phi-summary.spec.ts` | Aktive M6-formler, afrunding, synlighed og tabeldata; helperens tomme/0/procentvægte og tomme kaldlister for inaktive funktioner. Browseren bruger udvalgte cases. |
| `product-overview-cases.json` | 6 cases | `tests/product-overview.test.ts`, `tests/product-picker.test.ts` | Syv kolonnenavne, alle viste celler, valgt produkt og undertekst i Standard/Brugerdefineret, belastnings-/trafikklasse og mm/cm. Vælgertesten bruger trafikcasenes Klasse-kolonne til mærker/anbefaling. |
| `report-contexts.json` | 10 cases | `tests/report-data.test.ts`; indirekte via `tools/report-cases.ts`: `tests/report-data.test.ts`, `tests/report-document.test.ts` | Hele rapportkontekst/overskrifter med udeladelse af de to billeder, der dækkes af R3; rå kontekststrenge ændres ikke af formateringslaget. Dokumenttesten kontrollerer JSON-transport. |
| `report-figure-cases.json` | 7 cases | `tests/report-figures.test.ts` | Hele oprindelige rapportfigurkald, snitvalg, eksportbredde/-højde/-skala, margener og titel; original målestok tilpasses den fælles SVG. |
| `report-figure-extra-cases.json` | 1 case | `tests/report-figures.test.ts` | Ren indtastet søjle; samme kontrol som rapportfigurerne ovenfor. |
| `report-format-results.json` | 10 layoutposter, 10 indholdskontroller og 10 eksportposter | Ingen | Historisk Word/Typst-prototype, ingen genkørsel gennem den nuværende testpakke; afgrænset historisk visuel kontrol står i filen. |
| `report-page-cases.json` | 5 cases | `tests/report-page.test.ts` | Hele R4-indholdsstrømmen fra sidehovedet, feltstandarder/-hjælp/-aktivering og tekstafsnit med navngivne B-043/B-046/B-048/B-049-tilpasninger. |
| `report-prototype-results.json` | 10 kontrolposter, 10 Typst-tidsmålinger og 10 Word-PDF-tidsmålinger | Ingen | Historisk rapportafprøvning; filens 5 beståede prototypetests er ikke ekstra tests i den aktuelle `npm test`. |
| `report-template-audit.json` | 7 rapportafsnit, 35 dokumentdele, 26 placeholderposter, 2 tabeller, 1 sideopsætning og 7 fontposter | Ingen | Audit af originalens Word-skabelon, ikke automatisk paritetstest af Typst-layout. |
| `review-cases.json` | 8 cases | `tests/edit-history.test.ts` | Originalens præcise ændringsceller, nye rækker og antal fjernede rækker; særskilte tests dækker den godkendte nye historik. |
| `settings-effects-cases.json` | 6 snapshots | `tests/settings-presentation.test.ts` | De første fire omfangstekster og første afvigelsestabel pr. snapshot ved standard og ændrede yderregler. |
| `settings-page-cases.json` | 4 cases | `tests/settings-page.test.ts`, `tests/browser/settings.spec.ts` | Alle otte afsnitsopsummeringer og indhold med Gælder, feltidentiteter, kolonner og expandergrænser. Browseren sammenligner standard/klassisk og ændrede valg. |
| `settings-ui-cases.json` | 1 snapshot og 4 standardgrupper | `tests/browser/settings.spec.ts` | Widgetstandarder, aktiv/deaktiveret tilstand og ændret indstillingspayload; udvalgte grænser/afhængigheder/genåbning/nulstilling. |
| `table-explanation-cases.json` | 2 cases med 54 samples hver (108 opslag), 2 yderregelcases samt 3 vejledningsgrupper | `tests/table-explanation.test.ts` | Regneeksemplets trin, valgt eksempelcelle og yderregeltekst. Vejledningsgruppernes tekster sammenlignes ikke af denne test. |
| `table-ui-cases.json` | 8 rådiagramcases, 2 CSV-cases, 2 præsentationscases, 6 dækningscases og 6 aflæsningspunkter | `tests/table-presentation.test.ts`, `tests/browser/tables.spec.ts` | Plotly-specifikation, CSV-strenge, korrelations-/asfaltrækker og dækningsetiketter. Browseren bruger præsentationscase 2 til faktisk tabel efter redigering; aflæsningspunkterne sammenlignes ikke af disse tests. |
| `typescript-engine-results.json` | 6 testresultatfelter, 4 kontrolfelter | Ingen | Historisk motorregistrering med 2.337 beståede tests; erstattes ikke og er ikke det aktuelle testantal. |
| `ui-flows.json` | 24 snapshots, heraf 17 på Dimensionering | `tests/dimensionering.test.ts`, `tests/dimensioning-form.test.ts`, `tests/report-data.test.ts`, `tests/report-figures.test.ts`, `tests/browser/dimensioning.spec.ts`; indirekte via `tools/report-cases.ts` også `tests/report-document.test.ts` | Hele beregnings-/rapportpayloads fra de 17 aktive snapshots og originale rapporttabeller; R3 bruger standardtabellen. Browseren kontrollerer udvalgte viste resultater/forløb. De 7 øvrige snapshots er ikke selvstændige beregningstests. |

### Navngivne ændringer og testadaptere

De frosne referencefiler er uændrede. Godkendte ændringer er eksplicitte adaptere eller særskilte forventninger i testene; de udgør ikke en generel normalisering af originalen.

| Test / navn | Præcis afgrænsning |
| --- | --- |
| `tests/report-page.test.ts` — B-043 | Originalens fulde rapportside-undertekst `REPORT_INTRO_ORIGINAL` erstattes af `REPORT_INTRO` i sidehovedet. Testen kræver, at originalteksten findes; Word/PDF-sætningen bliver til PDF. |
| Samme — `applyB046ApprovedChanges` | Tilføjer »Medtag i rapporten«, tekstværktøjslinje og `REPORT_FORMAT_HELP` til de syv tekstexpandere. Flytter præcis de tre designdiagramvalg fra valgrækken til diagramkortet. Kommentaren kalder dette en navngiven udvidelse, »ingen normalisering«. |
| Samme — `applyB048ApprovedChanges` | Omdøber Kontrol til Kontrollant; tilføjer fem felter: sagsbehandler-initialer/-telefon og kontrollant-initialer/-mail/-telefon, to kartotekvalg samt checkbox til kontrollant i bunden. |
| Samme — `applyB049ApprovedChanges` | Omdøber Kontrollant-etiketter til Kvalitetssikring; erstatter originale grundlags-checkboxes med `table_line`-rækker og indsætter Dimensioneringsresultat-expander med forklaring og redigerbare linjer. Beregnede værdier kontrolleres særskilt i `tests/report-data.test.ts` mod frosne rapporttabeller. |
| `tests/dimensioning-page.test.ts` — `resultHeadingWithNumberB054` | Kræver originalens præcise Resultat-prefix; udskifter kun overskriftens ramme til »3 Resultat«. Resten af M9-indholdet sammenlignes præcist. |
| `tests/product-picker.test.ts` — B-054/B-056/B-057 | Originalens Klasse-etiket vises som Belastningsklasse/Trafikklasse; intervalbindestreg i klassemærker bliver »–«, originalens korrektionstal bevares med »−«, og »opt.« vises som »Optimal korrektion«. Trafikmærker kommer fra originalens Klasse-kolonne; anbefalingsfarve er et særskilt forventet mærke. |
| `tests/browser/dimensioning.spec.ts` — B-023 | Efter navigation/genåbning sammenlignes det bevarede produkt med UI-003. UI-005's originale produktnulstilling overskrives ikke. |
| `tests/report-data.test.ts` — R1/B-046 | `visualisering` og `designdiagram` udelades alene fra rå kontekstsammenligning, fordi de dækkes af R3. Ingen trim, talafrunding, whitespace- eller Unicode-normalisering. B-046 er et ekstra `formattedTexts`-lag; rå strenge forbliver originale. |
| `tests/geonet-database.test.ts` — `normalizeCells` | Kun cellers transporttype normaliseres med `String`, så pandas-tal og JS-tal/tekst kan sammenlignes. Ingen normalisering af whitespace, tegn, decimaler, procent eller rækkefølge. |
| `tests/settings-page.test.ts` — `htmlText` / indholdsadapter | HTML-tags fjernes og de fem angivne HTML-entiteter dekodes i tekstfelter/overskrifter. Feltidentiteter, rækkefølge, kolonne- og expandergrænser bevares; tabellen repræsenteres som tabelmarkør, dens værdier dækkes særskilt. |
| `tests/hjaelp.test.ts` — S2/B-036 | Originalens `column`-events udelades fra tekst-/knapstrømmen. Visningsmodellen sættes i originalens HTML-rammer. Kun genvejsknapper uden en kendt rute filtreres i den særskilte rutesammenligning; Rapport-ruten findes nu. |
| `tests/traffic-popover.test.ts` — `capturedTree` | Genskaber Streamlits transportwrapper; `activeRow`, `activeColumn` og `styles` udelades fra dataframe-træsammenligningen, fordi de ikke ligger i den optagne dataframe. Markeringerne kontrolleres særskilt mod Styler-regler og i browser. Tekst/rækker er uændrede. |
| `tests/editing.test.ts` — `decode` | Fiksturens `$float`-markører dekodes til NaN/±Infinity. Originale fejltyper sammenlignes; ingen numerisk tolerance. |
| `tests/kobling-explanation.test.ts` / `tests/kobling-figures.test.ts` — M1 | Originalens ydre HTML-/kolonne-/figurwrappere separeres i optagelsen; indhold og rå data sammenlignes præcist. SVG-koordinater gemt med 0,1 SVG-enhed kontrolleres via kodningsintervaller ±0,05 i originalens koordinatsystem. Det beskriver informationstabet i originalens SVG, ikke en tolerance på beregningsdata eller nye pixels. |
| `dimensioning-page-cases.json` / tillæggets optagelsesformat | SVG-HTML lagres som SHA-256/længde, Plotly som type/position, dataframes som kolonner/rækker/konfiguration og widgets som egenskaber. M3–M9 sammenligner deres ejede dele; figurernes indhold dækkes af egne referencer. Sidetræet er ikke en fuld pixelkontrol. |

Figurernes nye stil/decimalkomma følger B-025/B-034/B-035/B-039/B-040; datagrundlaget sammenlignes separat. Temaets kontroller i browserkommentarerne henviser til B-058/B-059. PDF-byggescriptets whitespace-/sideskiftsadapter står i afsnit 5 og er ikke en beregningstolerance.

## 2. Godkendte afvigelser fra originalen

Tabellen medtager ændringer af brugerflade, arbejdsgang, tekst og output, som faktisk er besluttet i [BESLUTNINGER.md](BESLUTNINGER.md). Senere præciseringer står ved deres egne B-numre. Godkendelse af en plan eller videre afprøvning er ikke endelig visuel accept.

| Beslutning | Ændring og afgrænsning | Område | Håndhævelse / kontrol |
| --- | --- | --- | --- |
| B-002 | React/TypeScript/Vite/shadcn erstatter Streamlit-brugerfladen; konkret design kræver særskilt accept. | Hele brugerfladen | `src/ui/App.tsx`, `src/components/ui/`; `tests/browser/navigation.spec.ts`. |
| B-017 | Direkte redigering uden Redigér/Gem; gyldige ændringer anvendes og gemmes automatisk. | Materialer, diagrammer, VejDim | `src/ui/Materials.tsx`, `src/ui/DataTables.tsx`, `src/engine/auto-edit.ts`; `tests/auto-edit.test.ts`, `tests/browser/materials.spec.ts`, `tests/browser/tables.spec.ts`. |
| B-018 | Standard-/ændringsvisning og filter, Fortryd/Gentag i aktiv session og gendan celle/række. | Grunddata | `src/engine/edit-review.ts`, `src/engine/edit-session.ts`; `tests/edit-history.test.ts` og de to editor-browserfiler ovenfor. |
| B-019 | Data/værdier gemmes mellem sessioner i samme browser/computer; ét localStorage-JSON, ingen navngivne dataprofiler. | Lagring | `src/engine/session-storage.ts`, `src/engine/saved-editor.ts`, `src/ui/EditorContext.tsx`; `tests/session-storage.test.ts`, `tests/browser/materials.spec.ts`. |
| B-020 | Materialeudkastets mørkegrønne topbjælke, lyse tabeller og gule ændringsmarkeringer kan videreføres. | Appdesign | `src/index.css`, `src/ui/Materials.tsx`; `tests/browser/materials.spec.ts`; senere tema B-058/B-059. |
| B-023 | Gyldigt Standard-geonet bevares ved navigation og mellem sessioner. | Dimensionering / FUND-001 | `src/ui/Dimensioning.tsx`, `src/ui/EditorContext.tsx`; `tests/browser/dimensioning.spec.ts` (UI-003 efter navigation/genåbning). |
| B-024 | Vandrette klassevalg; diagram/Cv i popup uden højere hovedboks; originalens syv produktkolonner/sortering. | Dimensionering | `src/ui/Dimensioning.tsx`, `src/ui/InfoPopup.tsx`, `src/engine/product-overview.ts`; `tests/product-overview.test.ts`, `tests/browser/dimensioning.spec.ts`. |
| B-025 | Det forelagte opbygningsdesign er godkendt; M1/M5/PDF har separat accept. | Opbygningsfigurer | `src/engine/construction-svg.ts`, `src/ui/ConstructionFigure.tsx`; `tests/construction.test.ts`, `tests/browser/construction.spec.ts`. |
| B-026 | Typst/PDF alene; Word-eksport og dermed Word-fallback udgår. Krav om perfekt PDF-opsætning. | Rapportformat | `src/report/compiler.ts`, `src/ui/Report.tsx`; `tests/report-compiler.test.ts`, `tests/browser/report.spec.ts`; endelig visuel accept B-055. |
| B-027 | Webapp med lokal PDF-download uden serverlagring. | Rapportlagring | `src/ui/Report.tsx`; `tests/browser/report.spec.ts` kontrollerer download og fravær af eksterne HTTP-kald i de afprøvede forløb. |
| B-028 | Redigerbar firmaprofil i appen; profil er data, layout er kode; de syv standardtekster flyttes ikke ind i profilen. | Firmaprofil | `src/report/company-profile.ts`, `src/ui/CompanyProfile.tsx`; `tests/company-profile.test.ts`, `tests/browser/company-profile.spec.ts`. |
| B-029 | Browserkompilering med typst.ts godkendt; tom medtaget tekst bevarer overskrift, syv projektfelter huskes og dato starter dags dato. | Rapportarkitektur og kontrakt | `src/report/compiler.ts`, `src/report/report-page.ts`, `src/report/typst/layout.typ`; `tests/report-document.test.ts`, `tests/report-page.test.ts`, `tests/browser/report.spec.ts`. Indholdsreglerne her viderefører originalen. |
| B-030 | Rapporttekster og valg huskes; fælles nulstilling til standard tilføjes. Kun aktuelt gyldige valg anvendes; dato undtaget. | Rapportarbejdsgang | `src/report/report-page.ts`, `src/ui/Report.tsx`; `tests/report-page.test.ts`, `tests/browser/report.spec.ts`. |
| B-031 | Forelagt M5 Plotly-visning godkendt, senere afløst af B-034's SVG-visning. | Personligt designdiagram | `src/engine/personal-diagram.ts`; `tests/personal-diagram.test.ts` bevarer data/specifikation; aktuel renderer er SVG. |
| B-032 | Kun originalens aktive mellemregningsforløb bevares; ubrugte M2-tabeller forbliver skjult. Ingen ny regel. | Mellemregninger | `src/ui/CouplingExplanation.tsx`, `src/engine/phi-summary.ts`; `tests/phi-summary.test.ts` kontrollerer originale tomme kaldlister; `tests/browser/kobling.spec.ts` kontrollerer aktiv M1. |
| B-034 | Variant 4: selvstændig SVG for M1/M5, kurvepunkter, intervalbånd, prikkede optimale kurver, hover/tastatur og samme SVG på skærm/PDF. Afløser B-031; farver revideres i B-040. | Figurstil | `src/engine/personal-diagram-svg.ts`, `src/engine/kobling-figures-svg.ts`; `tests/personal-diagram-svg.test.ts`, `tests/kobling-figures.test.ts` og deres browserforløb. |
| B-035 | Decimalkomma i hover, akser og etiketter; værdier/afrunding uændrede. | Figurer | Samme SVG-motorer; `tests/personal-diagram-svg.test.ts`, `tests/browser/personal-diagram.spec.ts`, `tests/browser/kobling.spec.ts`. |
| B-036 | Geonet-/Hjælp-delplan godkendt; genveje til endnu ikke eksisterende sider skjules midlertidigt. | Opslag og hjælp | `src/engine/hjaelp.ts`, `src/ui/Help.tsx`; `tests/hjaelp.test.ts`. Rapport-ruten findes nu; originalens otte kapitler har ingen Rapport-genvej. |
| B-037 | Sidebar, Accordion, Tooltip/Hover Card, Data Table, Alert, Sonner, Tabs/Sheet og Progress godkendt som komponentvalg. Konkrete sidelayouts og R-004 har separat omfang. | Fælles brugerflade | `src/components/ui/`, `src/ui/App.tsx`; konkrete sideforløb. Designudkastet og dets test er fjernet ved oprydningen (B-059); Sonner og Progress blev ikke taget i brug og er fjernet. |
| B-038 | Én lukket udfoldelig »Sådan er resultatet beregnet« med alle originale trin; forkastede M1-udkast merges ikke. | M1-layout | `src/ui/CouplingExplanation.tsx`; `tests/kobling-explanation.test.ts`, `tests/browser/kobling.spec.ts`. |
| B-039 | Konkret M1 godkendt efter rettelse, signatur under figuren; M5 beholder signaturboks inde i plottet. | M1/M5-layout | `src/ui/CouplingExplanation.tsx`, `src/engine/personal-diagram-svg.ts`; `tests/browser/kobling.spec.ts` og SVG-tests. |
| B-040 | Appskrift i M1, fastbredde kun i regnestykker; 2 lag lilla; bruger-Eu grønt/gråt. M5's indtastede opbygning blev rød, men er ifølge loggen ikke særskilt bekræftet. | Figurer og mellemregningstekst | `src/engine/personal-diagram-svg.ts`, `src/engine/kobling-figures-svg.ts`, `src/ui/CouplingExplanation.tsx`; figurtests. **Godkendelsesforbeholdet for M5 bevares**, se afsnit 6. |
| B-041 | Geonet-database med søgning/sortering/fast produktkolonne; Hjælp med flere åbne og huskede kapitler, originale tekster/formler/figurer. | Geonet-database og Hjælp | `src/ui/GeonetDatabase.tsx`, `src/ui/Help.tsx`; `tests/geonet-database.test.ts`, `tests/hjaelp.test.ts` og de to side-browserforløb. |
| B-042 | Konkret dimensioneringsside med M3/M7/M4/M8/M9, kort og nøgletal godkendt; fælles temagennemgang senere. | Dimensioneringslayout | `src/ui/Dimensioning.tsx`, `src/ui/DimensioningPageContent.tsx`; `tests/dimensioning-page.test.ts`, `tests/browser/dimensioning-page.spec.ts`. Tema senere B-058/B-059. |
| B-043 | Rapportens undertekst omtaler ét PDF-dokument i stedet for Word og PDF. | Rapporttekst | `src/report/report-page.ts`; eksplicit erstatning i `tests/report-page.test.ts`. |
| B-044 | Rapportside med fire faste kort, redigerbare tekster/valg, live PDF og downloadspærring godkendt. | Rapportlayout og forløb | `src/ui/Report.tsx`, `src/report/compile-queue.ts`; `tests/browser/report.spec.ts`, `tests/report-compiler.test.ts`. |
| B-045 | Samlet sidebar med grupper/ikoner/version/startside og Firmaprofil-fane med live PDF, IndexedDB-logo, import/eksport/nulstilling godkendt. | Navigation og firmaprofil | `src/ui/App.tsx`, `src/ui/CompanyProfile.tsx`, `src/report/profile-storage.ts`; `tests/browser/navigation.spec.ts`, `tests/company-profile.test.ts`, `tests/browser/company-profile.spec.ts`. |
| B-046 | Rigtige punkter/underpunkter, fed/kursiv og værktøjslinje; medtag/fravælg syv afsnit; diagramvalg flyttes ned til diagramkortet. | Rapportindhold/-layout | `src/report/text-format.ts`, `src/report/report-document.ts`, `src/ui/Report.tsx`; `tests/text-format.test.ts`, `tests/report-document.test.ts`, `tests/report-page.test.ts`, `tests/browser/report.spec.ts`. |
| B-047 | Gennemførelse af B-046 godkendt; underpunkter bruger »◦« i PDF. | Rapportformatering | `src/report/typst/layout.typ`; formaterings-/dokumenttests og R6-sættet. |
| B-048 | Medarbejderkartotek, fire personfelter pr. rolle, initialer øverst/navnefallback og valgfri ekstra bundkolonne. | Firmaprofil/rapport | `src/report/company-profile.ts`, `src/report/report-data.ts`, `src/ui/CompanyProfile.tsx`; `tests/company-profile.test.ts`, `tests/report-data.test.ts`, `tests/report-page.test.ts`, `tests/browser/company-profile.spec.ts`. Samlet gennemførelse godkendt B-052. |
| B-049 | Kontrollant/Kontrol bliver Kvalitetssikring; telefon i cifrepar før mail; grundlags-/resultatlinjers tekst/værdi kan rettes/skjules og nulstilles med besked ved ændret beregning. | Rapporttekst/-linjer | `src/report/phone-format.ts`, `src/report/report-data.ts`, `src/report/report-page.ts`, `src/report/typst/layout.typ`; `tests/phone-format.test.ts`, `tests/report-data.test.ts`, `tests/report-page.test.ts`, `tests/browser/report.spec.ts`. Samlet accept B-052. |
| B-050 | Én tilføjelsesformular og kartotek i Sheet; personer kan rettes/slettes med bekræftelse. Formularplacering præciseres i B-051. | Medarbejderkartotek | `src/ui/CompanyProfile.tsx`; `tests/browser/company-profile.spec.ts`. |
| B-051 | Tilføj medarbejder i Popover med Tilføj; gyldig oprettelse tømmer/lukker formularen. Sheet bevares. | Medarbejderkartotek | `src/ui/CompanyProfile.tsx`; `tests/browser/company-profile.spec.ts`. |
| B-052 | B-048–B-051 samlet godkendt; ens mørkegrønne checkboxes i hele appen; Indrykning-knap indsætter tabulator i valgte linjer. | Appkontroller/rapporttekst | `src/components/ui/checkbox.tsx`, `src/report/text-format.ts`, `src/ui/Report.tsx`; `tests/text-format.test.ts` og R6. Ens udseende af alle checkboxes og Indrykning-knappens browserklik er ikke kontrolleret automatisk som samlet forløb. Rettelserne godkendt B-053. |
| B-053 | B-052-rettelser godkendt; Forklaring bliver spørgsmålstegn med Hover Card ved etiket, mus/fokus/tryk; tekst uændret. | Indstillinger og Dimensionering | `src/ui/SettingField.tsx` (`HelpHint`). `tests/browser/acceptance-gaps.spec.ts` tester mus, tastaturfokus, Escape, fokus ud, klik, rigtige touch-tryk, uændret help og uændret placering af et felt nedenunder; består. Testen afslørede, at et klik eller tryk på et åbent kort lukkede og genåbnede det (tryk på ikonet talte som tryk udenfor, og den forsinkede hover-åbning genåbnede efter et hurtigt klik). Rettet i `HelpHint`, så andet klik/tryk lukker, som B-053 beskriver. |
| B-054 | Søgbar Combobox med serier, klassemærker/anbefalingsfarver, korrektions-/referencemærker og lokalt anbefalingsfilter fra som standard; Resultat får nummer 3. Tykkelser er ikke valgt til vælgeren. | Produktvalg/Resultat | `src/engine/product-picker.ts`, `src/ui/ProductPicker.tsx`, `src/engine/dimensioning-page.ts`; `tests/product-picker.test.ts`, `tests/dimensioning-page.test.ts`, `tests/browser/product-picker.spec.ts`. |
| B-055 | R6-sættet på 31 PDF'er/99 sider godkendt med font-/figur-/outputforskelle fra Word og ændringer B-026–B-054. | Endelig PDF | `tools/build-r6-pdfs.ts`, [RAPPORT_PLAN.md](RAPPORT_PLAN.md); [afsnit 5](#5-pdf-kontrol). Gælder det forelagte sæt; fremtidige layoutændringer forelægges igen. |
| B-056 | Bredere produktvælger med højrestillede mærker, »Optimal korrektion«, fokuslinje og mobilombrydning. | Produktvælgerlayout/-tekst | `src/ui/ProductPicker.tsx`, `src/engine/product-picker.ts`, `src/index.css`; `tests/product-picker.test.ts`, `tests/browser/product-picker.spec.ts`. De præcise 820/640 px-mål og fokuslinjen har ingen særskilt automatisk assertion. |
| B-057 | Rigtigt »−« i vælgerens korrektionsmærker; originaletiketter/data/beregninger uændrede. | Produktvælgertekst | `src/engine/product-picker.ts`; `tests/product-picker.test.ts` kontrollerer alle originale korrektionstal/minustegn. |
| B-058 | Tema: farver/skrift, fælles topbjælke/sidehoved/stier, segmenterede radiovalg, nye shadcn-kontroller, fliser/mærker/Alerts, tabeller, knapper og rapportfaner. Tal/valg/tekster/beregninger uændrede. | Hele appens udseende | `src/index.css`, `src/ui/page.tsx`, `src/ui/SettingField.tsx`, `src/ui/Notice.tsx`, `src/components/ui/`; udvalgte temaassertions i `tests/browser/navigation.spec.ts`, `tests/browser/settings.spec.ts`, `tests/browser/traffic-popover.spec.ts`. Ikke automatisk fuld temaparitet. |
| B-059 | Temaets gennemførelse godkendt: også segmenterede T1–T6, fjernet Under udvikling/Udkast-fodnote, talfelter uden pile og korrelationsmarkering i temafarve. Oprydning af udkast, ubrugte komponenter og rapportforsøget. Codex bruges til flere opgaver; roller B-033 uændrede. | Tema | Samme temafiler; `tests/browser/navigation.spec.ts` kontrollerer fravær af Under udvikling, `tests/browser/traffic-popover.spec.ts` markering. Alle nævnte detaljer har ikke særskilte automatiske assertions. |
| B-060 | Rammer for accept: Chrome som browser, intern brug nu, offentliggørelse på hjemmesiden afklares senere, versionsnummeret v0.6 bevares. | Accept og adgang | `playwright.config.ts` (Desktop Chrome); sidebjælkens versionsfod uændret, `tests/browser/navigation.spec.ts`. |

Rene procesbeslutninger og bevaringskrav, som ikke i sig selv godkender en ændring af originalens brugeradfærd, samles særskilt:

- **B-001, B-005, B-006, B-007, B-009:** repository/arbejdsmappe, samarbejde, arkitekturafklaring, referenceversion og igangsættelse.
- **B-003, B-004, B-008:** bevaringskrav, krav om konkrete designgodkendelser og indbyggede standarder.
- **B-010–B-013:** evaluering/afprøvning af TypeScript/Typst, bevaring af rapportdata/formatering og fortsættelse på prototypegrundlag. B-011 er senere afløst af B-026 for Word-eksport; B-013 var ikke samlet accept.
- **B-014, B-015:** TypeScript-motor med Python-reference og brug af Serena/Semble; ingen ny beregningsregel eller tolerance.
- **B-016:** bestilling af redigeringsforslag; ingen automatisk godkendelse af forslagene.
- **B-021, B-022, B-033:** målrettede tests/tokenforbrug, model-/hjælpeagentvalg og Claude/Codex-roller. Procesdelen i B-059 viderefører B-033.
- **P-001/P-002:** foreløbige praktiske opstartsvalg, herunder privat repository; ikke B-beslutninger om offentliggørelse.

A-004 er afklaret for nu ved B-060. A-006 og A-008/R-004 er åbne afklaringer, ikke godkendte afvigelser.

## 3. Fund i originalen

Alle fem fund fra [FUND.md](FUND.md) bevares i oversigten. Den gamle app og de frosne forventninger er uændrede.

| Fund | Håndtering i den nye app | Kontrol / åbent forhold |
| --- | --- | --- |
| FUND-001 — Standard-produkt nulstilles ved navigation | Rettet efter B-023: gyldigt produkt bevares i gemte formularværdier ved navigation og genåbning. | `src/ui/Dimensioning.tsx`/`src/ui/EditorContext.tsx`; `tests/browser/dimensioning.spec.ts` bruger UI-003 efter navigation i stedet for at ændre UI-005. |
| FUND-002 — manuel armering findes i kode, vælgeradgang uafklaret | Generisk netkorrektion og den manuelle databasepost bevares i motor/datagrundlag; `src/engine/products.ts` springer fortsat »Anden armering (manuel)« over. Der tilføjes ingen UI-adgang. | `tests/engine-reference.test.ts` kontrollerer korrektion/produktoutput; `tests/product-picker.test.ts` kontrollerer originalens 20 vælgerprodukter. Tilsigtet adgang er fortsat uafklaret; ingen godkendt rettelse. |
| FUND-003 — minimumstykkelser kommenteret som foreløbige | De aktive 200/200/200/250/275/300 mm bevares efter B-008. | `src/engine/lagfordeling.ts`/`src/engine/defaults.json`; `tests/engine-reference.test.ts`, `tests/engine-boundaries.test.ts` og `tests/browser/settings.spec.ts`. Eventuel faglig revision er en særskilt beslutning. |
| FUND-004 — diagram gemmes undervejs, hjælpetekst omtaler Færdig | Den løbende anvendelse/gemning videreføres. B-017 godkender direkte redigering uden Redigér/Gem; den gamle Færdig-arbejdsgang genskabes derfor ikke. | `src/engine/auto-edit.ts`/`src/ui/DataTables.tsx`; `tests/auto-edit.test.ts` og `tests/browser/tables.spec.ts` kontrollerer aktiv tabel/figur/lagring. Fundet er ikke registreret som særskilt faglig fejlrettelse. |
| FUND-005 — oplyste forudsætninger er fast skabelontekst | Original standardtekst med T6, Cv > 100 kPa og Genbrugsstabil bevares som redigerbar tekst, også når beregningsgrundlaget er et andet. B-046/B-052 ændrer formatering/fravalg, ikke automatisk udfyldning. | `src/report/report-data.ts`; `tests/report-data.test.ts` sammenligner rå kontekst, `tests/text-format.test.ts` rekonstruerer standardtekster. A-006 afventer svar; automatisk forudfyldning er ikke godkendt. |

## 4. Automatiske kontroller

Kørt 01.10.2026 på integrationsgrenen med Node `v26.4.0`:

| Kontrol | Resultat |
| --- | --- |
| `npm run typecheck` | Bestået: begge TypeScript-konfigurationer. |
| `npm test` | **2.998 enhedstests/Node-tests**, 2.998 bestået, 0 fejl, 0 oversprunget, 0 annulleret, 0 todo. |
| `npm run format:check` | Bestået for de konfigurerede kode-/CSS-filer; Markdown indgår ikke i Prettier-scriptet. |
| `npm run build` | Bestået. |
| Playwright (Chromium, Desktop Chrome) | **54 browserforløb**, alle bestået. |
| `node tools/build-r6-pdfs.ts` | Alle 31 PDF'er byte-identiske med det godkendte R6-sæt. |

På Windows blev kommandoerne kørt med `npm.cmd`, da PowerShell blokerer `npm.ps1`. Node-testene omfatter både løkker over referencecases og særskilte adfærdstests; et testtal alene dokumenterer ikke fuld UI-/PDF-dækning.

Der findes **54 browserforløb i 19 filer**, kørt af Claude og alle bestået. Numrene i hver celle følger testenes rækkefølge i filen og beskriver hvert selvstændigt `test(...)`. Den nuværende Playwright-konfiguration bruger Desktop Chrome og 1440 × 1050 px; konkrete tests skifter bl.a. til 390 × 844 og 600 × 900 px. Chrome er aftalt som browser (B-060); andre browsere testes ikke nu.

| Fil i `tests/browser/` | Antal | Forløb og kontroller |
| --- | --- | --- |
| `accessibility.spec.ts` | 3 | 1–2) Axe (WCAG 2.1 A/AA) på alle otte sider med udfoldede afsnit og åbne detaljer ved 1440 og 390 px. 3) Brugerdefineret/trafikklasse, korrelationspopup, produktvælger, firmaprofil, medarbejder-Popover og kartotek. |
| `company-profile.spec.ts` | 3 | 1) Medarbejder-Popover, validering, Sheet, opret/ret/slet med bekræftelse, kopier til rapport, telefon/revisionsspærring, genåbning, mobil og profilrundtur. 2) Live profilrevision, PNG-logo i PDF, ugyldige feltværdier, genåbning, eksport/import, afsnitsflytning, bekræftet nulstilling og mobil. 3) Faktisk IndexedDB-fejl bevarer sidst konsistente profil/logo efter genåbning. |
| `construction.spec.ts` | 1 | Originale søjler/ugyldigt snit, fælles skala, netplacering ved laggrænse/dæklag, intervalmarkeringer, cm, figurfravalg, genåbning og mobil rulning inden for figuren. |
| `dimensioning-page.spec.ts` | 1 | M9 Standard/belastningsklasse og Brugerdefineret/trafikklasse: tekster/tabeller/nøgletal, tyndest-mærke, rækkefølge, produktliste, cm, mobil og afvist driftspunkt. |
| `dimensioning.spec.ts` | 3 | 1) Standardreference, intervalprodukt, B-023-navigation/genåbning, trafikafvisning og Cv. 2) Originale brugerlag, ugyldigt lagantal, manuelt materiale/phi, afrundingsændring, mobil og afgrænset nulstilling. 3) Vandrette klassevalg, layoutstabile diagram-/Cv-popupper, produktkolonner/-celler, sortering og mobilpopup. |
| `geonet-database.spec.ts` | 1 | Navigation, 20 produkter/25 kolonner, søgning/tom søgning, stigende/faldende sortering, titelhjælp, fast produktkolonne og fem noter. |
| `help.spec.ts` | 1 | Kapitler/formler/figurer, flere åbne kapitler og gemte åbne/lukkede valg, begrebshjælp, Gå til-korrelation og mobilkolonner. |
| `kobling.spec.ts` | 1 | M1 lukket fra start, fire belastnings-/seks trafiktrin, signatur under figurer, hover og piletaster/Escape/Enter, mobiltooltip og fravær ved afvisning. |
| `materials.spec.ts` | 11 | 1) Standarder, direkte lagring, markering/filter og genåbning. 2) Fortryd/Gentag, cellegendan og nulstilling gemmes. 3) Dubletter/inputgrænser bevarer gyldigt lager. 4) Tilføj/slet/gendan række/fortryd. 5) Tomt valgfrit felt huskes. 6) Valgfrit nul normaliseres til originalens tomme visning. 7) Korrupt lager vises uden overskrivning. 8) Gemmefejl bevarer aktiv ændring uden falsk gemmestatus. 9) Konflikt med anden fane kræver genindlæsning. 10) Materialeredigering bevarer øvrige felter/data. 11) Desktop/mobil med intern tabelrulning uden sidefejl. |
| `navigation.spec.ts` | 4 | 1) Originalgrupper/-rækkefølge, alle sider, aktiv markering, versionsfod og temabjælke. 2) Start/ukendt rute, direkte links og browserens tilbage/frem. 3) Sammenklapning til ikoner med tooltip/genåbning. 4) 390 px-skuffe, alle sider, lukning/Escape/fokus og ingen vandret siderulning. |
| `net-details.spec.ts` | 1 | M4 punkt-/intervalprodukt, ugyldigt 2-lagsalternativ, konservativ/optimal værdi og titelhjælp, samt intervalnote før resultater. |
| `personal-diagram.spec.ts` | 1 | M5 hover/piletaster/Escape, markørfravalg/genåbning, hurtige ændringer, signatur og synlige akser på 600 px. |
| `phi-summary.spec.ts` | 1 | M6 originale formler/HTML, manuelt phi, nedrunding/cm, genåbning, 600 px og fravær ved afvist trafikklasse. |
| `product-picker.spec.ts` | 2 | 1) B-054-vælger: 20 produkter/serier/mærker, søgning/filter, tastatur/fokus, nummer 3, uændret valgt produkt/resultat og genåbning. 2) Trafikmærker mod Alle produkter, anbefalingsfarver/filter, filter nulstillet ved genåbning, 390 px uden vandret rulning og brugerdefineret valg. |
| `report.spec.ts` | 8 | 1) B-049 redigerede/fravalgte resultatlinjer i faktisk PDF, telefon, revisionsspærring, genåbning og automatisk nulstilling/besked ved ændret beregning. 2) B-046 tekstværktøjer/markering, afsnitsfravalg/revision, lagring/nulstilling og diagramvalg ved diagrammet. 3) Fire faste kort/felter/figurer ved 1440 og 390 px. 4) Projektfelter, tomme tekster/navne, dato, lagring og tre nulstillinger. 5) Hele beregning→rapport→PDF-download, lokale WASM/skrifter, fonte i PDF, seneste revision og ingen snit-spærring. 6) Afvist beregning giver original info og Gå til Dimensionering. 7) Faktisk WASM-fejl og vellykket nyt forsøg. 8) Faktisk skabelonfejl med dansk fil/linje/kolonne-diagnose og vellykket rettelse. |
| `result-checks.spec.ts` | 2 | 1) M3 status, lukkede/åbne afsnit, FIG-003 anbefaling og udførelseskrav. 2) Afvist OUT-1 har hverken status eller informationsafsnit. |
| `settings.spec.ts` | 3 | 1) Opsummeringer/Gælder følger aktive valg og klassisk Standard. 2) Originale standarder, aktivering/afhængigheder, lagring og genåbning. 3) Minimumsnulstilling, tolerancegrænse og effekt i korrelation/afvigelsestabel efter navigation, mobil. |
| `tables.spec.ts` | 6 | 1) Diagramredigering i faktisk Plotly, diagramvalg/genåbning, tværgående historik og afgrænset nulstilling. 2) Tilføj/dublet/slet/gendan diagramrække/celle. 3) Tomt felt kontra nul efter genåbning og afvist negativt tal. 4) VejDim-redigering mod original matrix, faktisk CSV-download med redigerede værdier, genåbning/nulstilling. 5) Diagramredigering ændrer VejDim-matrix/regneeksempel og kan fortrydes. 6) Alle seks scans/rådiagrammer, desktop og mobil med indeholdt rulning. |
| `traffic-popover.spec.ts` | 1 | M8 kun ved trafikgrundlag; T4/Eu 10-tabel, aktive rækker/celle, temamarkering, randkursiv, præcis note og Escape-fokus. |

Den automatiske tilgængelighedskontrol (axe) fandt ved første kørsel manglende tastaturadgang til vandret rullende tabeller og regnestykker, en rolle på designdiagrammets optegning og for lav kontrast i M1's 1-lagsoverskrift; alle er rettet. Axe dækker ikke alt; skærmlæser, zoom og touch er ikke gennemgået manuelt. Matrixen markerer andre konkrete testhuller; de nye kontroller for bl.a. F-02.7 og F-11.2 afventer kørsel, mens F-06.4 fortsat er åbent (afsnit 6, punkt 9).

Efter lukningen af testhullerne 01.10.2026: `npm test` **3.003 bestået, 0 fejl**, og Playwright **75 browserforløb bestået** (de 54 ovenfor plus 21 i `tests/browser/acceptance-gaps.spec.ts`).

## 5. PDF-kontrol

**B-055 godkender det forelagte R6-sæt på 31 PDF'er/99 sider.** Sættet, filnavne og kontrolmetode står i [RAPPORT_PLAN.md](RAPPORT_PLAN.md); bygningen sker med [tools/build-r6-pdfs.ts](../tools/build-r6-pdfs.ts) og cases i [tools/r6-report-cases.ts](../tools/r6-report-cases.ts).

Sættet omfatter de ti originale rapportcases; specialtegn, formateret tekst og fravalgte afsnit; personer med/uden ekstra bundkolonne; rettede/fravalgte tabelrækker; yderområde; lange projekt-/materiale-/tabeltekster; logo 15/90 mm og kun på første side; minimum-/maksimummargener, 9/13 pt, Liberation Sans, sidetal »Side 1 af 3«, farvede overskrifter, lang sidefod og anden firmafarve.

Kontrollerne er følgende:

- Dynamiske strenge, tabelværdier, synlig formateret tekst og forbudt indhold udtrækkes med `pdftotext -raw -enc UTF-8`. Slogan, kontaktlinje og sidetal kontrolleres på hver side.
- Kun whitespace/linjeombrydning normaliseres, også efter en eksisterende bindestreg. En præcist verificeret sidebaggrundsprefix fjernes i en separat brødtekststrøm for tekst over sideskift; prefixet kontrolleres selv. Ingen ændring af værdier, tegnsætning eller Unicode.
- Figurernes snitvalg, kald og eksportmål kontrolleres i `tests/report-figures.test.ts`. PDF bruger samme SVG-motorer som skærmen, i original målestok op til tilgængelig bredde.
- Layout-delkontrol bruger compilerens query/measure til logo/slogan/titel, plads til sidefod/sidetal, figurbredde og billedankre. Querys 0,01 pt er layoutgeometri, ikke beregningstolerance. Scriptets `layoutStatus: partial` dokumenterer, at dette alene ikke kontrollerer alle færdige tekst-/figurbokse eller intern clipping.
- Hver PDF kræves byte-identisk med SHA-256 i `tools/r6-godkendt.json` (det godkendte B-055-sæt); scriptet fejler ved enhver afvigelse, så en ændring forelægges igen. `*.expected.json`, `*.content-check.json`, `*.layout-check.json` og `manifest.json` gemmer indhold, kontrolresultater, sidetal og SHA-256 lokalt.
- B-055's visuelle godkendelse accepterer de kendte Word-forskelle: Carlito/Liberation Sans frem for Calibri/Helvetica, nye figurudseender og B-026–B-054. Tomme tekster har fortsat overskrifter; `empty-text` har tre sider mod originalens to. Nye layoutændringer kræver ny forelæggelse.

R6 er genbygget 01.10.2026 efter temaet og oprydningen; alle 31 PDF'er er byte-identiske med det forelagte og godkendte sæt. [RAPPORT_PLAN.md](RAPPORT_PLAN.md) indeholder en historisk overdragelse med udestående renderer-/billedkontrol. Den blev fulgt op før forelæggelsen af Claudes kontrol af alle 99 sider med PyMuPDF og sidebilleder (tekst inden for margener, ingen overlap, kun Carlito og Liberation Sans indlejret; ingen fund efter rettelser), dokumenteret lokalt i `.local/output/r6/R6-GENNEMGANG.md`. Brugeren godkendte derefter sættet i B-055.

## 6. Udestående til samlet accept

Handlingerne følger fase 5 i [MIGRATIONSPLAN.md](MIGRATIONSPLAN.md). Enkelte delgodkendelser, herunder B-055/B-059, er ikke en beslutning om offentliggørelse.

1. **Browsere og enheder:** Afklaret i B-060: Chrome. Alle 54 browserforløb kører i Chromium (Desktop Chrome) og består.
2. **Skærmstørrelser:** Testene dækker 1440, 600 og 390 px, herunder ingen vandret siderulning og mobilskuffe. Spørgsmål: er det tilstrækkeligt for intern brug, eller skal andre størrelser (fx bærbar 1366 px eller tablet) kontrolleres?
3. **Tilgængelighed:** Automatisk axe-kontrol (WCAG 2.1 A/AA) indgår og består. Spørgsmål: skal der også laves en manuel gennemgang med skærmlæser, zoom og touch før intern brug, eller først før offentliggørelse?
4. **Lagring og nulstilling:** Dækket af enheds- og browserforløb (første start med B-008-standarder, genåbning, afgrænsede nulstillinger, dato-undtagelsen, localStorage-/IndexedDB-fejl, flere faner, profilens eksport/import). Ingen handling udestår ud over brugerens accept.
5. **Versionsmærkning og tilbagerulning:** Versionsnummeret v0.6 bevares (B-060). Tilbagerulning sker via Git-historikken på `main`.
6. **Adgang og hosting:** Intern brug nu (B-060). Offentliggørelse på hjemmesiden og hvad der da skal fjernes, ændres, låses eller ligge bag login afklares senere.
7. **Merge til main:** Aftalt og udført (B-061). Alt ligger på `main`; integrationsgrenen og de øvrige grene er slettet.
8. **Resterende delafklaringer, spørgsmål til brugeren:**
   - B-040: den røde farve for indtastet opbygning i designdiagrammet (M5) blev forelagt, men ikke særskilt bekræftet. Den har siden indgået i den godkendte dimensioneringsside (B-042) og R6-sættet (B-055).
   - FUND-002: manuel armering findes i motoren, men kan ikke vælges i produktvælgeren, som i originalen.
   - FUND-003: minimumstykkelserne 200/200/200/250/275/300 mm er i originalens kildekode kommenteret som foreløbige.
   - A-006/FUND-005: automatisk udfyldning af rapportens oplyste forudsætninger.
   - A-008/R-004: tastaturbetjening, søgning og indsætning fra Excel i redigerbare tabeller.
9. **Testhuller:** `tests/browser/acceptance-gaps.spec.ts` tilføjer 21 forløb for F-02.1/F-02.2 (slidergrænser og trin), F-02.6/F-02.7 (inputgrænser, validering og lagtype), F-02.10 (alle sorteringskolonner i begge retninger), F-04.3 (vis alle/ni), F-06.6 (afhængigheder, LT-1/LT-2/MIN-1 og resultatændringer), F-11.2 (materialesletning/advarsel/genskabelse), F-11.3 (nulstil alle diagrammer) og B-053 (Hover Card). De fem nye Node-tests i `tests/acceptance-gaps.test.ts` og alle 21 browserforløb består. To migreringsfejl blev fundet og rettet, så appen svarer til originalen:
   - **F-11.2:** advarslen »Materialet '…' findes ikke længere i databasen. Laget er skiftet til manuel indtastning.« manglede, og laget blev ikke gemt som manuelt (`app.py:6540–6575, 6650–6654`).
   - **B-053:** andet klik eller tryk på hjælpeikonet genåbnede forklaringen.

   F-06.4 (oscillation i koblet φ) og matrixens øvrige testhuller er fortsat åbne. Ændringer af originalens virkemåde kræver særskilt godkendelse.
10. **Oprydning og PDF-beviser:** Udført. Udkast og rapportforsøg er fjernet (B-059), og R6-sættet er fastlåst med kontrolsummer (B-055).
