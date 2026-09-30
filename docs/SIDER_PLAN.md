# Delplan: Geonet-database og Hjælp

30.09.2026. **Godkendt i B-036.** De to sider findes i originalens navigation (`app.py:10720–10731`), men mangler i den nye app og i de øvrige delplaner. Siderne har ingen beregninger. Indhold, rækkefølge og tekster bevares uændret. Udseendet følger den godkendte designretning (B-020); et konkret udkast forelægges før siderne betragtes som afsluttet.

## S1 — Geonet-database

**Original:** `render_geonet_database` (`app.py:7558`, 129 linjer). Siden er et opslag i produktdatabasen: en tabel over produkterne med produktdata og noter pr. produkt. Der er ingen redigering i originalen (F-11.5), og der tilføjes ingen.

**Reference:** Optag originalens tabel (kolonner, rækker, rækkefølge, formatering) og noter fra et isoleret arkiv af `a330cfd`, samme værktøjsmønster som `tools/capture_product_overview_reference.py`. Nye forventningsfiler oprettes eksklusivt.

**Leverance:** React-side `#geonet-database` med samme tabel og noter, data fra motorens eksisterende produktdata. Kontrol: alle celler og noter matcher referencen præcist; ét browserforløb.

## S2 — Hjælp

**Original:** `render_hjaelp` (`app.py:7466`) med `_render_hjaelp_kapitel`, `_render_hjaelp_figur`, `_render_hjaelp_kilder` og `_render_hjaelp_gaatil`. Parseren er `core/hjaelp.py` (247 linjer). Indholdet er otte kapitler i `Dokumenter og data/hjaelp/01–08-*.md` (ca. 66 kB). Kapitlerne har forside, nummererede afsnit og blokkene `:::formel`, `:::figur` (tabeller med figurnummer og -tekst), `:::kilder` og `:::gaatil` (spring til en side i appen).

**Reference:** Kapitelfilerne kopieres uændret fra `a330cfd` med kontrolsum. Parserens resultat (kapitler, afsnit, blokke, nummerering) optages fra originalens `laes_kapitler()` og sammenlignes præcist med TypeScript-parseren.

**Leverance:**

- TypeScript-parser og React-side `#hjaelp`, der viser kapitler, afsnit, formler, figurer, kilder og »gå til«-links.
- »Gå til« åbner den tilsvarende side i den nye app. Hvor siden endnu ikke findes, vises linket ikke i stedet for at føre til en fejl. Det dokumenteres som en midlertidig afgrænsning.

**Kontrol:** parserens output matcher referencen for alle otte kapitler; ét browserforløb for navigation mellem kapitler og »gå til«.

## Rækkefølge og afhængigheder

S1 og S2 er uafhængige af mellemregninger og rapport og kan laves sideløbende af hjælperen. Den samlede navigation (MIGRATIONSPLAN punkt 6) samler til sidst alle otte sider.
