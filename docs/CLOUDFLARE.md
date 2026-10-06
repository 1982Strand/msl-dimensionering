# Delt udgave i Cloudflare (B-077, B-079)

Ved siden af Azure (`docs/AZURE.md`) kan appen deles via Cloudflare bag Cloudflare Access. Kolleger logger ind med deres mailadresse og en engangskode på mail. Der bruges ikke Microsoft-login, så firmaets Microsoft 365 skal ikke godkende noget. Den lokale udgave er uændret.

Adresse: **https://msl-dimensionering.msl-dimensionering.workers.dev**

## Sådan virker det

- Cloudflare Pages er nu en del af Cloudflare Workers (B-079). Appen ligger som en Worker med kun statiske filer, `msl-dimensionering`, uden serverkode. `wrangler.jsonc` er den faste opsætning. Uden den ændrer wrangler selv projektets filer (»autoconfig«).
- GitHub-kontrollen (`.github/workflows/engine.yml`) udruller til Cloudflare med `wrangler deploy`, når main opdateres og alle tests består. Uden API-nøgle springes udrulningen over. Azure og Cloudflare udrulles uafhængigt af hinanden. Udrul ikke fra egen computer: kun GitHub bygger den delte udgave (`VITE_UDGAVE=delt`) og lægger admin-listen ud.
- Cloudflare Access står foran hele Worker'en (»All traffic«). Forhåndsvisningsadresser er slået fra (`preview_urls: false`).
- Admin (B-076) bestemmes af mailadressen: GitHub-variablen `ADMIN_EMAILS` (adresser adskilt af komma) lægges ud som `adgang.json` bag login. Andre brugere ser firmaprofilen låst; medarbejderkartoteket kan altid redigeres.
- `public/_headers` sætter de samme sikkerhedsoverskrifter som i Azure.
- Cloudflare tillader højst 25 MiB pr. fil. PDF-motoren leveres derfor gzip-pakket (10,34 MiB) og pakkes ud i browseren (B-078, `docs/PDF_MOTOR.md`). `npm run build` fejler, hvis en fil i `dist` er over grænsen.

## Opsætning (én gang)

Status 06.10.2026: alle trin er gennemført. Zero Trust-teamet hedder `byggros` (login på `byggros.cloudflareaccess.com`), Access dækker hele Worker'en, og `ADMIN_EMAILS` er `dst@byggros.com`. Ved en ny opsætning skal Access slås til, før appen udrulles; indtil da viser adressen kun en pladsholder.

1. **Konto.** Gratis konto på dash.cloudflare.com (oprettet 05.10.2026).
2. **Worker.** Claude har oprettet Worker'en `msl-dimensionering` med pladsholderen (06.10.2026). Kontoens id er gemt som GitHub-hemmeligheden `CLOUDFLARE_ACCOUNT_ID`.
3. **Zero Trust.** I Cloudflare: _Zero Trust_ → vælg et teamnavn, fx `byggros-msl`, og planen **Free** (op til 50 brugere). Cloudflare kan bede om et betalingskort, selv om planen er gratis.
4. **Login med engangskode.** _Zero Trust_ → _Settings_ → _Authentication_ → _Login methods_: kontrollér, at _One-time PIN_ findes; ellers _Add new_ → _One-time PIN_.
5. **Access på Worker'en.** _Workers & Pages_ → `msl-dimensionering` → fanen _Access_ (eller _Settings_ → _Domains & Routes_ → _Enable Cloudflare Access_):
   - _Protect this Worker behind Access_ → **All traffic**.
   - Politik: **Email domain** → `byggros.com`. Enkelte andre adresser kan tilføjes senere i politikken.
   - _Apply Access_.
6. **API-nøgle til GitHub.** _My Profile_ → _API Tokens_ → _Create Token_ → skabelonen **Edit Cloudflare Workers**:
   - _Account Resources_: din konto. _Zone Resources_: _All zones_ (kontoen har ingen domæner).

   Kopiér nøglen, og gem den i GitHub (_Settings_ → _Secrets and variables_ → _Actions_) som `CLOUDFLARE_API_TOKEN`. Nøglen må ikke sendes i chat.

7. **Admin-adresser.** GitHub-variablen `ADMIN_EMAILS` (_Settings_ → _Secrets and variables_ → _Actions_ → _Variables_), fx `navn@byggros.com`.
8. **Første udrulning.** GitHub → _Actions_ → _Beregningsmotor_ → _Run workflow_ (Claude kan også starte den). Kontrollér derefter, at adressen kræver login.

## Tilbage til kun lokal brug eller kun Azure

Slet Worker'en `msl-dimensionering` og Access-applikationen i Cloudflare, og slet hemmeligheden `CLOUDFLARE_API_TOKEN` i GitHub; derefter springes udrulningen over. Den lokale udgave og Azure påvirkes ikke.
