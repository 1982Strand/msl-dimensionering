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
