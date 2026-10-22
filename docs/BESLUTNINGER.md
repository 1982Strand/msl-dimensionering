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
