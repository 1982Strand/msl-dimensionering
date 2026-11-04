# Midlertidig hosting i Cloudflare

Cloudflare leverer to statiske udgaver uden serverkode:

- Intern: https://msl-intern.byggros.workers.dev (Worker `msl-intern`).
- Offentlig: https://msl.byggros.workers.dev (Worker `msl`).

Adressen er `<Worker-navn>.<kontoens underdomæne>.workers.dev`. Ændres et Worker-navn eller kontoens underdomæne i Cloudflare, skal navnene i de to wrangler-filer ændres tilsvarende. Ellers opretter udrulningen en ny Worker.

Opsætningen ligger i `hosting/cloudflare/wrangler.jsonc` og `wrangler-offentlig.jsonc`. Filstier er relative til konfigurationsfilerne. `.github/workflows/cloudflare.yml` bygger begge udgaver, kontrollerer hostingens filgrænse og udruller med fast wrangler-version. Hovedkontrollen kalder den kun fra main efter beståede tests. Uden API-nøgle springes hosting over.

GitHub Secrets indeholder `CLOUDFLARE_API_TOKEN` og `CLOUDFLARE_ACCOUNT_ID`. Nøglen begrænses til den nødvendige konto og Workers-udrulning og må aldrig gemmes i kode, logs eller den byggede app. Forhåndsvisningsadresser er slået fra.

Ingen af adresserne har login, og appen har ingen loginendepunkter. Medarbejderkartoteket er bygget ind i den interne udgaves filer, så navne, mails og telefonnumre kan læses af alle, der har eller gætter adressen. Brugeren har valgt dette, se beslutningen af 4. november 2026 i [Beslutninger](BESLUTNINGER.md). Kartoteket fjernes ved at slette hemmeligheden `MEDARBEJDERE_JSON` og udrulle igen.

Kartoteket sendes til GitHub som hemmeligheden `MEDARBEJDERE_JSON` med `npm run kartotek -- <fil>`. Filen kan være en eksporteret firmaprofil eller en ren medarbejderliste. Hemmeligheden bruges kun i trinnet, der bygger den interne udgave, og kommer med ved næste udrulning.

`noindex` er en anmodning til søgemaskiner, ikke adgangskontrol. HTTP-overskrifter ligger i `public/_headers`.

PDF-motoren leveres gzip-pakket. Hostingkontrollen afviser filer over 25 MiB; den almindelige appbygning afhænger ikke af denne udbydergrænse. Afkobling og flytning beskrives i [Drift](DRIFT.md).
