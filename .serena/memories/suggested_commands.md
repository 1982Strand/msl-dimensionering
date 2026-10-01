# Projektkommandoer

Bemærkning 01.10.2026: Rapportforsøget `spikes/report-typescript/` og kommandoen `npm run test:reports` er fjernet ved oprydningen (B-059). Omtaler nedenfor bevares som historik; forsøget findes i Git-historikken.

- npm ci; npm run typecheck; npm test; npm run format:check.
- npm run test:reports kræver først lokal Typst-installation og rapportinputs efter spikes/report-typescript/README.md. Ikke del af den afhængighedsfri core-testkørsel.
- PowerShell fra C:\MSL-Dimensionering: & 'C:\geonet_beregning\.venv\Scripts\python.exe' tools/export_engine_data.py --check
- Samme Python: tools/capture_core_reference.py og tools/capture_engine_boundaries.py genkontrollerer fastlåst reference. --record må kun oprette en ny fil, ikke overskrive eksisterende.
- Serena gemt TS-konfiguration kan kontrolleres med: serena project index-file src/engine/calculator.ts C:\MSL-Dimensionering
- Hukommelsesreferencer: serena memories check (fra projektroden).