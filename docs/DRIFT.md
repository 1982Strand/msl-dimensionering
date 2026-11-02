# Drift og flytning

Appen er statisk. `npm run build` danner `dist`, som kan leveres af en almindelig statisk webserver. Beregninger, PDF-kompilering og brugerdata kræver ingen hostingserverkode.

Uden `VITE_UDGAVE` bygges den lokale udgave, hvor firmaprofilen og eget kartotek er redigerbare i browseren. `node tools/build-udgave.ts intern` bygger den interne udgave med standardprofilen og indbygget kartotek; listen læses fra `--kartotek <fil>` eller `MEDARBEJDERE_JSON`. `node tools/build-udgave.ts offentlig` bygger den offentlige udgave uden kartotek. Udgaverne beskrives i `src/ui/udgaver.ts`.

Cloudflare leverer den interne udgave på den eksisterende adresse bag Cloudflare Access og den offentlige udgave på sin egen adresse. Se [Cloudflare](CLOUDFLARE.md). Den interne udgave må kun få medarbejderlisten, når Access-kontrollen bekræfter loginbeskyttelse.

En statisk server skal levere filerne i den valgte udgaves mappe (`dist`, `dist-intern` eller `dist-offentlig`), herunder billeder, skrifttyper og PDF-motorens `.wasm.gz`. Browseren pakker selv motoren ud; filen skal leveres som gzip og ikke som en HTML-fejlside. Hash-navigation kræver ingen serverruter til de enkelte sider.

## Afkobling af Cloudflare

1. Eksportér de brugerdata, der skal flyttes, og kontrollér at nødvendige rapporter og sager er bevaret.
2. Byg og kontrollér appen lokalt eller hos den nye udbyder. Brug `node tools/build-udgave.ts intern` og `node tools/build-udgave.ts offentlig` til online-udgaverne.
3. Fjern `cloudflare`-jobbet fra `engine.yml`, den separate `cloudflare.yml` og `hosting/cloudflare/`.
4. Fjern Cloudflare-hemmelighederne og `MEDARBEJDERE_JSON` fra GitHub, og luk hostingressourcerne, når de ikke længere bruges.

Appkode, beregningstests og lokal startfil ændres ikke ved afkoblingen. Sikkerhedsoverskrifter skal sættes hos den nye udbyder: `nosniff`, blokering af indlejring, passende referrer-policy og den eksisterende anmodning om ikke at blive indekseret.

En ny webadresse har et nyt browserlager. Gemte værdier flyttes ikke automatisk. Gennemfør dataflytningen før den gamle adresse lukkes.
