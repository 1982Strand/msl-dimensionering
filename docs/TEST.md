# Kontrol af appen

Enhedstests ligger i `tests/*.test.ts`; godkendte input og forventninger ligger i `tests/cases/`. De afprøver den aktuelle TypeScript-kode og kræver ingen ekstern app eller Pythonmiljø.

Kontrollen omfatter standarder, interpolation, klassegrænser, afrunding, lagtykkelser, geonetplacering, fejl og advarsler samt tabeller, mellemregninger, formularer, lagring, firmaprofil og rapportdata. Forventninger må ikke regenereres fra motoren for at acceptere en ændring.

```powershell
npm run typecheck
npm run format:check
npm test
npm run build
npm run test:browser
```

Playwright afprøver brugerforløb, rapporter og tilgængelighed på port 5184, adskilt fra den lokale app. Brugeren foretager visuel kontrol.

Den delte profilvisning kontrolleres efter bygning med `$env:VITE_UDGAVE='delt'`. Kør profiltesten med `$env:TEST_SHARED='1'` og `npx playwright test tests/browser/shared-access.spec.ts`. Fjern begge miljøvariabler og byg igen til lokal brug.

`node tools/build-r6-pdfs.ts` kontrollerer det godkendte rapportlayout, tekstindhold, sideantal og PDF-kontrolsummer. Det kræver `pdftotext` på PATH eller angivet i `PDFTOTEXT`. Output ligger i den Git-ignorerede `.local/`-mappe.

Hosting afprøves særskilt med `node --test hosting/cloudflare/*.test.ts`. Appens normale kontroller kræver ingen hostingkonfiguration eller nøgler.

## Eksisterende afvigelse i PDF-kontrolsummer

Ved gennemgangen 10. oktober 2026 afviger alle 31 PDF-kontrolsummer fra det gemte godkendelsessæt, også når versionen før oprydningen køres uændret. Rapporterne efter oprydningen er byte-identiske med denne version; tekstindhold, sideantal og automatiske layoutkontroller stemmer. De gemte forventninger er bevaret. Kontrollens afvigelse skal undersøges særskilt, før godkendelsessættet eventuelt ændres.
