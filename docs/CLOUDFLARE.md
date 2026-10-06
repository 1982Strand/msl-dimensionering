# Delt udgave i Cloudflare (B-077, B-079, B-080)

Ved siden af Azure (`docs/AZURE.md`) deles appen via Cloudflare. Udgaven er **åben uden login** (B-080): alle med adressen kan bruge den. Den lokale udgave er uændret.

Adresse: **https://msl-dimensionering.msl-dimensionering.workers.dev**

## Sådan virker det

- Cloudflare Pages er nu en del af Cloudflare Workers (B-079). Appen ligger som en Worker med kun statiske filer, `msl-dimensionering`, uden serverkode. `wrangler.jsonc` er den faste opsætning. Uden den ændrer wrangler selv projektets filer (»autoconfig«).
- GitHub-kontrollen (`.github/workflows/engine.yml`) udruller til Cloudflare med `wrangler deploy`, når main opdateres og alle tests består. Uden API-nøgle springes udrulningen over. Azure og Cloudflare udrulles uafhængigt af hinanden. Udrul ikke fra egen computer: kun GitHub bygger den delte udgave (`VITE_UDGAVE=delt`).
- Firmaprofilen er skjult (B-080). Fanen hedder »Medarbejdere« og viser kun medarbejderkartoteket; rapporterne bruger firmaets standardprofil. Der er ingen admin i Cloudflare-udgaven: firmaprofilen redigeres lokalt (startfilen) eller af `admin` i Azure. Skjulningen hindrer ændringer ved et uheld; den er ikke en sikkerhedsgrænse, da appen kører i browseren.
- Hver bruger har sine egne gemte data (kartotek, sager) i sin egen browser.
- Søgemaskiner bedes om ikke at vise siden (`noindex` i `index.html` og `X-Robots-Tag` i `public/_headers`). Adressen kan dog deles videre af alle, der har den.
- `public/_headers` sætter de samme sikkerhedsoverskrifter som i Azure.
- Forhåndsvisningsadresser er slået fra (`preview_urls: false`).
- Cloudflare tillader højst 25 MiB pr. fil. PDF-motoren leveres derfor gzip-pakket (10,34 MiB) og pakkes ud i browseren (B-078, `docs/PDF_MOTOR.md`). `npm run build` fejler, hvis en fil i `dist` er over grænsen.

## Opsætning

1. **Konto.** Gratis konto på dash.cloudflare.com (oprettet 05.10.2026), kontoens id i GitHub-hemmeligheden `CLOUDFLARE_ACCOUNT_ID`.
2. **Worker.** `msl-dimensionering`, oprettet 06.10.2026.
3. **API-nøgle.** Skabelonen _Edit Cloudflare Workers_ (din konto, _All zones_), gemt i GitHub som `CLOUDFLARE_API_TOKEN`. Nøglen må ikke sendes i chat. Samme nøgle kan bruges til andre Workers i kontoen.
4. **Login slået fra.** _Workers & Pages_ → `msl-dimensionering` → fanen _Access_ (eller _Settings_ → _Domains & Routes_): Access slås fra for Worker'en.

Zero Trust-teamet `byggros` (login med engangskode på mail) blev oprettet til B-077 og kan genbruges.

## Login igen (som B-077)

Skal adgangen begrænses igen, slås Access til på Worker'en: _Protect this Worker behind Access_ → **All traffic**, politik **Email domain** `byggros.com`. Browseren kan huske login i op til 1 måned (_Session duration_). Firmaprofilen forbliver skjult, indtil der igen tilføjes en admin-ordning.

## Tilbage til kun lokal brug eller kun Azure

Slet Worker'en `msl-dimensionering` i Cloudflare, og slet hemmeligheden `CLOUDFLARE_API_TOKEN` i GitHub; derefter springes udrulningen over. Den lokale udgave og Azure påvirkes ikke.
