# Enklere redigering af grunddata

Opdateret 30. september 2026 efter brugerens valg af direkte redigering og automatisk gemning (B-017). **Denne arbejdsgang er valgt.** De øvrige forbedringer nedenfor er forslag; visuelt design er fortsat ikke godkendt.

## R-001 — valgt arbejdsgang

Materialer, diagramtabeller og VejDim-data kan redigeres direkte i tabellen uden en »Redigér«-knap. Når en gyldig celleredigering afsluttes, gemmes og anvendes ændringen automatisk. Der er ingen »Gem«, »Anvend« eller »Kassér«-knap og ingen særskilt redigeringskladde.

Det viderefører den gamle apps automatiske aktivering/gemning og fjerner diagramtabellens ekstra åbne-/lukkehandling. »Færdig« udgår dermed som redigeringshandling. Eksisterende låste metadata og beregnede felter forbliver låste; direkte redigering gør dem ikke til nye input.

Eksisterende regler for normalisering og fejl bevares. Materialeduplikater, en tom materialeliste og diagramrækker med dublet/manglende Eu ændrer ikke det seneste gyldige grundlag. VejDim-rækker følger originalens normalisering og supplering med standardrækker. Nulstilling af ét diagram skal fortsat bevare de øvrige diagrammer.

I den kommende brugerflade bør gyldig celleafslutning følge almindelig tabelbetjening med Enter, Tab eller flytning til en anden celle. Midlertidig tekst under indtastning, fx et endnu ufærdigt tal, må ikke blive en utilsigtet ændring af beregningsgrundlaget. Gemmestatus skal kunne vises korrekt, og en mislykket fysisk gemning må ikke kaldes »Gemt«; konkret visning aftales ved designgennemgangen.

TypeScript-logikken for direkte opdatering og automatiske gemmehandlinger ligger i `src/engine/auto-edit.ts`. React-tabeleditor og fysisk lagring er endnu ikke tilkoblet.

## Forslag til næste forbedringer

Jeg anbefaler at vurdere R-002 og R-003 først. De kan passe til den valgte hurtige arbejdsgang uden at indføre en gem-knap.

| ID | I dag | Forslag | Ændring der skal godkendes |
| --- | --- | --- | --- |
| R-002 | Diagrammet markerer allerede afvigelser i den faste tabel. Materialesiden advarer om ændret phi. | Vis **standardværdi → ændret værdi** i relevante celler og filteret **Vis kun ændringer**. Bevar markeringerne under direkte redigering. | Ny visning og filtrering; ingen nye faglige grænser. |
| R-003 | Nulstilling findes for et diagram/alle diagrammer, materialelisten og VejDim-kørslerne. Der er ingen fælles fortryd-funktion. | **Fortryd/Gentag** i den aktive session og **Gendan denne celle/række** uden at miste andre ændringer. Et fortryd-trin anvendes og gemmes automatisk ligesom en almindelig redigering. | Nye handlinger og historik. Omfang, navigation og nulstilling af historik skal aftales. |
| R-004 | Separate tabelvisninger; VejDim har allerede låste T-/Eu-kolonner og beregnede totaler. | Ens tastaturbetjening, søgning og indsætning af et celleområde fra Excel. | Masseændringer/import er nye funktioner. En særskilt importkontrol kan være nyttig, men må ikke indføre gem-knapper i almindelig celleredigering. |
| R-005 | Ét aktuelt sæt brugerredigerede data ligger i JSON-filer ved appen. | Navngivne **dataprofiler**, fx »Standard« og »Projekt A«, med versionsnummer knyttet til beregning og rapport. | Ny datamodel; kræver aftale om ejerskab, adgang, lagring og eksisterende data. |

React gør det lettere at holde styr på aktuelle celler, vise ændringer og opdatere figurer uden at genkøre hele siden. TypeScript hjælper med ensartede felter mellem tabeller, beregning og rapport. Beregningsmetoden og faglige grænser bevares.

## R-002–003 — eksempel fra materialer

En bruger ændrer friktionsvinklen for et materiale og retter bemærkningen for et andet. Begge ændringer bliver aktive og gemmes automatisk. Visningen kan fremhæve de to ændrede felter med deres standardværdier. »Gendan friktionsvinkel« ville kun føre det valgte felt tilbage til den indbyggede standard, mens bemærkningen bevares. »Fortryd« ville føre det seneste trin tilbage til værdien før trinnet, som også kan have været brugerredigeret.

Skeln mellem **fortryd et trin** og **gendan standard**. Materialernes eksisterende grænser, normalisering, unikke navne, lagtyper og genopfyldning af manglende felter ændres ikke af de foreslåede visninger.

Et permanent internt materiale-ID kan være nyttigt ved omdøbning, men ændrer forbindelsen til lagvalg og skal behandles som et separat forslag.

## Diagramtabeller: bevar direkte kontrol

Bevar redigering af de konkrete Eu-rækker. Bevar skellet mellem **tomt felt (ingen diagramværdi)** og **tallet 0**, samt markeringen af direkte aflæste kontra interpolerede standardpunkter. Et tomt felt må ikke automatisk udfyldes eller interpoleres ved almindelig tabelredigering.

En editor til få kurvepunkter med automatisk genopbygning af alle mellemliggende rækker kan være et senere alternativ. Det er en større ændring: i dag ændrer en redigering den konkrete celle direkte. En kurveeditor kan ændre mange rækker og kræver en særskilt aftale om interpolation, dækning og kontrolcases. Jeg anbefaler at beholde den direkte tabelredigering i første migrationsudgave.

Bevar den oprindelige scanning ved siden af kurven fra de aktive tabelværdier. Figurer, farver og markeringer godkendes ved designgennemgangen.

## R-004 — VejDim og import

En kompakt visning kan fokusere på T, Eu, SG, BL og ubundet total, med de øvrige eksisterende felter som detaljer. Ingen felter fjernes. Afledte totaler forbliver beregnede og må ikke overskrives af import.

Excel-indsætning bør have et præcist kolonnematch og en aftalt behandling af ugyldige celler. Ukendte kolonner må ikke få en gættet betydning. Den nuværende semikolonseparerede VejDim-CSV er en eksport; import er en ny funktion og skal aftales særskilt.

Nye faglige kontroller, fx monotone kurver eller ændrede tykkelsesgrænser, er ikke en del af den valgte arbejdsgang. De kan ændre accepterede data og kræver egen godkendelse.

## Kontrol

B-017 kontrolleres med direkte gyldige ændringer, afviste materialer/diagramrækker, uændrede værdier, nulstilling af ét diagram og VejDim-nulstilling. En konkret test følger en gyldig diagramændring til et nyt aktivt dimensioneringsresultat uden et særskilt anvendelsestrin. Browserprøver og fysisk gemning følger, når brugerflade og lagring er koblet til.

Den tidligere foreslåede kladde med Anvend/Kassér blev fravalgt i A-007. Brugerens direkte redigering og automatisk gemning er den gældende retning.
