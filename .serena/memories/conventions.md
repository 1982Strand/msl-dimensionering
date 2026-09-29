# Kode og kontrol
- Faglige feltnavne bevares fra Python (eu, eo, phi, t_armeret_mm osv.) for sporbarhed. Danish docs/user text; TypeScript strict med eksplicitte typer, ingen any-baseret fagmodel.
- Funktionsinput må ikke muteres. Motoren tager diagramtabeller/indstillinger som data; ingen diskadgang, UI-import eller genberegning i rapportmotoren.
- Python round og fast decimalformatering bruger ties-to-even på binærværdien. Brug src/engine/python-numbers.ts; Math.round/Number.toFixed er ikke erstatninger. Rund_op har originalens 1e-6-algoritmetolerance; dette er ikke en godkendt migreringstolerance.
- mm er beregningsenhed. cm er visning; materialekorn/masker forbliver mm.
- JSON-talnøgler til tabeller behandles numerisk ved sortering; tom tabel og manglende tabel kan have forskellig originaladfærd.
- Eksisterende fejl/advarselstekster og gamle særtilfælde bevares. Nye fund til docs/FUND.md og brugerbeslutning før rettelse.
- Prettier på src/engine og tests; npm run format. Semble finder implementation; Serena bruges til symbolsøgning og referencer efter lokalisering.