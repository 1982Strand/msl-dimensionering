# Kontrol af appen

Enhedstests ligger i `tests/*.test.ts`; godkendte input og forventninger ligger i `tests/cases/`. De afprøver den aktuelle TypeScript-kode og kræver ingen ekstern app eller Pythonmiljø.

Kontrollen omfatter standarder, interpolation, klassegrænser, afrunding, lagtykkelser, geonetplacering, fejl og advarsler samt tabeller, mellemregninger, formularer, lagring, firmaprofil og rapportdata. Forventninger må ikke regenereres fra motoren for at acceptere en ændring.

```powershell
npm run typecheck
npm run format:check
npm test
npm run build
npm run build:udgaver
npm run test:browser
```

Playwright afprøver brugerforløb, rapporter og tilgængelighed på port 5184, adskilt fra den lokale app. Brugeren foretager visuel kontrol.

Playwright kører tre projekter, ét pr. udgave. Den lokale udgave testes mod `dist` på port 5184; den interne mod `dist-intern` på 5185 og den offentlige mod `dist-offentlig` på 5186. Udgavernes egne tests hedder `tests/browser/udgave-<udgave>.spec.ts` eller `udgave-<udgave>-<emne>.spec.ts`. `npm run build:udgaver` bygger udgaverne; intern bygning bruger den syntetiske liste `tests/fixtures/medarbejdere-syntetisk.json`. Med `PW_PORT` flyttes alle tre porte.

`node tools/build-r6-pdfs.ts` kontrollerer det godkendte rapportlayout, tekstindhold, sideantal og PDF-kontrolsummer. Kontrolsummerne er senest godkendt af brugeren 6. november 2026. Det kræver `pdftotext` på PATH eller angivet i `PDFTOTEXT`. Output ligger i den Git-ignorerede `.local/`-mappe.

Hosting afprøves særskilt med `node --test hosting/cloudflare/*.test.ts`. Appens normale kontroller kræver ingen hostingkonfiguration eller nøgler.
