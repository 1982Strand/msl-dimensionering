# Migrationsplan — udkast til fælles gennemgang

Oprettet 29. september 2026. Faser og acceptkriterier er foreslåede, medmindre de fremgår som aftalt i beslutningsloggen.

## Status efter første udførelse

- **Fase 0, delvist udført:** kildeversion fastlagt; brugeren har valgt indbyggede standarder (B-008). Adgang, personlige/fælles data og arkitektur er ikke besluttet.
- **Fase 1, i gang:** 13 aktive Python-filer er statisk registreret med 426 funktioner og 98 widget-kald. Alle otte navigationssider er besøgt i appens testmiljø. Detaljeret funktionsmatrix og konkrete fund foreligger. Datatabelredigering, samtlige hjælpelinks og alle rapportvalg kræver yderligere kontrol.
- **Fase 2, i gang:** 2.062 core-cases og 24 snapshots af appforløb er registreret og genkørt uden forskelle. Desuden er 8 originale figurers data registreret fra 4 scenarier. Ti rapportcases er dannet som original DOCX/Word-PDF og prototype-PDF gennem TypeScript/Typst. Dynamisk indhold er kontrolleret; Standard-casens tre sider i begge motorer er visuelt gennemgået. Tolerancer er ikke indført. Browserkontrol, øvrige rapporters visuelle kontrol og LibreOffice/servertest udestår.
- **Fase 3–5:** afventer de relevante beslutninger; ingen nye visuelle løsninger er godkendt, og intet er offentliggjort.

Næste afhængige valg er arkitektur, jf. `ARKITEKTURVALG.md`. Rapportvurderingen foreligger i `RAPPORT_EVALUERING.md` og `TYPST_AFPROEVNING.md`. PDF som muligt primært format, Word-behovet og et konkret rapportdesign skal afklares før endelig implementation. Der kan fortsat arbejdes på referencecases og kortlægning uafhængigt af dette valg.

## Mål og afgrænsning

Den eksisterende app omskrives til en brugerflade med React, TypeScript, Vite og shadcn/ui. Beregninger og funktionalitet skal bevares. Om beregningsmotoren også skal flyttes fra Python til TypeScript, er et åbent arkitekturvalg.

Migreringens første leverance er dokumenteret overensstemmelse med den godkendte gamle app. Forbedringer vurderes enkeltvis sammen med brugeren og skal kunne spores til en konkret godkendelse.

## Fase 0 — reference og rammer

Udført: brugeren har valgt den aktuelle gamle app efter commit/push som reference (`a330cfd6734ac2478be1304a362c69f94e412d25`). Kildearkiv, eksisterende lokale JSON-data, miljøoplysninger og kontrolsummer er bevaret lokalt under `reference-private/a330cfd/`. Brugeren ønsker arkitekturvalget afklaret efter kortlægningen. De øvrige punkter nedenfor er fortsat åbne.

- Vælg referenceversion: lokal arbejdskopi, GitHub-version eller en bestemt version.
- Medtag relevante brugerdefinerede materialer, diagrammer, korrelationer og indstillinger i beslutningen. En Git-commit alene beskriver ikke den aktuelle lokale app.
- Gem en reproducerbar reference med commit, lokale ændringer, filkontrolsummer, afhængigheder og nødvendige skabeloner/data. Lokale metadata holdes uden for Git.
- Afklar hvad »offentliggøres« betyder: åben app, login, adgang til redigering af grunddata, personlige kontra fælles indstillinger og behov for offlinebrug.
- Sammenlign TypeScript-motor og bevaret Python-motor med hensyn til efterprøvning, rapporter og drift. Teknologistakken for brugerfladen er allerede valgt.

Godkendelse: referencegrundlag og arkitektur. Dette ændrer ikke i sig selv den gamle funktionalitet.

## Fase 1 — komplet funktionsfortegnelse

- Gennemgå alle otte navigationssider og deres underfunktioner, herunder Standard og Brugerdefineret dimensionering.
- Registrer inputs, tilladte værdier, standarder, afhængigheder, beregninger, mellemresultater, advarsler, fejl, gemning/nulstilling og rapportindhold.
- Kortlæg logik og tilstandsændringer i `app.py` samt data og skabeloner uden for beregningsmotoren.
- Giv hver funktion et stabilt ID og forbind det til gammel kode, referencecase, ny implementation og kontrolstatus.
- Gennemgå den foreløbige fortegnelse sammen med brugeren. Uafklarede eller sjældent brugte funktioner må ikke udgå stiltiende.

Godkendelse: omfang og identificerede afklaringspunkter.

## Fase 2 — referencecases og kontrolgrundlag

Kør cases i den godkendte gamle app før tilsvarende ny kode skrives. Gem input, data/indstillinger, forventede mellem- og slutresultater samt advarsler og relevante figurer/rapporter.

Minimumsdækning foreslås som:

- Belastningsklasse og trafikklasse; Standard og Brugerdefineret.
- Uarmeret, ét og to geonetlag; produktvalg, produktgrupper og manuel armering.
- Diagramknuder, mellemliggende opslag og begge sider af gyldighedsgrænser, herunder manglende værdier og regler uden for diagramområdet.
- Alle oprundingstrin, friktionsvinkelregler, minimumstykkelser, fordelinger og regler for tynde restlag.
- Geonetplacering, dæklag, afstande, overlæg og ugyldige opbygninger.
- mm/cm, decimaler, viste reduktioner og præcise værdier bag oprundingen.
- Redigerede tabeller og indstillinger; manglende/ugyldige gemte data; nulstilling og genåbning.
- Rapporter med valgte snit, metadata, redigerede tekster og relevante eksportformater.
- Hele brugerforløb, herunder ændring af input efter et tidligere resultat, navigation og genindlæsning.

Accept: samme diskrete udfald, gyldighed, advarsler, oprundede og viste værdier. Interne flydende tal får kun tolerance efter særskilt aftale; tolerancen må aldrig skjule ændret lagtykkelse, grænseafgørelse eller produktvalg. Python- og JavaScript-afrunding kontrolleres udtrykkeligt ved en portering.

Godkendelse: repræsentative faglige cases og eventuelle numeriske tolerancer. Sammenfald med den gamle app dokumenterer migrationskorrekthed, ikke automatisk en selvstændig faglig validering af den gamle metode.

## Fase 3 — design og opbygningsvisualisering

Der udarbejdes konkrete udkast på realistiske, syntetiske referencecases. Afklar først om eksisterende identitet videreføres, eller om et nyt MSL-design ønskes.

To separate godkendelser:

1. Appdesign: navigation, sidestruktur, formularer, tabeller, resultater, fejl/advarsler, typografi, farver og relevante skærmstørrelser.
2. Opbygningsvisualisering: lagrækkefølge, materialer, skalering, geonetlinjer, mål, enheder, labels, signaturer og visning af gyldige/ugyldige snit på skærm og i rapport.

Forslag om ændrede arbejdsgange er også funktionelle ændringer og skal beskrives som sådanne. Et godkendt visuelt udkast giver ikke tilladelse til at ændre beregningsregler.

## Fase 4 — implementering i afgrænsede dele

Efter de relevante afklaringer opsættes React/TypeScript/Vite/shadcn/ui med låste afhængigheder, typekontrol og automatiske kontroller. Domænelogik, data, brugerflade og rapportgenerering adskilles, så hver del kan kontrolleres mod referencen.

Foreslået rækkefølge:

1. Datamodeller, opslag, beregninger og validering.
2. Indstillinger, lagfordeling, produktvalg og dimensioneringsforløb.
3. Godkendt brugerflade, diagrammer og opbygningsvisualiseringer.
4. Redigering/gemning af data, hjælp, rapporter og eksport.

Hver del afsluttes med sammenligning mod referencecases og opdatering af funktionsfortegnelsen. Referenceforventninger må ikke ændres for at skjule en forskel. Eventuelle godkendte forbedringer får egne cases og henvisning til beslutningsloggen.

## Fase 5 — samlet accept og offentliggørelse

- Gennemfør alle referencecases og komplette brugerforløb fra input til rapport.
- Gennemgå beregning, figur og rapport for de samme cases med brugeren.
- Kontroller de aftalte browsere/skærmstørrelser, tilgængelighed, lagring og adskillelse af brugerdata.
- Kontroller drift af rapporteksport på det valgte hostingmiljø.
- Lever en oversigt over funktionsdækning, godkendte afvigelser, åbne punkter og kontrolresultater.
- Aftal versionsmærkning, udgivelse og mulighed for at vende tilbage til tidligere version.

Offentliggørelse følger først efter brugerens accept af den konkrete version og de aftalte kontroller. Hosting og offentlig adgang er endnu ikke valgt.

## Procedure for forbedringer

Beskriv eksisterende adfærd med en konkret case, foreslået ny adfærd, begrundelse, påvirkede resultater/arbejdsgange/figurer og kontrolmetode. Forelæg dette for brugeren. Registrer godkendelse eller afvisning før den ændrede adfærd indføres.

Rutinemæssig intern strukturering kan udføres uden ekstra godkendelse, når den bevarer den aftalte adfærd og kontrolleres mod referencen.
