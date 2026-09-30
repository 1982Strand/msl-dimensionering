# φᵥ-opsummering — M6

30.09.2026. Den aktive brugerdefinerede visning er porteret fra `_input_materialelag_med_korrektioner` (`app.py:6712–6849`, a330cfd): vægtet friktionsvinkel og korrektionsfaktor ved siden af materialelagene. Tal, fortegn, linjeskift og afrundingsnoter bevares. Opsummeringen findes ikke i Standard og skjules ved afvist trafikgrundlag. Manuel φᵥ og indstillingens afrunding bestemmer faktoren; søjlereglen ændrer ikke denne inputopsummering, som i originalen.

`phiTableData` porterer `_phi_tabel_data` til genbrug i M1: rækkefølge, procent-/tykkelsesvægte, bidrag, summer, tomt input og præcis markdown. Den tilføjer ikke en ekstra tabel i M6. Originalens aktive beregningstabel og mm-korrektioner findes i M1.

## Rettelse af kortlægningen — B-032

Planens `_vis_phi_opsummeringsboks` kaldes kun fra den ubrugte `_input_materialelag`. M2's `_vis_beregnings_breakdown` har ingen kald og bruger `beregn()` uden de aktive afrundings-/fordelingsindstillinger. Brugeren har godkendt, at de ubrugte tabeller forbliver skjult. Opslag, mm-korrektioner, lagtillæg, minimum og slutafrunding videreføres i originalens aktive M1-trin, som endnu ikke er porteret.

## Reference og kontrol

`reference/phi-summary.json` er optaget før portering fra isoleret a330cfd med indbyggede værdier. Aktive kode-/HTML-tekster bevares uden normalisering af mellemrum eller linjeskift. Originale funktionskald registreres ved AST-gennemgang. Fire helpercases dækker tomt input, nulvægt og procentvægtning.

| Case | Kontrol |
| --- | --- |
| FIG-001-standard-default | Skjult i Standard |
| FIG-003-custom-interval | To lag, vægtet φᵥ, belastningsklasse |
| FIG-004-custom-cm | Enhedsvalg ændrer ikke φᵥ-formler |
| TR2-custom-traffic | Eᵤ 7, T4, cm |
| PH1-manual40 | Manuel faktor; vægtet regnelinje bevares |
| PH2-column | Inputopsummering ved søjleregel |
| M6-round-down | Nedrunding og original note |
| M6-round-nearest | Manuel 40,5°, nærmeste grad, cm |
| M6-three-layers | Tre lag, summer og rækkefølge |
| OUT1-rejected | T1/Eᵤ 10, skjult ved afvisning |
| OUT2-vejdim | Samme punkt med VejDim-regel, synlig |

De 11 UI-cases og fire helpercases matcher præcist uden tolerance. 22 målrettede Node-tests består inklusive de 17 eksisterende dimensioneringspayloads og M5. Ét nyt browserforløb kontrollerer formler, manuel værdi, afrunding, cm, genindlæsning, afvisning og 600 px skærmbredde. Build/typekontrol består. Hele testpakken er ikke genkørt.

Genkør med `tools/capture_phi_reference.py` i originalens Python-miljø. Uden `--record` sammenlignes; med flag afvises en eksisterende målfil før originalen startes. Original og tidligere referencefiler er uændrede.
