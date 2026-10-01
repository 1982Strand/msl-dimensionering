# React-indstillinger

Indstillinger er tilkoblet den eksisterende TypeScript-motor på `/#indstillinger`. Otte originale afsnit, 26 valg/felter og minimumstykkelser for seks belastningsklasser er bevaret fra referencecommit `a330cfd`.

Gyldige ændringer anvendes straks og gemmes i samme browser/computer. Tal gemmes, når feltet forlades eller Enter trykkes; Escape gendanner den aktive værdi. Oprindelige grænser, valgmuligheder, afhængige felter og indbyggede standardværdier er bevaret. Nulstilling af minimumstabellen berører alene dens seks værdier.

Siden viser originalens otte dynamiske afsnitsopsummeringer, ti »Gælder«-markeringer, oprundingseksempel, minimumsadvarsel, klassisk-standardbesked, stabilgruseksempel og afvigelsesoversigt. Markeringer, hjælpetekster og omfangstekster står ved deres oprindelige afsnit, valg og kolonner. Opsummeringer og markeringer genberegnes straks fra aktive indstillinger. Afvigelsestabellen og de fire omfangstekster genberegnes fra aktive diagrammer, VejDim-kørsler og tolerancer. Ændrede tolerancer bruges også på trafikklasse-korrelationssiden.

## Kortlægning af hele referencetræet — 01.10.2026

`reference/settings-page-cases.json` indeholder 75 elementer i IND-STD, IND-BD og IND-AENDRET og 76 i IND-KLASSISK. Tabellen dækker alle elementer; stierne gælder IND-STD, mens klassisk-beskeden forskyder efterfølgende elementer i afsnit 6 én plads. Anonyme containere og kolonner er struktur, ikke yderligere tekst. »Før« beskriver siden før denne hjælpeopgave.

| Elementer/stier | Før | Nu |
| --- | --- | --- |
| `/0/0/0/0`: globalt logo, navn og v0.6 | Appens fælles topbjælke har MSL/Dimensionering og »Under udvikling«; originalens logo/version er ikke gengivet identisk | Uændret; samlet navigation/branding ligger uden for hjælpeopgaven |
| `/0/0/1/0/0`: global »Nulstil« (`bg_nulstil`) | Mangler på indstillingssiden | Fortsat manglende global funktion; særskilt integrationspunkt |
| `/1`: sidetitel og indledning | Korrekte tekster | Bevaret |
| `/2–9/0`: otte nummererede afsnitsoverskrifter | Nummer og titel fandtes; alle opsummeringer manglede | Nummer, titel og dynamisk opsummering i `bg-trin-hoved` |
| `/2–9/1`: otte afsnitsindledninger | Korrekte tekster | Bevaret |
| Afsnit 1: `ind_afr_trin`, `ind_afr_reduktion`, `ind_afr_vis_eksakt`, `ind_afr_phi` | Alle fire felter korrekte | Bevaret i originalens rækkefølge |
| Afsnit 2: `ind_opb_enhed`, `ind_opb_paaskrift`, `ind_opb_maal_streg`, `ind_opb_maal_tal`, `ind_opb_signatur` | Alle fem felter korrekte | Bevaret |
| Afsnit 3: `ind_lf_fordeling`, `ind_lf_samlet` | Begge felter korrekte | Bevaret |
| Afsnit 4: `ind_lf_restlag`, `ind_lf_restlag_graense`, `ind_lf_vd_baerelag`, `ind_lf_vd_bundsikring`, `ind_lf_kraev_bundsikring` | Alle fem felter og afhængigheder korrekte | Bevaret |
| Afsnit 5: `ind_lf_phi_regel` | Korrekt | Bevaret |
| Afsnit 6: `ind_std_klassisk`, `ind_std_opdeling`, `ind_std_under_minimum` | Alle tre felter og afhængigheder korrekte | Bevaret |
| Afsnit 7: `ind_lf_netplacering` | Korrekt | Bevaret |
| Afsnit 8: `ind_yder_tol_over`, `ind_yder_over_uden`, `ind_yder_tol_under`, `ind_yder_under_inden`, `ind_yder_under_uden` | Alle fem felter korrekte | Bevaret i over-/underkolonner |
| `/2/2`, `/3/2`, `/4/3`, `/4/5`, `/4/6/1/1`, `/5/3`, `/6/3`, `/7/2`, `/8/3`, `/9/2`: ti »Gælder«-markeringer | Manglede | Tilføjet med originale forudsætninger og klassisk-undtagelser ved de tilhørende afsnit/valg/tabel |
| `/2/6`: dynamisk oprundingseksempel | Korrekt | Bevaret |
| `/4/6/0/0–1`: minimumstabel og afgrænset nulstilling | Korrekte seks værdier, felter, grænser og nulstilling | Bevaret |
| `/4/6/1/0,2,3`: tre noter om trafikklasse, minimum og lagforhold | Tekster korrekte, stod før felterne | Flyttet til minimumstabellens notekolonne i oprindelig rækkefølge |
| `/4/7`: dynamisk minimumsadvarsel | Korrekt | Bevaret efter tabel og noter |
| `/5/6`, `/6/4`, `/7/6`, `/8/4`: lagtypenote, φᵥ-note, Standard-forudsætning, geoneteksempel | Tekster korrekte, stod før felterne | Flyttet efter deres valg og markeringer |
| `/7/7`: »Eksempel« med markdown, sammenligningstabel og afsluttende tekst | Korrekt indhold | Bevaret som lukket udfoldning |
| Klassisk afsnit 6 `/7/4`: besked om klassisk Standard | Korrekt tekst; stod efter alle felter | Flyttet straks efter klassisk-valget |
| `/9/3`: »Gælder dimensionering efter trafikklasse.« | Manglede | Tilføjet under afsnittets »Gælder« |
| `/9/4/0/1,3`, `/9/4/1/2,4`: fire dynamiske omfangstekster | Korrekte værdier; stod samlet efter felterne | Flyttet under de fire tilhørende valg i originalens kolonner |
| `/9/5`: note om nul tolerancer og VejDim | Korrekt tekst; stod før felterne | Flyttet efter over-/underkolonnerne |
| `/9/6`: »Målte afvigelser i korrelationen«, forklaring og tabel | Korrekte tekster og værdier | Bevaret som lukket udfoldning |

Det giver 26 almindelige widgets, ét lokalt nulstillingsvalg, to tabeller, otte indledninger, ét markdown-eksempel, 25 captions, otte afsnitshoveder, én minimumsadvarsel, ét sidehoved og to globale elementer; klassisk-casen har desuden én besked. De to expandere, 11 kolonner og 15 containere er kortlagt som struktur. Sideindholdet er dækket; de to globale elementer ovenfor er udtrykkeligt ikke afsluttet af denne opgave.

Originalfund: Ved klassisk Standard siger afsnit 8's markering »gælder ikke Standard …«, mens klassisk-beskeden siger, at afsnit 8 gælder begge tilstande. Begge tekster og originalens `_gaelder`-regel er bevaret; der er ikke foretaget en faglig rettelse. `Gælder: ingen tilstand` er bevaret i helperen og testet særskilt, da ingen af de fire sidereferencer udløser den gren.

## Kontrol

- Optagelse af den gamle app: 26 widgets og seks scenarier med felt-afhængigheder, omfangstekster og afvigelsestabel. Fastlåste referencefiler sammenlignes; overskrivning nægtes.
- Én målrettet sammenligning dækker afvigelsestabel og omfangstekster for alle seks originale scenarier. `tests/settings-page.test.ts` sammenligner alle otte opsummeringer, ti markeringer og øvrige afsnitstekster præcist i IND-STD, IND-BD, IND-AENDRET og IND-KLASSISK. Feltankre, rækkefølge, kolonnegrænser og expandere sammenlignes også; ingen tolerance eller ændring af referencer.
- Browserkontrollen er udvidet med standardopsummeringer og alle markeringer, straksændring ved oprundingstrin og til-/fravalg af klassisk Standard, inklusive markeringens placering efter fordelingsvalget. De to eksisterende forløb dækker standardværdier, felt-afhængigheder, genåbning, minimumsadvarsel, eksempel, afgrænset nulstilling, ugyldige tolerancer og ændret faktisk korrelation.
- Kontrol i hjælpeworktree `codex/ind-side` 01.10.2026: typekontrol, alle 2.955 Node-tests, `npm run format`, `format:check`, produktionsbygning og `git diff --check` består. Bygningen giver den eksisterende advarsel om store chunks.
- `PW_PORT=5199 npx playwright test tests/browser/settings.spec.ts` er forsøgt. Alle tre forløb stoppes før første sidehandling med `browserType.launch: spawn EPERM`, fordi sandkassen afviser Chromium-start. Browser- og visuel kontrol skal genkøres uden denne begrænsning; der er ikke ændret browseropsætning eller installeret pakker.

## Resterende arbejde

Originalens korte dynamiske afsnitsopsummeringer og alle »Gælder«-markeringer er flyttet og kontrolleret mod fire sidereferencer. Global »Nulstil«, fælles branding og særskilt visuel accept ligger fortsat hos integrationsarbejdet. Visualiseringsvalgene styrer opbygningsfigurerne i React, jf. `OPBYGNINGSFIGURER.md`. Rapporttilkobling og samlet skærm-/rapportkontrol hører til rapportarbejdet. Denne leverance afslutter derfor ikke hele indstillingsfunktionens accept.

Næste større trin er dimensioneringsformularer og produktvalg. Beregningerne findes allerede i TypeScript; formularernes afhængigheder, beskeder og opbygningsvisualisering skal bevares og kontrolleres separat.
