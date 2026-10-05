# Delt udgave i Azure Static Web Apps (B-075)

Appen kan deles med kolleger via en fast adresse i Azure. Hele appen kræver login med en Microsoft-konto og en invitation med rollen `medarbejder` eller `admin`. Den lokale udgave (startfilen) er uændret og påvirkes ikke.

## Roller (B-076)

- `medarbejder`: fuld brug af appen. Firmaprofilen kan ses, men ikke ændres; rapporterne bruger standardprofilen. Medarbejderkartoteket kan redigeres.
- `admin`: som `medarbejder`, og firmaprofilen kan ændres.

Låsen hindrer ændringer ved et uheld. Den er ikke en sikkerhedsgrænse, da appen kører i browseren. Hver brugers ændringer gemmes kun i brugerens egen browser.

## Sådan virker det

- Appen er en statisk mappe (`dist`). Beregninger, figurer og rapport-PDF laves i browseren; der er ingen server, der regner.
- Hver bruger har sine egne gemte data i sin egen browser. Ændringer hos én bruger påvirker ikke andre eller den lokale udgave.
- GitHub-kontrollen (`.github/workflows/engine.yml`) udruller automatisk til Azure, når main opdateres, og alle tests består. Udrulningen kan også startes manuelt (»Run workflow«).
- Adgangsreglerne står i `public/staticwebapp.config.json`. Ikke-logget-ind sendes til Microsoft-login; en konto uden invitation ser `ingen-adgang.html`.
- »Genstart app« (B-073) findes kun lokalt og vises ikke i Azure.

## Opsætning (én gang)

1. **Opret appen i Azure.** På portal.azure.com: søg efter »Static Web Apps« → _Opret_ (Create).
   - Abonnement: det gratis abonnement.
   - Ressourcegruppe: _Opret ny_ → `msl-dimensionering`.
   - Navn: `msl-dimensionering`.
   - Plantype: **Free**.
   - Område: West Europe.
   - Udrulningskilde (Deployment source): **Andet** (Other). Vælg ikke GitHub; projektet har sin egen udrulning.
   - _Gennemse + opret_ → _Opret_.
2. **Kopiér udrulningsnøglen.** Åbn den nye app → _Oversigt_ → _Administrer udrulningstoken_ (Manage deployment token) → kopiér.
3. **Gem nøglen i GitHub.** Repository `1982Strand/msl-dimensionering` → _Settings_ → _Secrets and variables_ → _Actions_ → _New repository secret_:
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Secret: den kopierede nøgle.

   Alternativt i en terminal: `gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --repo 1982Strand/msl-dimensionering` (nøglen indsættes, når der spørges). Nøglen må ikke sendes i chat eller lægges i Git.

4. **Første udrulning.** GitHub → _Actions_ → _Beregningsmotor_ → _Run workflow_ på main, eller vent på næste opdatering af main.
5. **Inviter brugere, også dig selv.** Appen i Azure → _Rollestyring_ (Role management) → _Inviter_:
   - Godkendelsesudbyder: Microsoft Entra ID.
   - Inviteret: personens e-mail.
   - Domæne: appens adresse.
   - Roller: `medarbejder`, eller `admin` for dem, der skal kunne ændre firmaprofilen.
   - Udløb: højst 168 timer.

   _Generér_ giver et link, som sendes til personen. Personen åbner linket, logger ind med sin Microsoft-konto og har derefter adgang. Den gratis plan tillader et begrænset antal inviterede brugere (omkring 25).

6. **Adressen** står under _Oversigt_ → _URL_, fx `https://<navn>.azurestaticapps.net`.

## Kendte fejl

- **»No matching Static Web App was found or the api key was invalid«:** Den første app (oprettet 05.10.2026 i West Europe) afviste enhver nøgle, også en nøgle hentet direkte fra Azure, mens nyoprettede apps i samme konto virkede. Løsningen var at slette appen og oprette den igen med samme navn og plan. Ses fejlen igen, med en nøgle kopieret med kopiér-ikonet, gøres det samme.
- **Ugyldig `staticwebapp.config.json`:** Azures skema tillader kun bestemte felter (fx ikke `$comment`); ellers afvises udrulningen. `tests/azure-config.test.ts` kontrollerer felterne.

## Fjern adgang

_Rollestyring_ → vælg personen → fjern rollen (`medarbejder` eller `admin`). Hele den delte udgave kan lukkes ved at slette Static Web App-ressourcen; den lokale udgave påvirkes ikke.

## Tilbage til kun lokal brug

Azure-delene kan slås fra uden at ændre resten af appen:

1. Slet Static Web App-ressourcen i Azure.
2. Slet hemmeligheden `AZURE_STATIC_WEB_APPS_API_TOKEN` i GitHub; derefter springes udrulningen over.

Den lokale udgave virker uændret. Den byggede app (`dist`) kan lægges på en anden webtjeneste; `staticwebapp.config.json` bruges kun af Azure, og låsen af firmaprofilen virker kun, hvor `/.auth/me` oplyser roller. Login og adgang hos en anden tjeneste aftales særskilt.
