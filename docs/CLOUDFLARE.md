# Midlertidig hosting i Cloudflare

Cloudflare leverer to statiske udgaver uden serverkode:

- Intern: https://msl-dimensionering.msl-dimensionering.workers.dev. Den eksisterende adresse bevares.
- Offentlig: https://msl-dimensionering-offentlig.msl-dimensionering.workers.dev.

Opsætningen ligger i `hosting/cloudflare/wrangler.jsonc` og `wrangler-offentlig.jsonc`. Filstier er relative til konfigurationsfilerne. `.github/workflows/cloudflare.yml` bygger begge udgaver, kontrollerer hostingens filgrænse og udruller med fast wrangler-version. Hovedkontrollen kalder den kun fra main efter beståede tests. Uden API-nøgle springes hosting over.

GitHub Secrets indeholder `CLOUDFLARE_API_TOKEN` og `CLOUDFLARE_ACCOUNT_ID`. Nøglen begrænses til den nødvendige konto og Workers-udrulning og må aldrig gemmes i kode, logs eller den byggede app. Forhåndsvisningsadresser er slået fra.

Den interne adresse skal beskyttes med Cloudflare Access, som oprettes i Cloudflare-kontoen. Tillad engangskode-login til mails, der ender på `@byggros.com`. Appen har ingen loginendepunkter. Udrulningen henter den interne adresse med manuelle viderestillinger og bygger kun medarbejderkartoteket ind, hvis den får en 302/303 til et `*.cloudflareaccess.com`-værtsnavn. Uden Access bygges intern udgave uden kartotek og med en advarsel.

Kartoteket sendes til GitHub som hemmeligheden `MEDARBEJDERE_JSON` med `npm run kartotek -- <fil>`. Filen kan være en eksporteret firmaprofil eller en ren medarbejderliste. Hemmeligheden bruges kun i trinnet, der bygger den interne udgave, og kommer med ved næste udrulning.

`noindex` er en anmodning til søgemaskiner, ikke adgangskontrol. HTTP-overskrifter ligger i `public/_headers`.

PDF-motoren leveres gzip-pakket. Hostingkontrollen afviser filer over 25 MiB; den almindelige appbygning afhænger ikke af denne udbydergrænse. Afkobling og flytning beskrives i [Drift](DRIFT.md).
