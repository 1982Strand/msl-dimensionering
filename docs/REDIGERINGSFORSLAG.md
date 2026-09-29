# Forslag til enklere redigering af grunddata

29. september 2026. Udarbejdet efter brugerens ønske om forbedringsforslag. **Alle forslag afventer godkendelse.** Den implementerede TypeScript-logik bevarer den gamle apps regler og standarder.

React gør det lettere at holde en lokal redigeringskladde, vise forskelle og opdatere en forhåndsvisning uden at genkøre hele siden. TypeScript hjælper med ensartede datafelter mellem tabeller, beregning og rapport. Gevinsten afhænger af den valgte arbejdsgang; beregningsmetoden ændres ikke af teknologivalget.

## Anbefalet første pakke

Jeg anbefaler R-001–003 som én samlet redigeringsoplevelse. R-004 kan tilføjes bagefter. R-005 bør afvente beslutningen om adgang og personlige/fælles data.

| ID | I dag | Forslag | Ændring der skal godkendes |
| --- | --- | --- | --- |
| R-001 | Materialer, diagrammer og VejDim-kørsler gemmes løbende. Diagramknappens tekst »Færdig« kan give indtryk af en senere gemning. | Fælles arbejdsgang: **Redigér → kladde → Anvend ændringer / Kassér**. Aktiv beregning og rapportgrundlag bruger senest anvendte data. | Gemmetidspunkt og virkning på beregningen ændres. Navigation væk fra en kladde kræver et aftalt valg. |
| R-002 | Diagrammet markerer allerede afvigelser i den faste tabel. Materialesiden advarer om ændret phi. | Vis **standardværdi → ændret værdi** i alle relevante celler, filteret **Vis kun ændringer** og en samlet ændringsliste før anvendelse. | Ny visning og filtrering; ingen nye faglige grænser. Eksisterende diagrammarkeringer videreføres. |
| R-003 | Nulstilling findes for et diagram/alle diagrammer, materialelisten og VejDim-kørslerne. Der er ingen fælles fortryd-funktion. | **Fortryd/Gentag** under redigering og mulighed for **Gendan denne celle/række** uden at miste de øvrige tilpasninger. | Nye handlinger. Første version begrænses til den åbne kladde; historik efter anvendelse er et separat spørgsmål. |
| R-004 | Tabellerne har separate redigeringsvisninger; VejDim har allerede låste trafikklasse-/Eu-kolonner og beregnede totaler. | Ens tastaturbetjening, søgning og indsætning af et celleområde fra Excel med en kontrolliste før anvendelse. | Masseændringer og import er nye funktioner. Kolonnematch, talformat og konflikter skal defineres. |
| R-005 | Ét aktuelt sæt brugerredigerede data ligger i JSON-filer ved appen. | Navngivne **dataprofiler**, eksempelvis »Standard« og »Projekt A«, med versionsnummer knyttet til beregning og rapport. | Ny datamodel og arbejdsgang. Kræver aftale om ejerskab, adgang, lagring og håndtering af eksisterende data. |

## R-001 — konkret forløb

Brugeren åbner Diagram 4, vælger »Redigér« og ændrer tykkelsen i én celle. Cellen vises som ændret. En særskilt forhåndsvisning kan vise kladdens kurve sammen med den aktive kurve. De eksisterende beregninger og rapportdata beholder det aktive grundlag, indtil brugeren vælger »Anvend ændringer«.

- **Anvend ændringer:** kontrollér hele kladden med de eksisterende regler, opdatér det aktive grundlag samlet, genberegn og markér eventuelle tidligere rapportfiler som forældede.
- **Kassér:** luk kladden uden at ændre aktive data.
- **Navigation med en åben kladde:** foreslået dialog med »Anvend«, »Kassér« og »Bliv«. Ingen automatisk anvendelse eller tab af kladden.
- **Fejl:** bliv i kladden og vis fejlen ved den konkrete celle/række samt i en samlet liste. Delvis anvendelse af en ugyldig tabel undgås.

Dette løser uklarheden i FUND-004 ved at ændre adfærden, ikke alene knappens tekst. Et mindre alternativ er at bevare automatisk gemning og vise »Ændringer er aktive og gemt«. Jeg foretrækker kladden til data, som påvirker ingeniørberegninger, men valget er brugerens.

## R-002–003 — eksempel fra materialer

En bruger ændrer friktionsvinklen for et materiale og retter bemærkningen for et andet. Ændringslisten viser begge felter med gammel og ny værdi. »Gendan friktionsvinkel« fører kun det valgte felt tilbage til den indbyggede standard; bemærkningen bevares. »Fortryd« fører derimod det seneste redigeringstrin tilbage til værdien før trinnet, som godt kan have været en tidligere brugerændring.

Skeln dermed mellem **fortryd et trin**, **kassér kladden** og **gendan standard**. De tre handlinger bør ikke gemmes bag den samme knap.

Materialernes eksisterende grænser, normalisering, krav til unikke navne, lagtyper og genopfyldning af manglende felter bevares, medmindre noget andet godkendes særskilt. En ændring af et navn til et internt, permanent materiale-ID kan være nyttig senere, men ændrer forbindelsen til lagvalg og skal behandles som et selvstændigt forslag.

## Diagramtabeller: bevar den direkte kontrol

Bevar redigering af de konkrete Eu-rækker som den første løsning. Bevar skellet mellem **tomt felt (ingen diagramværdi)** og **tallet 0** og markeringen af direkte aflæste kontra interpolerede standardpunkter. Et tomt felt må ikke automatisk udfyldes eller interpoleres under almindelig tabelredigering.

Et mere avanceret alternativ er kun at redigere få kurvepunkter og lade appen genopbygge de øvrige rækker. Det er en større ændring: i dag ændrer en redigering i tabellen den konkrete celle direkte. En ny kurveeditor kan påvirke mange rækker samtidig. Derfor anbefales den ikke som del af den første migrationsudgave uden en særskilt aftale om interpolation, dækning og kontrolcases.

En forhåndsvisning bør vise både den oprindelige scanning, den aktive kurve og eventuelt kladden med en tydelig forklaring. Figurer, farver og markeringer skal godkendes som del af designet.

## R-004 — import og validering

For VejDim kan en kompakt visning fokusere på T, Eu, SG, BL og ubundet total, mens de eksisterende øvrige felter åbnes som detaljer. Ingen eksisterende felter fjernes. De afledte totaler forbliver beregnede og kan ikke overskrives af en importfil.

Ved indsætning fra Excel foreslås en forhåndsvisning med antal rækker, match til eksisterende T/Eu eller materialer, afviste felter og de præcise ændringer. Ukendte kolonner må ikke få en gættet betydning. Den nuværende semikolonseparerede VejDim-CSV er en eksport; en ny importfunktion skal aftales særskilt.

Yderligere faglige kontroller, fx nye regler for kurvernes monotoni eller tilladte tykkelser, holdes uden for denne pakke. De kan ændre, hvilke datasæt der accepteres, og kræver egen vurdering og godkendelse.

## Kontrol ved en eventuel godkendelse

Nye tests skal dokumentere, at kladder ikke påvirker den aktive beregning, at anvendelse opdaterer det samlede grundlag, at fortryd/gendan kun ændrer det tiltænkte, og at en rapport bruger samme dataversion som beregningen. Beregningsmotorens eksisterende referencekontrol skal fortsat bestå. Browserprøver skal dække tastatur, navigation, indsat celleområde og fejlretning.

Godkendelse af denne arbejdsgang er adskilt fra godkendelse af appens endelige visuelle design.
