# Arbejdsregler for MSL Dimensionering

## Brugerens krav

- React + TypeScript + Vite + shadcn/ui er valgt til den nye brugerflade.
- Arbejd i `C:\MSL-Dimensionering`. Den gamle app i `C:\geonet_beregning` er reference og må ikke ændres som led i migreringen uden særskilt instruktion.
- Bevar alle beregninger, funktioner, standardværdier, gyldighedsområder, enheder, afrundinger, advarsler, fejltilstande og datagrundlag fra den godkendte reference.
- Ingen ændring i gammel virkemåde må indføres uden brugerens udtrykkelige godkendelse, heller ikke en tilsyneladende forbedring eller fejlrettelse.
- Design og visualiseringer af opbygninger kræver brugerens godkendelse. Vis konkrete udkast med realistiske data før endelig implementering.
- Stil afklarende spørgsmål, når et valg påvirker faglighed, funktionalitet, arbejdsgang eller visuel fremstilling. Fortsæt samtidig uafhængigt arbejde, når det er muligt.
- Registrer godkendelser i `docs/BESLUTNINGER.md` med dato, omfang og brugerens svar. Et forslag eller manglende svar er ikke en godkendelse.

## Migrering og kontrol

1. Læs migrationsplanen, beslutningsloggen og referencestatus før implementering.
2. Fastlæg godkendt kildeversion inklusive lokale ændringer og relevante brugerdefinerede data før referencecases fastlåses.
3. Kortlæg også logik i `app.py`, sessionstilstand, rapporter og indstillinger; `core/calculator.py` alene er ikke hele appen.
4. Gem referencecases fra den gamle app før implementering af det tilsvarende område. Sammenlign mellemresultater, slutresultater, gyldighed, advarsler og viste værdier.
5. Diskrete valg, afvisninger, oprundede tykkelser og viste resultater skal stemme præcist. Eventuelle tolerancer for interne flydende tal kræver dokumentation og brugerens godkendelse; de må ikke skjule en ændret beslutning eller tykkelse.
6. Et fund af en mulig fejl i originalen registreres særskilt. Omskriv ikke referenceforventninger for at få en ny implementation til at bestå.
7. Kontroller samme opbygning på skærm og i rapport. Godkendelser af generelt appdesign og opbygningsvisualisering er separate.
8. Offentliggørelse er en senere beslutning. Repository oprettes privat under planlægningen.
9. Udvikling efter initialiseringen sker som udgangspunkt på `codex/`-grene.

## Kodesøgning

Brug `mcp__semble__search` til at finde implementeringer. Læs derefter direkte ved den returnerede fil og linje. Brug `content="docs"`, `content="config"` eller `content="all"` ved søgning uden for kode. Brug ikke grep til at genfinde det samme indhold. Grep kan bruges, når alle forekomster af en konkret streng er nødvendige.

CLI-fallback: `semble search "beskrivelse" C:\MSL-Dimensionering --max-snippet-lines 10`. Hvis Semble ikke findes på PATH: `uvx --from "semble[mcp]==0.6.0" semble`.

## Sprog og data

Dialog og projektdokumentation skrives på dansk. Bevar eksisterende fagterminologi og hjælpeteksters betydning. Brugervendt fagtekst følger den eksisterende apps stil: upersonlig, konstaterende fremstilling, præcise symboler og enheder.

Lokale kundedata, rapportmetadata, nøgler og adgangsoplysninger må ikke tilføjes til Git. Brug syntetiske eller anonymiserede data i referencecases. Bevar nødvendige lokale referencefiler separat; udelukkelse fra Git må ikke føre til tab af beregningsgrundlag.
