# Arkitekturvalg efter første kortlægning

Bemærkning 01.10.2026: Rapportforsøget `spikes/report-typescript/` og kommandoen `npm run test:reports` er fjernet ved oprydningen (B-059). Omtaler nedenfor bevares som historik; forsøget findes i Git-historikken.

Status: React + TypeScript + Vite + shadcn/ui samt TypeScript-beregningsmotor er valgt (B-002/B-014). Typst videreføres med bevarede rapportdata (B-012/B-013). Hosting, adgang, datalagring og Word-eksportens fremtid er endnu ikke besluttet.

**Rapportretning efter afprøvning:** Brugeren overvejer PDF som primært format. [Typst-afprøvningen](TYPST_AFPROEVNING.md) gør TypeScript + Typst til en relevant kandidat uden Word/LibreOffice i PDF-vejen. Hvis Word fortsat er primært, er TypeScript-DOCX med LibreOffice en alternativ kandidat, jf. [rapportevalueringen](RAPPORT_EVALUERING.md). Fjernelse af Word er ikke godkendt. Beregningsmotorens TypeScript-omskrivning er særskilt godkendt i B-014.

## Hvad kildegennemgangen viser

Beregningskernen består hovedsageligt af tabelopslag, korrektioner, oprunding, regler for lagfordeling/placering og validering. Den er i væsentligt omfang fri for Streamlit. Der er dog også betydelig sammensætning af beregninger, standarder, produktresultater og lagdata i `app.py`, som skal flyttes med. En portering af alene `core/calculator.py` er utilstrækkelig.

Rapporter bruger `docxtpl`/`python-docx`, en eksisterende Word-skabelon og fælles Plotly-figurer. Figurer eksporteres gennem Kaleido/Chrome. PDF dannes af Word på Windows og LibreOffice på øvrige platforme. Det er den konkrete eksisterende kæde i `core/rapport.py` og `packages.txt`, ikke et generelt krav fra React.

De redigerbare materialer, diagrammer, kørsler og indstillinger ligger i dag i JSON-filer ved appen. En offentlig flerbrugerudgave kræver et eksplicit valg mellem personlige data og fælles administrerede data. Dette valg kan ændre virkemåden og må ikke tages implicit.

Vite har en officiel React/TypeScript-skabelon, og shadcn/ui dokumenterer installation til Vite. Vite kan også indgå sammen med en særskilt backend. De officielle vejledninger fastlægger ikke, hvor vores beregningsmotor skal ligge: [Vite](https://vite.dev/guide/), [shadcn/ui til Vite](https://ui.shadcn.com/docs/installation/vite), [Vite backend-integration](https://vite.dev/guide/backend-integration).

## Tre konkrete muligheder

| Valg | Beregninger | Rapporter | Vigtigste konsekvens |
| --- | --- | --- | --- |
| A — fuld TypeScript-omskrivning | Flyttes til et selvstændigt TypeScript-modul | Ny rapportimplementation; Word/PDF og figurer skal efterprøves mod eksisterende skabelon/udskrift | Opfylder et mål om at udfase Python helt; størst omskrivning og kontrolbehov |
| B — TypeScript-beregning, bevaret rapportmotor | Flyttes til TypeScript og testes mod Python-referencen | Eksisterende Python-rapportkode isoleres som en tjeneste med aftalt dataformat | Fjerner Streamlit fra brugerfladen og flytter beregningerne; Python bevares til rapporter |
| C — ny brugerflade, bevaret Python-faglogik | Eksisterende beregning og sammensætning udstilles gennem en tjeneste | Eksisterende rapportkode bevares | Mindst samtidig ændring af beregninger og rapporter; opfylder ikke et mål om at fjerne Python |

Min vurdering: **A kan kombineres med Typst til PDF**, hvis den PDF-centrerede retning vælges. En eventuel Word-generator bør bruge de samme rapportdata. **B er en mulig reservevej**, hvis rapportporteringen giver uacceptable forskelle eller omkostninger. **C ændrer mindst i den eksisterende faglogik.** B-014 vælger TypeScript til beregningerne; mulighed C er derfor ikke den valgte vej. Der arbejdes videre mod A med Typst, mens Word-behov og produktionsdrift fortsat afklares.

Mulighed B kræver kontrol af, at rapporten anvender de samme beregningsresultater som brugerfladen. En rapporttjeneste må ikke genberegne med afvigende data eller indstillinger. Alle muligheder kræver fortsat kontrol mod de fastlåste cases og visuel godkendelse af figurer/rapporter.

## Videre arbejde efter B-014

Udbyg referencecases, kortlæg resterende redigerings- og rapportforløb, fastlæg serialiserbare dataformater og vis konkrete designudkast efter afklaring af identiteten. Ingen alternativ beregningsmetode, fælles datalagring eller ny PDF-gengivelse indføres uden afklaring.

Beregningsmotorens aktuelle implementation, præcisionskontrol og resterende arbejde er beskrevet i [BEREGNINGSMOTOR.md](BEREGNINGSMOTOR.md). Motoren kan køres uden Python, Streamlit eller Typst og modtager aktive tabeller/indstillinger som input. Rapportprototypen bruger stadig originale færdige rapporttekster; den er ikke automatisk tilkoblet motoren.
