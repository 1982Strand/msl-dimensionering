# MSL Dimensionering

Dimensionering af MSL-opbygninger med geonet i React, TypeScript, Vite og shadcn/ui. Beregninger og PDF-rapporter dannes i browseren. Appen kan bruges lokalt eller som en statisk webapp.

## Lokal brug

Kræver Node 24 eller nyere. Dobbeltklik på `Start MSL Dimensionering.cmd`. Den installerer afhængigheder første gang, bygger appen og åbner http://127.0.0.1:5174/.

```powershell
npm ci
npm run dev
npm run build
npm run preview
```

Den lokale udgave har en redigerbar firmaprofil. Data gemmes i den enkelte browser; der er ingen fælles kundedatabase.

## Kontrol

```powershell
npm run typecheck
npm run format:check
npm test
npm run build
npm run test:browser
node tools/build-r6-pdfs.ts
```

Browsertests bruger port 5184 og genbruger ikke den lokale appserver. Godkendte beregningscases ligger i `tests/cases/` og bruges kun til test, aldrig som beregningsmotor.

## Delt udgave

Byg med `VITE_UDGAVE=delt` for en delt udgave med skjult firmaprofil og standardprofil i rapporterne. Medarbejderkartoteket er fortsat personligt og redigerbart. Denne visning er uafhængig af hostingudbyderen.

Cloudflare er midlertidig hosting af de statiske filer i `dist`. Appen kan anvendes hos en anden udbyder uden Cloudflare.

## Vejledninger

- [Beregninger](docs/BEREGNINGSMOTOR.md)
- [Data og lagring](docs/DATAREDIGERING.md)
- [Indstillinger](docs/INDSTILLINGER.md)
- [Test](docs/TEST.md)
- [Drift og flytning](docs/DRIFT.md)
- [Cloudflare](docs/CLOUDFLARE.md)
- [PDF-motor](docs/PDF_MOTOR.md)
- [Arbejdsregler](AGENTS.md)
