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
