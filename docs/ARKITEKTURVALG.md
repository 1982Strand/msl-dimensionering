# Arkitekturvalg efter første kortlægning

Status: beslutningsgrundlag, ikke godkendt arkitektur. Brugerfladens React + TypeScript + Vite + shadcn/ui er allerede valgt.

**Anbefalet næste afprøvning:** [Rapportevalueringen](RAPPORT_EVALUERING.md) peger på TypeScript-genereret DOCX med fortsat LibreOffice-konvertering som første kandidat. TypeScript i rapportdelen kan således være del af A uden at udfase LibreOffice. Ingen arkitektur er godkendt.

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

Min vurdering: **A med TypeScript-DOCX og bevaret LibreOffice bør afprøves**, så valget kan baseres på konkrete rapportforskelle og målinger. **B er en mulig reservevej**, hvis rapportporteringen giver uacceptable forskelle eller omkostninger. **C ændrer mindst i den eksisterende faglogik.** Ingen af mulighederne er valgt endnu.

Mulighed B kræver kontrol af, at rapporten anvender de samme beregningsresultater som brugerfladen. En rapporttjeneste må ikke genberegne med afvigende data eller indstillinger. Alle muligheder kræver fortsat kontrol mod de fastlåste cases og visuel godkendelse af figurer/rapporter.

## Det, der kan gøres inden beslutningen

Udbyg referencecases, kortlæg resterende redigerings- og rapportforløb, fastlæg serialiserbare dataformater og vis konkrete designudkast efter afklaring af identiteten. Ingen alternativ beregningsmetode, fælles datalagring eller ny PDF-gengivelse indføres uden afklaring.
