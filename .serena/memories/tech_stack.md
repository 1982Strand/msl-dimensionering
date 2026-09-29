# Stack
- TypeScript-fagmotor uden UI-/Python-runtimeafhængighed. Node >=24 understøtter direkte .ts-testkørsel. npm med eksakte devDependency-versioner og package-lock.json; strict tsc.
- Valgt kommende brugerflade: React + TypeScript + Vite + shadcn/ui. Hosting, adgang og datalagring afgøres særskilt; motorvalget autoriserer ikke fælles flerbrugerdata.
- PDF-spor: TypeScript kalder isoleret Typst 0.15.1 CLI i spikes/report-typescript. B-012 godkender videre arbejde/dataarkivering, ikke bortfald af Word.
- Rapportbaseline dannet med lokal Word 16.0; LibreOffice/server/fontinstallation er ikke verificeret. Lokale Calibri/Arial-filer distribueres ikke.
- Serena: projektkonfiguration omfatter typescript og python; Semble lokaliserer kode først. En kørende Serena-server kan beholde tidligere sprogkonfiguration til genstart; CLI index-file kan kontrollere den gemte konfiguration.