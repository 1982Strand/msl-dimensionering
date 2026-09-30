# Materialer — første React-udkast

30. september 2026. Lokalt, fungerende designudkast; ikke en færdig migrering. Designretningen er godkendt i B-020; endeligt firmalogo er åbent.

## Afprøvning

Fra projektmappen:

```powershell
npm ci
npm run build
npm run preview
```

Åbn `http://127.0.0.1:5174/`. Udvikling med automatisk opdatering bruger `npm run dev` på port 5173. De to adresser har hvert sit browserlager. Appen skal senere have en stabil produktionsadresse; testdata fra localhost flyttes ikke automatisk dertil.

React, TypeScript, Vite, Tailwind og shadcn/ui er opsat med låste afhængigheder. Button, Input og Badge er hentet med shadcn CLI 4.21.0 fra den officielle new-york-registry. Konfiguration og komponentkilde ligger i repositoryet. Opsætningen følger [shadcn/Vite-dokumentationen](https://ui.shadcn.com/docs/installation/vite).

## Tilkoblet i browseren

- De to oprindelige materialetabeller og alle fem redigerbare kolonner: navn, friktionsvinkel, maksimal kornstørrelse, maskekrav og bemærkning. Lagtype følger tabellen.
- Oprindelige standardværdier, grænser, trin og hjælpetekster fra `app.py:8584–8700`. Friktionsvinkel kræves og ligger mellem 20 og 60; korn/maskekrav er valgfrie mellem 0 og 500 med de gamle trin 1/5. Tomme felter og 0 normaliseres af den eksisterende motor.
- Direkte celleændring på afsluttet indtastning, automatisk localStorage-lagring og genindlæsning. Der er ingen Redigér-/Gem-knap. En ufærdig celle bliver ikke et gyldigt aktivt grundlag.
- R-002: visning af standardværdien ved ændrede felter, markering og filteret Vis kun ændringer.
- R-003: Fortryd/Gentag, gendannelse af celle/række, nulstilling og gendannelse af manglende standardrække.
- Tilføjelse/sletning. En ny række bliver aktiv, når navn og friktionsvinkel er udfyldt gyldigt. Materialeduplikater og tom materialeliste afvises af den bevarede datalogik.
- Oprindelig advarsel ved ændret friktionsvinkel. Gemmestatus skelner mellem gemt og skrivefejl. Ulæselige gemte data overskrives ikke.
- Hvis en anden fane ændrer lageret, sættes redigering på pause, og brugeren kan genindlæse. Dette er udkastets beskyttelse mod at overskrive den anden fanes arbejde; der er ingen automatisk sammenfletning.

Ændrede/slettede materialer er ikke tilkoblet lagvalg i Brugerdefineret endnu. Produktvalg, navigation og materialernes rækkefølge i kommende valgfelter skal derfor kontrolleres i det samlede forløb, inklusive FUND-001 og håndtering af manglende materialer. Tabellen alene afslutter ikke F-11.

## Design til gennemgang

Udkast: mørkegrøn topbjælke, lys baggrund, to materialetabeller, gul markering af ændrede felter og små gendan-/slettehandlinger ved rækkerne. MSL-navn og lagikon er foreløbig grafisk opsætning. Der er ikke valgt endeligt firmalogo.

Desktop og mobilvisning er visuelt inspiceret. På små skærme rulles tabellen vandret inden for kortet; resten af siden beholder skærmbredden. Skærmbilleder er lokale under `output/materialer-desktop.png`, `output/materialer-mobile.png` og `output/materialer-aendret.png`. Sidstnævnte viser en isoleret testændring af SGI-friktionsvinklen fra 40 til 42; indbyggede standarder er ikke ændret.

Brugeren har godkendt at arbejde videre med retningen i B-020. Design af opbygningsfigurer er fortsat en separat opgave.

## Kontrol

- 2.614 eksisterende motor-/datatests består uden ændrede referenceforventninger.
- 11 nye Playwright-forløb består i Chromium mod den byggede app: standarder/autosave/genåbning, fortryd/gentag/gendan/nulstil, dubletter/grænser, tilføj/slet, tomt felt, normaliseret nul, korrupt lager, skrivefejl, to faner, bevarelse af andre sektioner og responsiv visning uden JavaScript-fejl.
- Streng typekontrol, formateringskontrol og produktionsbygning består. GitHub-kontrollen bygger appen og kører både datatests og browserprøver på Windows/Linux.
- Browserprøver bruger isolerede profiler og syntetiske ændringer. Ingen kundedata, lokal gammel JSON eller rapportmetadata uploades.

Dette er ikke en fuld browserparitetstest mod alle Streamlit-widgetforløb. Edge/Firefox/Safari, tilgængelighedsgennemgang, hele navigationen og øvrige sider udestår. Søgefunktion, Excel-indsætning og anden R-004-funktionalitet er ikke tilføjet; almindelig feltbetjening med Tab/Enter afslutter en celle.
