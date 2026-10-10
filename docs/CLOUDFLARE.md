# Midlertidig hosting i Cloudflare

Cloudflare leverer den byggede app som en Worker med statiske filer, uden serverkode og uden login. Adresse: https://msl-dimensionering.msl-dimensionering.workers.dev.

Opsætningen ligger i `hosting/cloudflare/wrangler.jsonc`. Filstier er relative til konfigurationsfilen. `.github/workflows/cloudflare.yml` bygger med `VITE_UDGAVE=delt`, kontrollerer hostingens filgrænse og udruller med fast wrangler-version. Hovedkontrollen kalder den kun fra main efter beståede tests. Uden API-nøgle springes hosting over.

GitHub Secrets indeholder `CLOUDFLARE_API_TOKEN` og `CLOUDFLARE_ACCOUNT_ID`. Nøglen begrænses til den nødvendige konto og Workers-udrulning og må aldrig gemmes i kode, logs eller den byggede app. Forhåndsvisningsadresser er slået fra.

Cloudflare Access er ikke slået til. Firmaprofilen skjules ved bygningen, mens kartoteket gemmes personligt i browseren. `noindex` er en anmodning til søgemaskiner, ikke adgangskontrol. HTTP-overskrifter ligger i `public/_headers`.

PDF-motoren leveres gzip-pakket. Hostingkontrollen afviser filer over 25 MiB; den almindelige appbygning afhænger ikke af denne udbydergrænse. Afkobling og flytning beskrives i [Drift](DRIFT.md).
