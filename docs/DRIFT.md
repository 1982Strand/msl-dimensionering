# Drift og flytning

Appen er statisk. `npm run build` danner `dist`, som kan leveres af en almindelig statisk webserver. Beregninger, PDF-kompilering og brugerdata kræver ingen hostingserverkode.

Uden `VITE_UDGAVE` er firmaprofilen redigerbar. Med `VITE_UDGAVE=delt` skjules den, og rapporterne bruger standardprofilen. Denne indstilling er uafhængig af hostingudbyderen. Den delte udgave har åben adgang og personlige browserdata.

Serveren skal levere alle filer i `dist`, herunder billeder, skrifttyper og PDF-motorens `.wasm.gz`. Browseren pakker selv motoren ud; filen skal leveres som gzip og ikke som en HTML-fejlside. Hash-navigation kræver ingen serverruter til de enkelte sider.

## Afkobling af Cloudflare

1. Eksportér de brugerdata, der skal flyttes, og kontrollér at nødvendige rapporter og sager er bevaret.
2. Byg og kontrollér appen lokalt eller hos den nye udbyder. Brug fortsat `VITE_UDGAVE=delt` til den delte visning.
3. Fjern `cloudflare`-jobbet fra `engine.yml`, den separate `cloudflare.yml` og `hosting/cloudflare/`.
4. Fjern de to Cloudflare-hemmeligheder fra GitHub og luk hostingressourcen, når den ikke længere bruges.

Appkode, beregningstests og lokal startfil ændres ikke ved afkoblingen. Sikkerhedsoverskrifter skal sættes hos den nye udbyder: `nosniff`, blokering af indlejring, passende referrer-policy og den eksisterende anmodning om ikke at blive indekseret.

En ny webadresse har et nyt browserlager. Gemte værdier flyttes ikke automatisk. Gennemfør dataflytningen før den gamle adresse lukkes.
