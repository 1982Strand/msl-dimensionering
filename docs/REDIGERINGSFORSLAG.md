# Redigering af grunddata — valg og resterende forslag

Opdateret 30. september 2026. Beslutningerne er registreret i [beslutningsloggen](BESLUTNINGER.md). Visuelt design godkendes særskilt.

| ID | Status | Omfang |
| --- | --- | --- |
| R-001 | Godkendt, B-017 | Direkte redigering og automatisk anvendelse/gemning uden Redigér/Gem. |
| R-002 | Godkendt, B-018 | Standardværdi sammen med ændret værdi og filteret »Vis kun ændringer«. |
| R-003 | Godkendt, B-018 | Fortryd/Gentag i den aktive session og gendannelse af en celle/række til standard. |
| R-004 | Afventer vurdering | Tastaturbetjening, søgning og eventuel indsætning af celler fra Excel; beskrevet nedenfor. |
| R-005 | Dataprofiler afvist, B-019 | Erstattet af enkel automatisk lagring af aktuelle brugerdata og indtastede værdier. Samme browser/computer er nok. |

## Den valgte arbejdsgang

Materialer, diagramtabeller og VejDim-data redigeres direkte. En afsluttet, gyldig ændring bliver automatisk aktiv og gemmes. Der er ingen særskilt kladde med Anvend/Kassér. Låste metadata og beregnede felter forbliver låste. Et ufærdigt tal under indtastning må ikke utilsigtet blive et nyt beregningsgrundlag.

Eksisterende normalisering og fejl bevares. Materialeduplikater, tomme materialelister og diagramrækker med dublet/manglende Eu ændrer ikke seneste gyldige grundlag. VejDim følger originalens normalisering og supplering med standardrækker. Nulstilling af ét diagram bevarer de øvrige.

R-002 gør det muligt at se eksempelvis **37° → 39°** ved en ændret friktionsvinkel. »Vis kun ændringer« filtrerer visningen, ikke beregningsgrundlaget. Nye og fjernede rækker vises særskilt. Diagrammernes eksisterende afrunding ved markering af afvigelser bevares; beregningsværdier afrundes ikke af visningen.

R-003 skelner mellem to handlinger: **Fortryd** går tilbage til værdien før sidste trin; **Gendan standard** går tilbage til den indbyggede standard. Hvis friktionsvinklen gendannes, bevares andre ændrede felter. Begge handlinger gemmer automatisk, og en gendannelse kan selv fortrydes. Historikken følger den åbne app og bevares ved intern navigation; en genindlæsning starter ny historik, men henter de gemte værdier. En selvoprettet række uden standardværdi bliver ikke slettet ved »Gendan standard«.

Et permanent materiale-ID ved omdøbning er ikke indført. Det ville påvirke forbindelsen til lagvalg og kræver et særskilt forslag.

## R-004 forklaret med konkrete eksempler

Dette forslag består af tre dele, som kan vælges hver for sig:

1. **Ens tastaturbetjening:** brug Tab/Enter til at afslutte og gå videre mellem redigerbare celler. Det gør mange rettelser hurtigere. Ingen ekstra gem-knap.
2. **Søgning og filtrering:** skriv eksempelvis et materialenavn for at finde rækken. Alle data findes fortsat, og søgningen ændrer ikke beregningerne.
3. **Indsæt flere celler fra Excel:** markér eksempelvis ti rækker med SG- og BL-værdier i Excel, kopiér og indsæt i de tilsvarende to redigerbare kolonner i VejDim. Det erstatter tyve manuelle indtastninger. T/Eu og beregnede totaler forbliver låste.

Den tredje del handler om et kopieret celleområde, ikke om at uploade eller fortolke en hel Excel-fil. Det skal være entydigt, hvilken række og kolonne hver værdi havner i. Håndtering af ugyldige celler og ét samlet fortryd-trin for indsætningen skal beskrives konkret før implementering. Den eksisterende VejDim-CSV er eksport; en ny CSV-import er ikke godkendt.

Vi kan således vælge tastatur og søgning og undlade Excel-indsætning. R-004 er ikke implementeret. En kompakt tabel med skjulte detaljekolonner er heller ikke indført.

## R-005 erstattes af at huske det aktuelle arbejde

Der oprettes ikke navngivne dataprofiler. Appen skal automatisk huske brugerens tabeller, indstillinger og indtastede værdier mellem sessioner. Brugeren har bekræftet, at samme browser på samme computer er tilstrækkeligt.

Implementeringsvalget er ét JSON-dokument i browserens lokale lager. JSON er dataformatet; browserens lager er placeringen. Ingen konto eller serverlagring er nødvendig for dette behov. På første besøg bruges de gamle indbyggede standardværdier. Ved genåbning bruges brugerens gemte værdier. Gemmefejl må aldrig vises som »Gemt«.

Data følger appens webadresse og browserprofil. Rydning af webstedets browserdata fjerner også de gemte værdier. Se [MDN om localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

## Implementeringsstatus og bevarede grænser

Den underliggende TypeScript-logik til R-001–003 og lokal JSON-lagring er implementeret og testet; [omfang og kontrol](REDIGERING_OG_LAGRING.md). Et første Materialer-udkast kobler nu editor, browserlager og fejlvisning sammen, kontrolleret med 11 browserprøver; se `MATERIALEUDKAST.md`. Øvrige tabeller og formularer mangler tilkobling. Godkendelsen er derfor ikke en godkendelse af et færdigt visuelt design.

Diagrammer beholder direkte redigering af Eu-rækker og skellet mellem tomt felt og 0. Automatisk interpolation af brugerens tomme felter, en ny kurveeditor og nye faglige kontroller er ikke indført. Original scanning og kurven fra aktive tabelværdier bevares som krav; figurernes udformning forelægges ved designgennemgangen.
