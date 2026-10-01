# Delplan: fulde mellemregninger

30.09.2026. **Godkendt i A-011/B-029 med brugerens præciseringer; M2 rettet i B-032.** M5 og aktiv M6 er implementeret. M2's ubrugte tabeller forbliver skjult; de aktive regnelinjer videreføres i M1. Øvrige dele er planlagte. Grundlag: genlæst/rettet `CODEX-OPGAVE.md`, AGENTS.md og beslutningsloggen.

Reference er den isolerede gamle app ved commit `a330cfd6734ac2478be1304a362c69f94e412d25`. Linjer nedenfor henviser til dens `app.py`, medmindre andet er angivet. Beregninger, standardværdier, valg, betingelser og tekster bevares. Opbygningsdesign er godkendt i B-025; det godkender ikke de nye mellemregningsfigurer.

## Foreslået rækkefølge

1. **M5: Personligt designdiagram**, fordi både dimensionering og rapport bruger det, og der allerede findes figurreferencer.
2. **M6:** aktiv φᵥ-opsummering. M2's ubrugte tabeller forbliver skjult efter B-032; aktive regnelinjer følger i M1.
3. **M1 tekst og tal:** alle seks trafiktrin og fire belastningstrin, før figurerne bygges.
4. **M1 figurer:** selvstændig SVG-renderer og konkret visuelt udkast til godkendelse.
5. **M3, M4, M7, M8 og M9:** de resterende forklaringer, produktgrupper, lokale korrelationer, hjælpetekster og statusfremhævelser.

Rapportens datadel kan følge efter M5 parallelt med de resterende mellemregninger som arbejdsrækkefølge; en komplet rapport afsluttes først, når dens nødvendige figurer og data er kontrolleret. M1-figurerne indgår ikke i den gamle rapport og tilføjes ikke til PDF'en uden en særskilt godkendelse.

## Reference og kontrol

Før hver del implementeres, optages dens originale output i en separat checkout af den fastlåste commit. Den gamle arbejdsmappe ændres ikke. Referenceværktøjet får egne input og opsamler tekster, tabeller, kontrolvalg, synlighed, figurdata og SVG fra originalen. Nye forventningsfiler oprettes eksklusivt; værktøjet **afviser en eksisterende målfil**. Eksisterende referencer genbruges og overskrives aldrig af TypeScript-output.

Tal, afrundinger, tekstindhold, tabelrækkefølge, figurpunkter, SVG-struktur og beregnede koordinater sammenlignes præcist, uden numerisk tolerance. En eventuel tolerance skal først forelægges og godkendes. Transportformatet kan afkode HTML-entiteter eller adskille Streamlit-wrappere fra selve indholdet; hver sådan afgrænsning dokumenteres, så betydningsfulde mellemrum, linjeskift og indrykninger ikke forsvinder i kontrollen.

Figurer kontrolleres både på deres originale data/geometri og ved visuel gennemgang. Et godkendt nyt udseende registreres som en konkret layoutafvigelse; det er ikke en generel tilladelse til ændrede punkter eller koordinater. SVG er deterministisk og deles via en selvstændig renderer, hvor det er relevant. Ingen figurer tegnes ved at aflæse afrundede resultatkort.

Vi vælger få cases, som tilsammen dækker følgende tilstande, frem for alle kombinationer:

- Standard og Brugerdefineret; belastningsklasse og trafikklasse; mm og cm.
- Punktprodukt og intervalprodukt; gyldige, ugyldige og delvist gyldige løsninger.
- Direkte tabelpunkt, interpolation mellem Eᵤ-punkter og mellem Eₒ-kurver samt yderområde, inklusive afvisning.
- Uarmeret/1/2 lag, minimumstykkelse, oprunding og lagtillæg.
- Manuelt og beregnet φᵥ, vægtning og søjlemetode samt redigerede aktive tabeller.

FIG-001–004 i `reference/figures.json` er udgangspunkt for M5. Nye cases tilføjes kun for manglende grene. De 17 eksisterende beregningsforløb genbruges, hvor de dækker tilstanden. Alle tilstande nedenfor skal enten have en case eller være dokumenteret som ikke relevante efter originalens betingelser.

## M5 — personligt designdiagram

**Original:** `_tegn_designdiagram` (4584), `_phi_kurver` (4568), `core/diagram.py` / `byg_designdiagram`.

**Tilstande:** begge tilstande og dimensioneringsgrundlag; begge enheder; intervalprodukter; ugyldige kurver og yderområde. Brugerdefineret omfatter oprindelige φ-kurver og valg for indtastet opbygning/endepunkter.

**Leverance:** portér `byg_designdiagram` til samme Plotly-specifikation som originalen. Sammenlign direkte med `reference/figures.json`, inklusive layout, traces, shapes og hover. Vis med den eksisterende plotly.js-pakke, bevar hover og eksportér SVG til PDF. Afprøv den faktiske Plotly-SVG med browserens Typst-compiler. Kurvernes punkter, φ pr. kurve, interpolation, skala, akser, signatur, markører og interval mellem optimal og konservativ løsning følger originalen. Punkter anvender eksakte tykkelser før oprunding. Diagrammets x-akse er fortsat cm også ved mm-visning, som originalen. Ugyldige løsninger får originalens visning, aldrig et opdigtet punkt.

**Kontrol:** de fire eksisterende scenariers personlige Plotly-specifikationer sammenlignes på alle relevante data og valgbetingelser. Supplér trafik/interpolation/yderområde, hvis de ikke er dækket. Registrér originale koordinater og akseomdannelse før portering; et andet renderformat skal bevare disse relationer og dokumentere sin struktur.

**Visuel accept:** forelæg Standard med intervalprodukt og Brugerdefineret med φ-korrektion, markører og yderområde ved siden af originalen. M5 skal godkendes særskilt. Afhænger af eksisterende motor- og produktresultater; er forudsætning for rapportens diagram.

## M6 — φᵥ-opsummering

**Original, rettet efter optagelse:** aktiv `_input_materialelag_med_korrektioner` (6712), `_phi_tabel_data` (6405). `_vis_phi_opsummeringsboks` (6461) kaldes alene fra den ubrugte `_input_materialelag`; den aktiveres ikke.

**Tilstande:** især Brugerdefineret med belastnings-/trafikklasse, mm/cm, manuel/vægtet/søjlebaseret φ, intervalprodukt samt gyldige og ugyldige resultater/yderområde. Standard følger originalens synlighedsregel.

**Leverance og kontrol:** aktiv formelkolonne med vægtning, faktor, procent og afrundingsnote er porteret. Fælles tabeldata er porteret til M1; ekstra tabel aktiveres ikke i M6. Originalens mm-korrektioner findes i M1. Elleve UI-cases og fire helpercases matcher præcist; se [PHI_OPSUMMERING.md](PHI_OPSUMMERING.md).

## M2 — beregningstabeller

**Original:** `_vis_beregnings_breakdown` (5515), `_render_breakdown_tabel` (5402), `_render_breakdown_best_case` (5468).

**Tilstande:** Standard/Brugerdefineret, belastnings-/trafikklasse, mm/cm, intervalprodukter, ugyldige 1/2-lagsløsninger, manglende uarmeret reference og yderområde.

**Rettet omfang, B-032:** `_vis_beregnings_breakdown` har ingen kald i a330cfd og bruger standardafrunding uden aktive fordelings-/minimumsindstillinger. Helper-tabellerne er derfor ikke en manglende aktiv visning og aktiveres ikke. Originalens aktive opslag, korrektioner, lagtillæg, minimum og afrunding porteres i M1 med de samme cases. Kaldfraværet registreres i `reference/phi-summary.json`. Nye tabeller kræver særskilt forslag og godkendelse.

## M1 — alle trin, regnelinjer og avancerede figurer

**Original:** `_render_kobling_sektion` (2969), `_trafik_kobling_tal` (1701), `_eo_aekv_trin_tal` (1726), `_kob_trin1–6` (2263–2845), `_kob_bk_trin1/2` (2861–2946), `_kob_*` (1830–1968). Figurer: `_kob_figur_koersler` (1968), `_kob_figur_diagram` (2089), `_kob_figurramme` (2240).

**Tilstande:** trafikklassens seks trin og belastningsklassens fire trin, i begge tilstande/enheder, med intervalprodukter, ugyldige kombinationer og yderområde. Optag også hjælp, trinvalg og vis/skjul af endepunkter efter originalens betingelser.

**Først tekst/tal:** eksisterende `table-explanation.ts` dækker kun trafiktrin 1–3's tal. Resten porteres, og alle trin kontrolleres sammen: opslag i VejDim, Eᵤ-interpolation, Eₒ-ækvivalent, diagraminterpolation, korrektioner og endelig tykkelse. Sammenlign hvert indsat tal, enhed, afrunding, interval, formel, regnelinje og forklaring med originalens optagne output. M2/M6 genbruges som datagrundlag, uden at PDF eller UI genberegner noget.

**Derefter figurer:** optag de to originale SVG'er og deres figurdata for direkte opslag, interpolation og yderområde. Lav en separat renderer svarende til `construction-svg.ts`. Kontrollér linjer, punkter, stiplede hjælpelinjer, pile, akser, etiketter, signaturer, clipping og SVG-koordinater præcist. Lange regnelinjer og mm/cm skal ikke skjule figurindhold.

**Visuel accept:** forelæg de to figurer med originalen ved siden af, mindst én trafikcase med interpolation og én belastningscase med interval/yderområde. Brugerens konkrete godkendelse registreres før layoutet betragtes som afsluttet. Figurerne forbliver på dimensioneringssiden.

## M3 — advarsler, anbefalinger og udførelseskrav

**Original:** `_render_oversigt_expanders` (4974).

**Tilstande:** begge tilstande/grundlag/enheder; interval, ugyldige løsninger og yderområde; udførelseskrav og placerings-/afstandsanbefalinger efter originalens betingelser.

**Leverance og kontrol:** genskab afsnit, rækkefølge, åbningstilstande og synlighedsregler omkring de eksisterende beskeder. Sammenlign overskrifter, alle betingede tekster, punktopstillinger og værdier med originale renderoptagelser. Afhænger af resultater og opbygningsdata; ingen ændring fra anbefaling til krav eller omvendt.

## M4 — valgt net og referencenoter

**Original:** `_render_valgt_net_detaljer` (3657), `_optimal_*` (3493–3616), `_lagtillaeg_tekst` (3616), `_eksakt_*` (3280–3310), `_korrektion_interval_note` (3229).

**Tilstande:** begge tilstande/grundlag/enheder; faste og intervalprodukter; optimal/konservativ placering, gyldige/ugyldige løsninger og yderområde.

**Leverance og kontrol:** afslut netdetaljer, optimale niveauer, lagtillæg og rå/eksakte referencenoter. Sammenlign originale notetekster, intervaller, koefficienter, niveauer og afrundinger. Genbrug allerede porteret optimalplaceringsdata frem for en ny formel. Afhænger af M2/M6 og opbygningsmodellen; eksisterende produktvalg bevares efter B-023.

## M7 — komplette produktgrupper

**Original:** `_resultat_til_gruppe` (3310), `_reference_resultat_til_gruppe` (3361), `_beregn_referencegrupper` (3411), `_krav_for_gruppe` (4228).

**Tilstande:** begge tilstande/grundlag/enheder; intervalprodukter, ugyldige kombinationer/yderområde, anbefalede klasser, referencegrupper og bedste løsninger.

**Leverance og kontrol:** komplette tabeller med originalens gruppering, sortering, kolonner, betingede celler og krav. Sammenlign originalens gruppedata og gengivne tabeller, inklusive tomme/ugyldige værdier og noteforklaringer. De porterede produktfunktioner genbruges. Afhænger af M2/M4; ingen ny produktanbefaling eller sortering.

## M8 — lokal trafikklasse-korrelation

**Original:** `input_trafikklasse` (1550), som ved kompakt visning åbner `_vis_korrelationstabel` i en popover. Desuden `_trafik_kobling_tal` (1701) og `_eo_aekv_trin_tal` (1726). Dette er den lokale visning, ikke hele siden `render_trafikklasse_korrelation` (8319).

**Tilstande:** trafikklasse i begge tilstande/enheder; direkte opslag og Eᵤ-interpolation; ugyldighed/yderområde efter originalens regler. Produktintervaller må ikke ændre selve trafik-korrelationen. Belastningsklassens synlighedsregel bevares.

**Leverance og kontrol:** vis korrelationen lokalt på dimensioneringssiden med originalens indhold og valg; den nuværende henvisning til VejDim er ikke fuld migrering. Sammenlign tabeller, markeringer, hjælpetekst, tal og visningsbetingelser. Genbrug `CorrelationExample`/fælles data, hvor de matcher. Afhænger af M1's kontrollerede trafikdata.

**M8-status (01.10.2026):** lokal popup implementeret med motorbaseret visningsmodel, eksisterende korrelationspivot og `InfoPopup`. Hele popup-undertræet (tekst, noter, kolonner, indeks, rækker, kolonnekonfiguration og lukket starttilstand) sammenlignes præcist i TR-1, TR-1-SG, TR-2 og OUT-1/2; de øvrige ni tilfælde kontrollerer fravær ved belastningsklasse. Produktvalg ændrer ikke korrelationen. Referencens dataframe-reduktion gemmer ikke pandas Styler: række-/cellemarkering og dæmpning af * / † gengives fra originalkoden og kontrolleres særskilt; de er derfor udækket af den optagne reference. Browsertest: `tests/browser/traffic-popover.spec.ts`, port 5193. Visuel godkendelse afventer fortsat.

**Kontroller:** typecheck, alle 2.840 tests, format, format:check og build bestået. Playwright forsøgt med `PW_PORT=5193`; sandkassen afviser Chromium-opstart med `browserType.launch: spawn EPERM`, så browserkontrol og screenshot udestår.

## M9 — resterende hjælp, status og fremhævelser

**Original:** de aktive Standard/Brugerdefineret-forløb (`app.py:6057`, `app.py:6521`, `app.py:6852`) og deres UI-hjælpere. `DIMENSIONERINGSUDKAST.md` er restancelisten; konkrete kald/synlighedsregler registreres i isoleret original før portering.

**Tilstande:** begge tilstande og grundlag, mm/cm, intervalprodukt, ugyldig kombination, yderområde og rå/eksakte visningsindstillinger. M4 beholder net-/referencenoter; M9 dækker øvrige resterende hjælpetekster, statusoplysninger og resultatfremhævelser, så intet falder mellem delene. Sammenlign tekster, værdier, fremhævelsesbetingelser, rækkefølge og synlighed. Afhænger af M1–M8 og afslutter dimensioneringssidens restancer; navigation/hjælpekapitler uden for siden er separate opgaver.

## Konkrete cases pr. del

De fælles inputprofiler er syntetiske og bruger indbyggede standarddata. FIG-001 er Standard/Eᵤ10/BK4/TX160 (ugyldig 2-lagskombination); FIG-002 Standard/Eᵤ5/BK4/NX850; FIG-003 Brugerdefineret/Eᵤ5/BK4/NX850 med standardmaterialelag; FIG-004 er FIG-003 i cm. TR-1 er Standard/Eᵤ10/T4/TX160; TR-2 Brugerdefineret/Eᵤ7/T4/NX850 i cm. OUT-1 er Standard/Eᵤ10/T1 med standardafvisning; OUT-2 gentager med originalens VejDim-yderregel og skalering. PH-1 er Brugerdefineret/Eᵤ5/BK4/NX850 med manuel φ40; PH-2 samme sag med søjlemetode. REF-EMPTY er originalens tomme aktive tabel. Nye forventninger optages før den berørte del og får egne, ikke-overskrivbare filer.

| Del          | Cases/input                                                                       | Præcis kontrol                                                                                                                    |
| ------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| M5           | FIG-001–004; TR-1/TR-2; OUT-2; PH-1/PH-2; REF-EMPTY                               | Hele Plotly-specifikationen; direkte opslag/interpolation, intervalbånd, ugyldige punkter, skala, φ pr. kurve, hover; SVG i Typst |
| M6           | FIG-001/003/004; TR-2; PH-1/PH-2; OUT-1/2                                         | Synlighed, alle lag/vægte, φ-formel, korrektion og mm-ækvivalent                                                                  |
| M2           | FIG-001–004; TR-1/2; OUT-1/2; FIG-003 med oprunding 1 mm og minimum slået fra     | Uarm/1/2 lag, bedste løsning, alle mellemresultater, minimum og oprunding                                                         |
| M1 tekst/tal | FIG-001/002/004; TR-1/2; OUT-1/2; PH-2                                            | Fire/seks trin, eksakte regnelinjer, enheder, valg og hjælp                                                                       |
| M1 SVG       | TR-1 (direkte punkt), TR-2 (interpolation), FIG-002 (interval), OUT-2 (randkurve) | Begge SVG-strukturer, alle punkter/linjer/pile/etiketter og koordinater                                                           |
| M3           | FIG-001/003/004; TR-2; OUT-1/2; FIG-003 med øverste net i dæklag                  | Afsnit, advarsler/anbefalinger, udførelseskrav, betingelser og enheder                                                            |
| M4           | FIG-001–004; TR-2; PH-2; OUT-2; FIG-002 med visning af præcise værdier            | Optimal/konservativ note, netniveauer, lagtillæg, rå/eksakt reference                                                             |
| M7           | FIG-001–004; TR-1/2; OUT-1/2                                                      | Samtlige grupper, sortering, celler, krav og ugyldige værdier                                                                     |
| M8           | TR-1/2; OUT-1/2; TR-1 med ændret SG-værdi i aktiv VejDim-række; FIG-001           | Lokal tabel/markering, interpolation, opdatering, afvisning og skjult BK-visning                                                  |
| M9           | FIG-001–004; TR-1/2; OUT-1/2; FIG-001 med præcise værdier til/fra                 | Resterende hjælpetekster, statusoplysninger og fremhævelser i alle grene                                                          |

## Afslutning og godkendelser

Efter hver del opdateres funktionsmatrixen med dens konkrete cases og resterende begrænsninger. Nye tests fokuserer på ændrede beregningsgrene og brugerforløb (B-021); ingen gentaget fuld browsergennemgang for kosmetik. Eksisterende beregningskontrol bevares.

En del er først afsluttet, når referencekontrol består, synlighed/valg er bevaret, og dens nødvendige visuelle godkendelse er registreret. Opdagede forbedringer eller originalfejl beskrives som særskilte forslag. Der ændres ingen funktionalitet stiltiende. Arbejde sker på `codex/`-grenen uden merge eller offentliggørelse.
