# Arbejdsregler for MSL Dimensionering

## Funktionalitet og kontrol

- Arbejd i `C:\MSL-Dimensionering`. React, TypeScript, Vite og shadcn/ui er valgt.
- Bevar godkendte beregninger, funktioner, standarder, gyldighedsområder, enheder, afrundinger, advarsler, fejltilstande og rapporter. Lokale brugerfiler må ikke blive indbyggede standarder.
- Tests i `tests/cases/` er appens godkendte kontrolgrundlag. Input og forventninger må ikke omskrives for at få ændringer til at bestå.
- Diskrete valg, afvisninger, oprundede tykkelser og viste resultater skal stemme præcist. Nye tolerancer og ændret virkemåde kræver brugerens udtrykkelige godkendelse.
- Designændringer afklares med brugeren. Brugeren foretager selv visuel kontrol i appen; start ikke et særskilt preview eller screenshots til visuel gennemgang. Automatiske browsertests indgår i kontrollen.
- Samme opbygning skal stemme på skærm og i rapport. Godkendelse af appdesign og opbygningsvisualisering er separate.
- Registrer nye faglige og funktionelle aftaler i `docs/BESLUTNINGER.md` med dato, omfang og brugerens svar. Manglende svar er ikke godkendelse.

## Arbejdsgang

- Udvikling sker på kortlivede `codex/`-grene. Ændringer samles på `main` efter kodegennemgang og relevante automatiske kontroller. Afsluttede hjælpegrene og worktrees ryddes op.
- Kør typekontrol, formatkontrol, enhedstests og relevante browser- og rapportkontroller. GitHub-kvoter må ikke erstatte lokal kvalitetssikring.
- Cloudflare er valgfri hosting under `hosting/cloudflare/` og `.github/workflows/cloudflare.yml`. Beregninger, lokal brug og normale tests må ikke kræve hostingnøgler, loginendepunkter eller udbyderspecifik serverkode.
- Stil spørgsmål ved valg, der påvirker faglighed, funktionalitet, arbejdsgang eller visning. Fortsæt uafhængigt arbejde imens.

## Kodesøgning

Brug Semble først til at lokalisere implementeringer, og læs direkte ved det returnerede sted. Brug `content="docs"`, `"config"` eller `"all"` ved søgning ud over kode. Brug Serena til symboler og referencer. Grep er til alle forekomster af en konkret streng.

CLI-fallback: `semble search "beskrivelse" C:\MSL-Dimensionering --max-snippet-lines 10`. Hvis programmet mangler: `uvx --from "semble[mcp]==0.6.0" semble`.

## Sprog og private data

Dialog og projektdokumentation er på dansk. Bevar fagterminologi og hjælpeteksters betydning. Brugervendt fagtekst er upersonlig og konstaterende med præcise symboler og enheder.

Kundedata, personlige rapportmetadata, medarbejderoplysninger, adgangsnøgler, interne arkiver og sikkerhedskopier må ikke tilføjes til Git. Brug syntetiske testdata. `.local/`, `reference-private/`, brugerdefinerede JSON-filer og miljøfiler forbliver ignoreret. Private arkiver bevares lokalt med backup. Sletning af aktuelle filer renser ikke Git-historik eller GitHub-logs.
