# Beslutninger for den selvstændige app

## 10. oktober 2026 — oprydning og offentliggørelse

Brugeren ønsker oprydning af det eksisterende repo og offentliggørelse efter gennemgang. Historiske interne dokumenter og værktøjer bevares i et privat lokalt arkiv. Godkendte beregningscases bevares som den aktuelle apps tests; kildehenvisninger og migrationsmetadata fjernes, mens input og forventede resultater bevares.

Kun Cloudflare anvendes. Den anden hostingopsætning udgår. Cloudflare er midlertidig og skal kunne fjernes uden ændringer i beregningsmotor eller lokal brug.

Brugerens svar på planen: »Det er fint, gå videre. oplist din plan i punktform og lav en statusopdatering hver gang en opgave er fuldført, så vi ved hvad der mangler«.

Historikvalget: »Start en ren historik i samme repo, og bevar den gamle historik lokalt«.

Dette registrerer opgaven og den godkendte ramme. Det er ikke en påstand om, at GitHub-historikrensning eller offentliggørelse allerede er afsluttet.

Efter oplysning om, at GitHub kan bevare gamle commits og PR-henvisninger, bekræftede brugeren: »det er fint, gør det bare offentligt efter oprydningen«. Offentliggørelse af det eksisterende repo er dermed godkendt med denne begrænsning.

## 19. oktober 2026 — oprundingstrin på 5 mm

Rullemenuen Oprundingstrin på Indstillinger udvides med 5 mm (1, 5, 10, 50, 100 mm). Standarden er uændret 50 mm. Brugerens svar: »Du må gerne tilføje et afrundingstrin på 5 mm i rullemenuen på indstillingssiden«. De forventede valgmuligheder i `tests/cases/` er udvidet tilsvarende; øvrige input og forventninger er uændrede.

## 19. oktober 2026 — valg af minimumsklasse ved dimensionering efter trafikklasse

Ligger opslagspunktet Eₒ,ækv mellem to belastningsklasser, anvendte appen altid minimumstykkelsen for den højeste. Under Indstillinger, afsnit 3, kan der nu vælges mellem den højeste (standard, uændret adfærd) og den laveste af de to klasser. Ligger Eₒ,ækv præcis på en klasse, anvendes denne uanset valget. Valget gælder kun ved dimensionering efter trafikklasse. Brugerens ønske: »kan vi ikke lave det til en indstilling, om man vil anvende den minimumstykkelse der hører til den højeste eller laveste af de to belastningsklasser«. De forventede indstillingsværdier og tekster i `tests/cases/` er udvidet med den nye nøgle og tekst; øvrige input og forventninger er uændrede.

## 19. oktober 2026 — fordelingsvalget »Det øverste lag sættes til minimumstykkelsen«

Indstillinger, afsnit 3, får et fjerde fordelingsvalg, der kun gælder Brugerdefineret. I opbygningerne med geonet sættes det øverste lag til minimumstykkelsen for klassen, dog højst den samlede tykkelse, og geonettets reduktion tages alene i de underliggende lag. Standard og klassisk Standard er uændrede, og de eksisterende valg giver samme resultater som før. Minimumsklassen findes som for de øvrige valg, også ved trafikklasse.

Brugerens svar efter gennemgang af eksempler:
- Den ustabiliserede opbygning: »kun på de geonet-reducerede opbygninger«. Den fordeles proportionalt, dog mindst minimumstykkelsen (A1).
- Sammenlægning af tynde lag (afsnit 4) virker som i Standard og kan gøre det viste øverste lag tykkere end minimum (B1).
- Placering og tekst som fjerde valg i afsnit 3: »enig«.

Brugerens samlede godkendelse: »Byg med A1 (ustabiliseret: proportionalt, dog mindst minimum) og B1 (sammenlægning virker som i Standard). Få Codex til at gennemgå det.« Hjælpetekstens forventede reference i `tests/cases/pages-cases.json` er opdateret med den nye tekst. Øvrige input og forventninger er uændrede, og der er tilføjet nye tests.

## 20. oktober 2026 — opfølgning på gennemgang af indstillingerne

En statisk gennemgang af indstillingerne gav ni fund. Efter efterprøvning i motoren blev fire forelagt brugeren som ændringer i virkemåde. Brugerens svar: »ja til alle fire, start med fund 6«.

1. **Ældre gemte sessioner.** En gemt session, der mangler en indstillingsnøgle fra en senere version, indlæses med standardværdien for nøglen. Tidligere blev hele sessionen afvist, og appen kunne ikke bruges, fx efter indførelsen af minimumsklassen 19. oktober. Gemte nøgler skal fortsat genindlæses uændret; ugyldige værdier, ukendte nøgler og forkerte typer afvises som før. Materialer, designdiagrammer og kørselsrækker skal fortsat svare nøjagtigt.
2. **Oprunding ud fra den beregnede tykkelse.** Oprundingen til trin sker ud fra den lagtykkelse, der først er afrundet til hele mm. Fx giver 600,2 mm 600 mm ved 50 mm-trin, ikke 650 mm. Brugeren godkendte først, at oprundingen skulle ske ud fra den uafrundede tykkelse, efter at konsekvenserne var opgjort. Opgørelsen viste 10 af 3055 godkendte tests med andre resultater. 13 viste tykkelser blev større, og φ ændrede sig i tre cases med iterativ φ. Desuden blev oprundingen i én mellemregning vist som tillæg for mindste lagtykkelse, fordi forklaringerne regner ud fra de mm-afrundede værdier. Anbefalingen var at bevare beregningen og præcisere hjælpeteksten, da forskellen højst er 0,5 mm i den beregnede tykkelse. Brugerens svar: »ja til begge«. Hjælpeteksten i kapitel 1, afsnit 7 angiver nu T som den beregnede lagtykkelse afrundet til hele mm, og den forventede reference i `tests/cases/pages-cases.json` er opdateret tilsvarende. Beregningen er uændret.
3. **VD-krav, der ikke kan opfyldes.** Kan de underliggende lag ikke gøres mindst så tykke som VD's mindste lagtykkelse inden for søgeområdet på 3000 mm, vises en advarsel under Kontrolpunkter i stedet for, at opbygningen tavst fremstår som opfyldt. Tykkelserne ændres ikke. Den ustabiliserede opbygning får linjen »Ustabiliseret opbygning: …«, og geonetopbygningen får linjen »‹geonet› ved 1 [og 2] lag geonet: …« med teksten: »De underliggende lag kan ikke gøres mindst så tykke som VD's mindste lagtykkelse inden for 3000 mm over den oprundede lagtykkelse. Den angivne opbygning opfylder ikke valget under Indstillinger, Underliggende lag.« Kontrolpunkterne indgår ikke i rapporten. Brugerens godkendelse af tekst og opdeling: »ja til begge«.
4. **Hjælpetekst.** Oprundingstrinnet 5 mm tilføjes i listen i hjælpetekstens kapitel 1, afsnit 7, jf. beslutningen af 19. oktober. Hjælpetekstens forventede reference i `tests/cases/pages-cases.json` er opdateret med samme tilføjelse; øvrige input og forventninger er uændrede.

## 22. oktober 2026 — minimum for indtastede lagtykkelser

Indtastede lagtykkelser i Brugerdefineret kan være fra 100 mm for alle lagtyper. Når et indtastet lag er tyndere end VD's mindste lagtykkelse for lagtypen under Indstillinger, Underliggende lag, vises en advarsel under Kontrolpunkter; tykkelsen ændres ikke. Advarslen afhænger ikke af valget af restlag, og der indføres ingen kornstørrelsesregel. Brugerens godkendte beslutning: »100 mm for alle lagtyper, med advarsel når et indtastet lag er under VD's mindste lagtykkelse for sin lagtype (fra Indstillinger). Ingen kornstørrelsesregel nu. Testforventningerne må opdateres.«

Den forudgående konsekvensanalyse viste, at beregningerne ikke kræver andre ændringer: de indtastede tykkelser indgår i φᵥ og i lagenes andele, mens klasseminimum, geonettets dæklag og netafstand samt VD-minimum er uændrede. Feltets grænsetest i `tests/browser/acceptance-gaps.spec.ts` og hjælpeteksten i `tests/browser/dimensioning-page.spec.ts` og `tests/cases/dimensioning-page*-cases.json` er opdateret til 100 mm; øvrige input og forventninger er uændrede.

## 22. oktober 2026 — konsekvensboks for afrundingsvalgene

Under Indstillinger, afsnit 1 »Afrunding«, viser boksen nederst nu konsekvensen af afsnittets valg for den aktuelle dimensionering i stedet for det faste eksempel med 532 mm. Tabellen sammenligner de valgte indstillinger med standardindstillingerne (oprundingstrin 50 mm, reduktion af de oprundede lagtykkelser, ingen parentes, ingen afrunding af φᵥ) og viser forskellen for den nødvendige tykkelse uden geonet, 1 og 2 lag geonet, reduktionen i mm og % samt, i Brugerdefineret, φᵥ og kφ for den indtastede opbygning. Kan opbygningerne efter valget i afsnit 5 regnes med en anden φᵥ, oplyses det under tabellen. Øvrige indstillinger er de samme i begge kolonner. Tallene hentes fra samme beregning som resultatkortene på Dimensionering, og tykkelser vises med beregnet værdi i parentes, når det er valgt. Standard regnes med φᵥ = 37° og berøres ikke af φᵥ-afrundingen. Uden et gyldigt resultat vises det hidtidige eksempel.

Brugerens ønske: »kan man ikke lave det sådan, at boksen viser konsekvensen af ens valg i denne sektion, ud fra hvad der er lavet i dimensioneringen?« Efter forslag med skitse valgte brugeren: »Byg boksen, men vis også en sammenligning med standardindstillingerne (50 mm, oprundede tykkelser, ingen φᵥ-afrunding), så forskellen fremgår direkte.« Browsertestens forventning efter valg af 100 mm i `tests/browser/settings.spec.ts` kontrollerer nu boksen i stedet for eksemplet. `tests/cases/` er uændret, og der er tilføjet nye tests.

## 22. oktober 2026 — konsekvensboks for fordelingsvalget

Til højre for fordelingsvalget i Indstillinger, afsnit 3, vises lagtykkelserne fra den aktuelle dimensionering for det valgte fordelingsvalg. Boksen opdateres straks ved ændringer i fordelingsvalget eller andre indstillinger. I Standard regnes eksemplet på sessionens Brugerdefineret-opbygning, og boksen forklarer dette. Tallene genbruger opbygningsfigurens konstruktionstal; dimensioneringsberegningerne ændres ikke.

Brugerens ønske: »kan man her lave en lille eksempel-boks til højre for valget af fordeling af lagtykkelser? Altså, så man også her kan se konsekvensen af ens valg direkte, ud fra hvad der er i dimensioneringen?« Efter forslag med skitse og prøveberegning af de fire valg valgte brugeren: »Byg boksen til højre for fordelingsvalget med kun den valgte fordeling, som skitseret. Standard-tilstand: brug Brugerdefineret-opbygningen med en note.« Boksen viser én række pr. opbygning (indtastet, uden geonet, 1 og 2 lag geonet) med tykkelsen pr. materialelag og i alt. `tests/cases/` er uændret, og der er tilføjet nye tests.

## 22. oktober 2026 — fastholdt øverste lag uden klasseminimum

Ved fordelingsvalget »Det øverste lag fastholdes på den indtastede tykkelse« har det øverste lag nu præcis den indtastede tykkelse, oprundet til indbygningstrin, i alle beregnede opbygninger. Det løftes ikke længere til minimumstykkelsen for klassen. Formlen er t₁ = min(T; t₁,ind). De øvrige fordelingsvalg holder fortsat det øverste lag på mindst minimumstykkelsen, og fluebenet »Den samlede bærelagstykkelse sættes mindst til minimumstykkelsen« gælder fortsat. Er lagene angivet i procent, er virkemåden uændret. Sammenlægning af tynde lag (afsnit 4) virker som ved de øvrige valg og kan gøre det viste øverste lag tykkere; det er tilføjet i hjælpeteksterne efter Codex' kontrol.

Anledning: Med 170 mm stabilgrus i belastningsklasse 5 blev det øverste lag vist som 275 mm. Brugerens spørgsmål: »Burde indstillingen ' Det øverste lag fastholdes på den indtastede tykkelse' ikke slå igennem på resultaterne? Altså, så stabilgruset bare skulle være 170 mm tyket og ikke 275 mm?« Efter forklaring af den hidtidige regel svarede brugeren: »Ja: øverste lag fastholdes på præcis den indtastede tykkelse uden klasseminimum. Samlet minimum gælder fortsat. Opdatér hjælpetekster og beslutninger, og få Codex til at kontrollere.« Ingen godkendte beregningsforventninger ændres. Feltets hjælpetekst, teksten om minimumstabellen i afsnit 3 og hjælpens kapitel 6 er opdateret, og de forventede tekster i `tests/cases/pages-cases.json`, `settings-page-cases.json` og `settings-ui-cases.json` er opdateret tilsvarende. Der er tilføjet nye tests.

## 22. oktober 2026 — rapportsidens trin 2 og 3

På Rapport er fire ændringer gennemført efter brugerens ønske:

1. Uden indtastet opbygning, dvs. i Standard, er linjen »Samlet tykkelse af valgt opbygning« under Dimensioneringsresultat låst og udtonet med hjælpeteksten »Gælder kun Brugerdefineret med indtastet opbygning.« Linjen udelades da altid af rapporten, også hvis den tidligere var valgt. Brugerdefineret er uændret.
2. Ved opbygningsfiguren i trin 3 kan signaturforklaringen under figuren til- og fravælges for rapporten (»Vis signaturforklaring under figuren«). Udgangspunktet er valget under Indstillinger, afsnit 2. Figuren på Dimensionering og indstillingen er uændrede.
3. Trin 3 hedder »Figurer og diagrammer« i stedet for »Gennemsyn«.
4. Opsummeringen »Sådan bliver siderne« er fjernet; trin uden opsummering viser ikke et tomt felt.

Brugerens ønske: »kan man gøre sådan, at når man har valgt 'standar' beregningen, så kan man ikke vælge eller fravælge 'samlet tykkelse af valgt opbygning' da den jo kun hører til 'brugerdefineret' tilstanden. (Ligesom 'Vis endepunkter for 1/2 lag i designdiagram' bliver udtonet hvis der mangler afkrydsning i 'Personligt designdiagram'). Derudover, oppe i 'Gennemsyn', gør det til en valgmulighed om man vil have vist signaturforklaringen i bunden. Desuden skal 'Gennemsyn' omdøbes til 'Figurer og diagrammer'. Til sidst, skal 'sådan bliver siderne' bare slettes«. At signaturvalget tager udgangspunkt i indstillingen, er valgt af Claude og kan ændres. De forventede sidemodeller i `tests/cases/report-page-cases.json` er opdateret med den nye titel, den fjernede opsummering, det nye valg og den låste linje; beregningsværdier er uændrede. Der er tilføjet nye tests.

## 27. oktober 2026 — gem og indlæs det enkelte designdiagram som fil

På Designdiagrammer har hvert diagram knapperne »Gem diagram« og »Indlæs diagram …« på samme linje som »Tilføj række«. Gem henter det viste diagrams aktuelle værdier som JSON-filen `designdiagram-N.json`. Indlæs erstatter det viste diagrams rækker med filens rækker som én ændring, der kan fortrydes, og som gemmes automatisk i browserens samlede session som andre rettelser. De øvrige diagrammer berøres ikke. Direkte redigering og automatisk gemning i browseren er uændrede.

Filen indeholder `format`, `version`, `diagram_id`, `diagram_nr`, `eo`, `klasse` og `rows`. Id'et er fast for hvert diagram, fx `msl-designdiagram-4-eo80-klasse4`, og en fil kan kun indlæses i det diagram, den er gemt fra. Indlæsningen afvises med en besked, og intet ændres, hvis filen er gemt fra et andet diagram, har et andet format eller en anden version, er tom, har ukendte felter, mangler Eᵤ, har dobbelte Eᵤ eller har værdier, der ikke er tal fra 0 eller tomme (null). Værdier omregnes ikke. Den gamle samlede fil `designdiagrammer_brugerdefineret.json` kan ikke indlæses.

Anledning: Brugeren spurgte, om rettelser foretaget lokalt kommer med, når andre åbner appen via Cloudflare-linket. Rettelserne ligger kun i den enkelte browser. Brugerens ønske: »ok. så vil jeg gerne lave funktionen. man skal stadig kunne redigere som man har lyst, som gemmes lokalt i den samlede fil. man skal kunne gemme diagrammer enkeltvist og indlæse diagramværdier enkeltvist (json format). Der skal være et eller andet unikt id for de gemte filer, så man ikke kan indlæse en fil fra diagram 4 ind i diagram 5 fx. knapper til gem og indlæs skal stå på samme linje som 'Tilføj række' ved hvert diagram.« Filnavn, id'ets opbygning, knappernes tekst og afvisningsreglerne er valgt af Claude og kan ændres. `tests/cases/` er uændret, og der er tilføjet nye tests.

## 2. november 2026 — rapport på svensk med tekster pr. sprog

Rapporten skal kunne genereres som PDF på svensk. Appen forbliver på dansk; kun PDF-rapporten får et sprogvalg. Beregninger, gyldighedsområder, afrundinger og advarsler er uændrede. Brugerens ønske: »I rapport-delen, vil jeg gerne indføre muligheden at få rapporten på svensk. Appen i sig selv skal stadig være på dansk, det er bare rapporten jeg gerne vil have mulighed for at generere en pdf på svensk.«

Redigerede tekster gemmes pr. sprog. Hvert afsnit har en dansk og en svensk tekst. En rettelse på det ene sprog ændrer ikke det andet, og Nulstil går til standardteksten på det valgte sprog. Rettede tabellinjer gemmes ligeledes pr. sprog. Er et afsnit rettet på det ene sprog, men ikke på det andet, vises en markering ved afsnittet. Brugerens svar på forslaget om én tekst pr. sprog eller én fælles tekst: »Tekst pr. sprog«. Markeringen og tabellinjerne pr. sprog indgik i forslaget og er formuleret af Claude.

Det svenske omfatter rapportens faste overskrifter og etiketter, tabellinjerne, figurernes tekster, standardteksterne, standardmaterialerne og firmaprofilens tekster. Figurerne tegnes som på skærmen med samme opbygning; kun teksterne skifter. Den danske rapport skal være uændret, og `tests/cases/` ændres ikke.

Brugerens svar på de opfølgende spørgsmål:

- Svenske tekster: »Claude skriver udkast«. Claude skriver et komplet udkast til de svenske tekster, og en svensk fagperson læser det igennem, før det tages i brug. Indtil da er de svenske tekster et udkast.
- Firmaprofilen: »Alt i svensk udgave«. Profilen får svenske udgaver af titel, slogan, by, afsnitsoverskrifter og en særskilt svensk sidefod, fx med svensk adresse og telefon.
- Datoformat i den svenske rapport: »2 november 2026«, altså dato med svensk månedsnavn.
- Placering: »Øverst på rapportsiden«, over trin 1, fordi valget skifter teksterne i trin 2 og figurerne i trin 3. Valget huskes som de øvrige rapportvalg.

Brugeren har leveret et svensk eksempel, »Dimensioneringsparadima - väg 150317-SE.docx« (BG Byggros AB, 2017). Det bruges som kilde til terminologi, slogan og sidefod. Opfølgende svar:

- Indhold: »De nuværende danske«. De svenske standardtekster er en oversættelse af de gældende danske standardtekster. Hvor 2017-dokumentet afviger fagligt, fx »minst 95 %« mod »middel 95 % og mindst 92 %« og »upp till flera år« mod »op til et år«, følges den danske tekst.
- Sidefod: »Ja, brug den«. Standarden for den svenske sidefod er »BG Byggros AB | Levins väg 4 | SE-291 73 Önnestad | Tel: +46 771 48 9000 | www.byggros.com«, og byen i underskriften er Önnestad. Begge kan rettes i firmaprofilen.
- Firmaprofilen: »Profilen følger sprogvalget«. Felterne for titel, slogan, sidefod, by og afsnitsoverskrifter viser dansk eller svensk efter det valgte rapportsprog. Afsnittenes rækkefølge er fælles for begge sprog; det er Claudes valg.
- Sprogvalget: »To valgknapper«, dvs. »Rapportsprog: Dansk / Svensk« som radioknapper på én linje under fanerne Rapport og Firmaprofil, så valget også ses i firmaprofilen.
- Tal over 1000 i den svenske rapport: »skriv bare tallet ud, altså fx '1230 mm'«, dvs. uden tusindtalsseparator. Den danske rapport skriver fortsat »1.230 mm«.

Claudes valg, som kan ændres: I Standard får figurens lag i den svenske rapport navnene »Obundet bärlager« og »Förstärkningslager« i stedet for »Stabilgrus« og »Bundsikring«. Standardmaterialerne i tabellen er de samme to navne. I Brugerdefineret står materialenavnene, som de er indtastet i appen, også i den svenske rapport.

Gennemført 2. november 2026. Sprogvalget gemmes i `rap_sprog`. De danske nøgler er uændrede, mens de svenske tekster, linjerettelser og standardmaterialer gemmes i `rap_tekst_sv_…`, `rap_linje_sv_…` og `rap_std_materiale_sv_…`. Firmaprofilen har feltet `sv` med de svenske udgaver af titel, slogan, sidefod, by og afsnitsoverskrifter. Profiler fra før ændringen kan stadig indlæses og importeres og får de svenske standardværdier. Den danske rapport er byte-identisk med før (R3 og R6), og `tests/cases/` er uændret.

Claudes valg, som kan ændres:

- Markeringen vises på det sprog, der stadig har standardteksten: står man på svensk, og afsnittet kun er rettet på dansk, viser udvideren »Rettet på dansk« og en forklarende linje. På det sprog, der er rettet, vises intet mærke. Ellers ville alle danske rettelser få et mærke, også hos brugere, der aldrig bruger svensk.
- »Nulstil tekster og valg til standard« nulstiller tekster, rettelser og valg på begge sprog, men beholder sprogvalget.

Offentliggørelse: Brugeren blev spurgt, om ændringen skulle pushes, så den delte udgave får de svenske tekster, før en svensk fagperson har læst dem igennem. Brugerens svar: »Push nu«. De svenske tekster er derfor tilgængelige i den delte udgave som et udkast. Gennemlæsningen er stadig udestående.

## 2. november 2026 — tre udgaver: lokal, intern og offentlig

Appen skal findes i tre udgaver. Brugerens ønske: »Min tanke er, at vi skal have en udgave af appen som er offentlig, som lige skal 'trimmes' i forhold til hvad der er muligt at tilgå. […] Dvs. der i praksis vil være 3 udgaver: 1: Den lokale, på min maskine, 2: Den offentlige på hjemmesiden som alle og enhver kan tilgå og 3: Den udgave firmaets andre medarbejdere kan tilgå.« Beregninger, standarder, afrundinger og rapporter er de samme i alle udgaver; kun adgangen til funktioner er forskellig.

Claudes forslag, som brugeren svarede »ok« til: Én kodebase og én `main`. Udgaven vælges ved bygningen med `VITE_UDGAVE` (`intern` eller `offentlig`; uden værdi er det den lokale). En samlet tabel bestemmer, hvad hver udgave må, og siderne slår op i den. Brugerens tilføjelse: »så den lokale udgave bliver så 'administartor' udgaven«.

| | Lokal | Intern | Offentlig |
|---|---|---|---|
| Dimensionering | ja | ja | ja |
| Designdiagrammer, trafikklasse-korrelation, geonet-database | rediger | rediger | kun læs |
| Materialer | rediger | rediger | rediger |
| Indstillinger | alle | alle | kun visning |
| Import af enkelte diagrammer | ja | ja | nej |
| Rapport | ja | ja | nej |
| Firmaprofil | ja | nej | nej |
| Medarbejderkartotek | eget, i browseren | indbygget liste | — |

Intern udgave. Brugerens svar: »den interne synes jeg egentlig heller ikke skal have adgang til firmaprofilen, så de ikke kommer til at lave noget forkert i pdf-opsætningen. Jeg tænker jeg gerne vil have et standard medarbejder kartotek indlæst, så hvis man bruger den interne udgave kan man vælge en af de forudindstillede medarbejdere, eller selv skrive noget ind. Det skal i den interne udgave ikke være muligt at indlæse eller gemme noget i kartoteket. De medarbejdere der er 'tilgængelige' fra listen, vil være ud fra en liste som jeg gemmer lokalt.« Rapporten i den interne udgave bruger standardprofilen fra koden.

Kartotekets vej til den interne udgave: Brugerens svar: »GitHub-hemmelighed«. Listen gemmes lokalt hos brugeren, sendes med en kommando til GitHub som krypteret hemmelighed og bygges kun ind i den interne udgave. Den ligger ikke i Git. Det er en godkendt undtagelse fra B-048 og fra reglen om, at lokale brugerfiler ikke bliver indbyggede standarder; undtagelsen gælder kun kartoteket i den interne udgave. Alle, der logger ind på den interne udgave, kan se listen.

Adresse og login: Brugerens svar: »Ja, som foreslået«. Den nuværende adresse bliver den interne og kommer bag Cloudflare Access med engangskode til en byggros.com-mail. Den offentlige udgave får en ny adresse uden login. Access sættes op i Cloudflare-kontoen, ikke i appen; appen har fortsat ingen loginendepunkter.

Offentlig udgave: Brugerens svar: »Ja, som foreslået«. Under Indstillinger kan kun gruppen »Visualisering« og »Anfør den beregnede lagtykkelse i parentes efter den oprundede« ændres. Designdiagrammer, trafikklasse-korrelation og geonet-database kan kun læses. Enkelte diagrammer kan ikke indlæses. Det personlige designdiagram kan bruges. Der er ingen rapport og ingen firmaprofil. Opfølgende rettelse fra brugeren: »forresten, 'Materialer' skal være muligt at redigere i den offentlige udgave.« Materialer kan derfor rettes i alle tre udgaver.

Forbehold, som brugeren er gjort opmærksom på: Begrænsningerne er en visningsindstilling, ikke en sikkerhedsgrænse. Appen kører i browseren, og kildekoden er offentlig på GitHub. Den interne udgave beskyttes af login foran den.

Claudes valg, som kan ændres:

- Låste værdier bruger standarden. Den offentlige udgave ser bort fra gemte ændringer af låste data og indstillinger, så ingen regner med ændringer, de ikke kan se eller nulstille.
- I den offentlige udgave skjules både »Gem diagram« og »Indlæs diagram …«, fordi diagrammerne ikke kan rettes.
- Den interne udgave bruger ikke længere det kartotek, kolleger har gemt i deres browser. Den bruger kun den indbyggede liste.
- Byggejobbet lægger kun listen ind i den interne udgave, når den interne adresse kræver login. Ellers bygges den uden liste, og jobbet giver en advarsel.
- Begge online-udgaver beder fortsat søgemaskiner om ikke at vise dem (`noindex`), indtil andet aftales.

Gennemført 2. november 2026. Udgavetabellen ligger i `src/ui/udgaver.ts`. `npm run build:udgaver` bygger `dist-intern` med en syntetisk testliste og `dist-offentlig`, og Playwright tester hver udgave for sig. Udrulningen bygger og udruller begge udgaver. Adresserne er ændret samme dag, se nedenfor. Kartoteket sendes med `npm run kartotek -- <fil>` som hemmeligheden `MEDARBEJDERE_JSON`. Den lokale udgave og den danske rapport er uændrede (R3 og R6 byte-identiske), og `tests/cases/` er uændret.

Claudes valg, som kan ændres:

- Teksterne »Tabellerne er appens standard og kan ikke rettes i denne udgave.«, »Kun visningsindstillingerne kan ændres; de øvrige er appens standard.« og, i den interne udgave, »Kartoteket er tomt. Oplysningerne skrives i felterne.«
- Kan udrulningen ikke nå den interne adresse, regnes den som ubeskyttet, og kartoteket udelades.

Adresser: Brugeren omdøbte den interne Worker i Cloudflare til `msl-dimensionering-intern` og spurgte: »kan man ikke lave et kortere navn der er lidt lettere?« Den gamle adresse virker derfor ikke længere. Claude foreslog at ændre kontoens workers.dev-underdomæne til `byggros` og bruge Worker-navnene `msl` og `msl-intern`. Brugerens svar: »msl / msl-intern på byggros«. Offentlig: https://msl.byggros.workers.dev. Intern: https://msl-intern.byggros.workers.dev. Det ændrer det tidligere svar om, at den nuværende adresse bliver den interne. Browserlageret følger adressen, så gemte værdier fra den gamle adresse kommer ikke med.

## 2. november 2026 — opsætningsfil for den offentlige udgave

Brugeren spurgte: »Hvad med styring af hvad der vises, hvilke indstillinger der skal være tilgængelige og hvordan opsætningen skal være i den offentlige udgave, hvordan styrer jeg det?« Claude foreslog én opsætningsfil for den offentlige udgave, lavet i den lokale udgave. Brugerens svar: »Ja, byg den«.

Indhold af forslaget:

- Filen ligger i projektet og samler den offentlige udgaves funktioner, listen over indstillinger, der kan ændres, og faste værdier for indstillingerne. Kun værdier, der afviger fra appens standard, står i filen. Filen indeholder ingen persondata og ligger i Git. Det er en godkendt undtagelse fra reglen om, at lokale brugerfiler ikke bliver indbyggede standarder; den gælder kun den offentlige udgaves indstillinger.
- I den lokale udgave kan de aktuelle indstillinger eksporteres som opsætning for den offentlige udgave. Filen kontrolleres, før den tages i brug, og en ugyldig opsætning kan ikke bygges.
- Teksten i den offentlige udgave ændres fra »de øvrige er appens standard« til, at de øvrige er faste i denne udgave.
- Designdiagrammer og trafikklasse-korrelation følger fortsat appens standard i alle udgaver, fordi de er de godkendte beregningsdata.

## 2. november 2026 — hjælpen følger den offentlige udgaves opsætning

Brugeren spurgte: »kan man gøre sådan, at hjælp-sektionen tilpasses automatisk, alt efter hvad der er valgt af indstillinger, kun for den offentlige udgave? Altså, så der ikke beskrives indstillinger man alligevel ikke kan vælge? Fx hvis jeg i afsnit 3 i indstillingerne har valgt fordelingen af lagtykkelserne til: 'proportiponalt, dog mindst minimumstykkelsen for det øverste lag', så skal der ikke i hjælp, sektion 6.2 stå der kan vælges imellem fire fordelinger..« Claude foreslog at mærke hjælpeteksterne op én gang, så den offentlige udgaves hjælp derefter følger opsætningsfilen automatisk. Brugerens svar: »Ja, byg den«.

Indhold af forslaget:

- Tekst om valgmuligheder skjules i den offentlige udgave, når indstillingen er fast. Af beskrivelserne af de enkelte valgmuligheder vises kun den valgte.
- Hvor det er nødvendigt, står en kort tekst om den faste værdi i denne udgave. Værdier som oprundingstrin og minimumstykkelser indsættes automatisk fra opsætningen.
- Sammenligningstabeller over valgmuligheder viser i den offentlige udgave kun rækken for det valgte.
- Hjælpen i den lokale og den interne udgave er uændret.
- I den offentlige udgave er alle indstillinger uden for listen `kan_aendres` faste, også dem, der er lig appens standard.

Claudes valg, som kan ændres: Tekst, der kun handler om funktioner, den offentlige udgave ikke har (rapport, firmaprofil, redigering af designdiagrammer og korrelation), skjules også i den offentlige udgave. De nye sætninger til de faste tilfælde formuleres i hjælpens stil, og brugeren ser dem igennem i den offentlige udgave.

Gennemført 2. november 2026. Hjælpeteksterne er mærket op med `:::vis`-blokke, `<!-- vis … -->`-indskud, rækkemærker og pladsholdere for værdier og figurnumre; filteret ligger i `src/engine/hjaelp.ts`, og udgavens kontekst i `src/ui/hjaelp-kontekst.ts`. Hjælpen i den lokale og den interne udgave er tegn for tegn som før, kontrolleret mod de oprindelige filers kontrolsummer og mod `tests/cases/`. En test danner den offentlige hjælp for hver værdi af de opmærkede indstillinger og kontrollerer, at den er velformet.

Claudes valg, som kan ændres: Kapitel 2, afsnit 4 (redigering af kørslerne) vises ikke i den offentlige udgave. I kapitel 6 står en note om, at eksemplerne er regnet med appens standardindstillinger, når oprundingstrinnet ikke er 50 mm. Rækken »1–3« i figuren over minimumstykkelser viser værdien for klasse 3.

Opfølgning samme dag. Brugerens ønske: »Når man bruger den offentlige udgave, behøver der ikke være info-boksen med 'Tabellerne er appens standard og kan ikke rettes i denne udgave.', og afkrydsningsfeltet 'vis kun ændringer' behøver ikke vises heller da det jo ikke er relevant i den offentlige udgave. i geonet databasen, skal sektionen med 'database-noter og kildehenvisninger' skjules, så man kun kan se produkt tabellen.« Infoboksen og filteret er fjernet fra Designdiagrammer og Trafikklasse-korrelation i den offentlige udgave, og geonet-databasens noter vises ikke der (`geonetNoter` i udgavetabellen). Lokal og intern er uændrede.

## 4. november 2026 — den interne udgave uden login

Brugeren spurgte, hvordan den interne udgave kan være uden login som den offentlige. Claude forklarede, at medarbejderlisten ligger i appens filer, så navne, mails og telefonnumre kan læses af alle med adressen, og at adressen er nem at gætte. Claude frarådede at beholde listen uden login og foreslog at fjerne listen eller at beholde login med længere gyldighed. Brugerens svar: »behold listen, og slå login fra«.

Dette erstatter svaret om login i afsnittet »tre udgaver: lokal, intern og offentlig« og Claudes valg om, at listen kun bygges ind, når adressen kræver login. Udrulningen bygger nu altid listen ind i den interne udgave, og kontrollen af Cloudflare Access er fjernet. Listen ligger fortsat ikke i Git, og den offentlige udgave får den ikke. Brugeren slår selv login fra i Cloudflare-kontoen.
