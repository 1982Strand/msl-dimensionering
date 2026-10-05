# Delt udgave i Cloudflare Pages (B-077)

Ved siden af Azure (`docs/AZURE.md`) kan appen deles via Cloudflare Pages bag Cloudflare Access. Kolleger logger ind med deres mailadresse og en engangskode på mail; der bruges ikke Microsoft-login, så firmaets Microsoft 365 skal ikke godkende noget. Den lokale udgave er uændret.

## Sådan virker det

- GitHub-kontrollen (`.github/workflows/engine.yml`) udruller til Cloudflare, når main opdateres, og alle tests består. Uden API-nøgle springes udrulningen over. Azure og Cloudflare udrulles uafhængigt af hinanden.
- Cloudflare Access står foran hele appen, også de midlertidige adresser for hver udrulning (`*.msl-dimensionering.pages.dev`).
- Admin (B-076) bestemmes af mailadressen: GitHub-variablen `ADMIN_EMAILS` (adresser adskilt af komma) lægges ud som `adgang.json` bag login. Andre brugere ser firmaprofilen låst; medarbejderkartoteket kan altid redigeres.
- `public/_headers` sætter de samme sikkerhedsoverskrifter som i Azure.
- Cloudflare tillader højst 25 MiB pr. fil. PDF-motoren leveres derfor gzip-pakket (10,34 MiB) og pakkes ud i browseren (B-078, `docs/PDF_MOTOR.md`). `npm run build` fejler, hvis en fil i `dist` er over grænsen.

## Opsætning (én gang)

Rækkefølgen sikrer, at appen aldrig er offentlig: Access sættes op, før den første udrulning.

1. **Konto.** Opret en gratis konto på dash.cloudflare.com.
2. **Projekt.** Claude logger ind med `npx wrangler login` (godkendes i browseren) og opretter et tomt Pages-projekt `msl-dimensionering` med produktionsgrenen `main`. Kontoens id gemmes som GitHub-hemmeligheden `CLOUDFLARE_ACCOUNT_ID`.
3. **Zero Trust.** I Cloudflare: _Zero Trust_ → vælg et teamnavn, fx `byggros-msl`, og planen **Free** (op til 50 brugere).
4. **Access-applikation.** _Zero Trust_ → _Access_ → _Applications_ → _Add an application_ → _Self-hosted_:
   - Navn: `MSL Dimensionering`.
   - Domæner (to linjer): `msl-dimensionering.pages.dev` og `*.msl-dimensionering.pages.dev`.
   - Login: _One-time PIN_.
   - Politik: _Allow_, _Include_ → _Emails ending in_ → `@byggros.com`. Enkelte andre adresser kan tilføjes med _Emails_.
5. **API-nøgle til GitHub.** _My Profile_ → _API Tokens_ → _Create Token_ → _Create Custom Token_:
   - Rettigheder: _Account_ → _Cloudflare Pages_ → _Edit_.
   - Konto: din konto.

   Kopiér nøglen, og gem den i GitHub (_Settings_ → _Secrets and variables_ → _Actions_) som `CLOUDFLARE_API_TOKEN`. Nøglen må ikke sendes i chat.

6. **Admin-adresser.** GitHub-variablen `ADMIN_EMAILS` (_Settings_ → _Secrets and variables_ → _Actions_ → _Variables_), fx `navn@byggros.com`.
7. **Første udrulning.** GitHub → _Actions_ → _Beregningsmotor_ → _Run workflow_. Adressen er `https://msl-dimensionering.pages.dev`.

## Tilbage til kun lokal brug eller kun Azure

Slet Pages-projektet og Access-applikationen i Cloudflare, og slet hemmeligheden `CLOUDFLARE_API_TOKEN` i GitHub; derefter springes udrulningen over. Den lokale udgave og Azure påvirkes ikke.
