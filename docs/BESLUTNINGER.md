# Beslutningslog

## Aftalt af brugeren — 29. september 2026

| ID    | Beslutning                                                                                               | Grundlag                                                                                                                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B-001 | Nyt repository hedder `msl-dimensionering`; ny arbejdsmappe er `C:\MSL-Dimensionering`                   | Brugerens opstartsbesked                                                                                                                                                 |
| B-002 | Brugerfladen bygges med React, TypeScript, Vite og shadcn/ui                                             | Brugerens opstartsbesked                                                                                                                                                 |
| B-003 | Beregninger, virkemåde og funktionalitet bevares; ændringer og forbedringer kræver brugerens godkendelse | Brugerens opstartsbesked                                                                                                                                                 |
| B-004 | Appdesign og visualisering af opbygninger kræver brugerens godkendelse                                   | Brugerens opstartsbesked                                                                                                                                                 |
| B-005 | Planen udarbejdes sammen med brugeren, med løbende afklarende spørgsmål                                  | Brugerens opstartsbesked                                                                                                                                                 |
| B-006 | Beregningsmotorens sprog/arkitektur afklares efter kortlægningen                                         | Brugerens svar: »Afklar efter kortlægningen«                                                                                                                             |
| B-007 | Den gamle apps aktuelle ændringer committes og pushes; den version er udgangspunktet                     | Brugerens svar: »den gamle app skal fuldt committes og pushes, og så er det det vi arbejder ud fra.« Udført: `a330cfd6734ac2478be1304a362c69f94e412d25` på `origin/main` |

## Foreløbige praktiske valg

Supplerende aftaler den 29. september 2026:

- **B-008:** Den gamle apps indbyggede standardværdier bevares. Brugerens svar: »Bevar den gamle apps standard værdier. Gå igang med planen«.
- **B-009:** Arbejdet med planens kortlægning og referencegrundlag er igangsat efter samme besked. Arkitekturvalg, funktionelle afvigelser og visuelle løsninger kræver fortsat afklaring/godkendelse.

| ID    | Valg                                                                 | Status                                                                        |
| ----- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| P-001 | Repository oprettes privat under den tilgængelige konto `1982Strand` | Reversibelt opstartsvalg meddelt brugeren; offentliggørelse er ikke besluttet |
| P-002 | Første commit indeholder plan og arbejdsregler                       | Forberedelse; ingen beregninger eller design implementeret                    |

## Spørgsmål forelagt brugeren

| ID    | Spørgsmål                                                                                                 | Status                                                                |
| ----- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| A-001 | Skal hele beregningsmotoren omskrives til TypeScript, bevares i Python, eller afklares efter kortlægning? | Besvaret: afklares efter kortlægningen, jf. B-006                     |
| A-002 | Skal den lokale arbejdskopi, seneste GitHub-version eller en bestemt version være reference?              | Besvaret og udført: aktuelle ændringer committet og pushet, jf. B-007 |

## Næste afklaringer

- Standardgrundlaget er afklaret i B-008; gamle lokale tilpasninger er bevaret særskilt og bruges ikke som nye standardværdier.
- Skal den nuværende visuelle identitet videreføres, eller ønskes en ny MSL-identitet?
- Hvem skal have adgang til appen og til redigering af grunddata? Skal indstillinger være personlige eller fælles?
- Skal appen kunne bruges offline, og hvilke browsere/skærmstørrelser skal understøttes?
- Hvilke rapporteksempler og konkrete dimensioneringssager skal indgå i acceptgennemgangen?
- Er der kendte fejl, særtilfælde eller igangværende ændringer i den gamle app, som skal behandles før referencen fastlåses?

Spørgsmålene tages i mindre grupper på det relevante tidspunkt. Ingen svar eller godkendelser antages på forhånd.

## Skabelon for ændringsforslag

- ID og dato:
- Berørte funktions-ID'er:
- Eksisterende adfærd, inklusive konkret input og resultat:
- Foreslået adfærd og begrundelse:
- Påvirkning af beregninger, data, brugerforløb, figurer og rapporter:
- Eksempel eller visuelt udkast til gennemgang:
- Plan for kontrol:
- Brugerens svar og dato:
- Status: foreslået / godkendt / afvist / implementeret / kontrolleret.

B-017 godkender direkte tabelredigering uden en Redigér-knap og med automatisk gemning. Der er ingen godkendte ændringer af beregningsregler eller endelige visuelle løsninger.

## Forelagt under kortlægningen

- **A-003:** Visuel retning: nyt MSL-design, videreført Byggros-identitet eller senere afklaring. Afventer svar.
- **A-004:** Adgang: offentlig uden login, login for alle eller senere afklaring. Afventer svar. Dette spørgsmål afgør ikke i sig selv, om redigerede grunddata skal være fælles eller personlige.
- **A-005:** Arkitekturvalg efter den første kortlægning: TypeScript til beregningsmotoren er besluttet i B-014. Hosting, lagring og adgang er fortsat åbne; se `ARKITEKTURVALG.md`.
- **B-010:** Brugeren ønsker en særskilt evaluering af rapportgenerering i TypeScript og forskelle/optimeringsmuligheder i forhold til Python og LibreOffice, før der vælges. Evaluering: `RAPPORT_EVALUERING.md`. Svaret er ikke en godkendelse af en ny rapportmotor eller et nyt layout.
- **B-011:** Brugeren har bedt om at fortsætte arbejdet og derefter undersøge Typst. PDF kan på sigt blive primært, og Word muligvis undværes. Dette er en ønsket retning til afprøvning, ikke en godkendelse af at fjerne Word-eksport ved første udgivelse. En isoleret TypeScript/Typst-prototype og vurdering foreligger i `TYPST_AFPROEVNING.md`; arkitektur og visuelt design er fortsat åbne.
- **FUND-001:** Produktvalg i Standard nulstilles ved navigation via Materialer. Se `FUND.md`. Registreret eksisterende adfærd; ingen rettelse godkendt.
- **A-006:** Brugeren er spurgt, om der skal udarbejdes et forslag til automatisk udfyldning af rapportens oplyste forudsætninger, jf. FUND-005. Afventer svar; standardteksten er fortsat bevaret.
- **B-012:** Brugeren har bedt: »Arbejd videre med Typst og bevarelse af rapport data« og præciseret behov for at bevare formatering, linjeskift, indrykninger og punktopstillinger. Dette autoriserer videre afprøvning og dataarkivering; det godkender ikke et nyt visuelt design eller fjernelse af Word-eksport. Basisskabelonens redigeringsmuligheder er beskrevet i `RAPPORTSKABELON.md`.
- **B-013:** Brugeren accepterer rapportprøven som grundlag for at fortsætte planen: »det er fint, jeg finpudser senere. kør videre med planen«. Yderligere rapportfinpudsning udskydes. Dette er ikke endelig accept af hele appens design eller offentliggørelse.
- **B-014:** Brugeren vælger omskrivning af beregningsmotoren til TypeScript: »Fortsæt bare. Kør med omkodning af beregningsmotor til typescript.« Python-versionen bevares som reference; funktionelle ændringer og beregningstolerancer er fortsat ikke godkendt. A-005 er dermed afklaret for beregningsmotorens sprog.
- **B-015:** Brugeren kræver aktivering og brug af Serena og Semble i den nye app. Serena konfigureres til TypeScript og Python; Semble bruges til kodesøgning.
- **B-016:** Brugeren ønsker konkrete forslag til forbedring/forenkling af redigering af diagramtabeller, materialer mv. Forslagene dokumenteres i `REDIGERINGSFORSLAG.md`. Anmodningen autoriserer vurdering og forslag, ikke automatisk ændring af eksisterende adfærd.
- **A-007:** Besvaret: brugeren fravælger kladde/Anvend/Kassér og vælger direkte redigering med automatisk gemning, jf. B-017. R-002/003 er senere godkendt i B-018; R-005 er erstattet i B-019. R-004 afventer vurdering.

## Supplerende aftale — 30. september 2026

- **B-017:** Materialer, diagramtabeller og VejDim-data skal kunne redigeres direkte, uden »Redigér«- eller »Gem«-knap. Gyldige ændringer anvendes og gemmes automatisk. Brugerens svar: »Jeg synes man bare skal kunne redigere med det samme, uden at trykke på 'rediger' og så gemmer den ens valg automatisk uden man behøver trykke gem. Det er klart nemmest og hurtigst.« Dette vælger arbejdsgangen, ikke nye beregnings-/valideringsregler, Fortryd/Gentag, import, datalagringssted eller endeligt visuelt design.
- **B-018:** R-002 og R-003 er godkendt: ændringsvisning med standardværdi og filter samt Fortryd/Gentag i aktiv session og gendannelse af standardcelle/række med automatisk gemning. Brugerens svar: »R-002 og 003 godkendt.« Endeligt visuelt design er fortsat særskilt.
- **B-019:** Navngivne dataprofiler i R-005 afvises. Kravet er at gemme brugerindtastede data og værdier fra session til session. JSON eller anden praktisk lagringsmetode kan vælges. Brugerens svar: »005 skal vi ikke lave som du foreslår. Vi skal bare sørge for at gemme de bruger indtastede data og værdier fra session til session.« Lagringsomfang er derefter afklaret: »Samme browser og computer er nok«. Implementeringsvalg: ét JSON-dokument i browserens localStorage, uden konti, serverlagring eller navngivne profiler. Komplette snapshots skal genåbnes med de gemte værdier, også bevidst tomme felter; gamle fil-loaders bevares særskilt. Se `REDIGERING_OG_LAGRING.md`.
- **A-008:** R-004 er ikke godkendt. Brugeren ønsker bedre forklaring. Tastaturbetjening, søgning og kopiering af celleområder fra Excel er forklaret som tre selvstændige muligheder i `REDIGERINGSFORSLAG.md`. Ingen masseindsætning/import eller kompakt tabel er implementeret.
- **A-009:** Første fungerende React-designudkast til Materialer er forelagt 30. september 2026: mørkegrøn topbjælke, lyse tabeller og gule ændringsmarkeringer. Brugeren er spurgt, om retningen kan videreføres. Besvaret og godkendt som designretning i B-020. Firmalogo, samlet navigation og opbygningsfigurer er ikke dermed godkendt. Se `MATERIALEUDKAST.md`.

- **B-020:** Brugeren godkender at arbejde videre med materialeudkastets visuelle retning: mørkegrøn topbjælke, lyse tabeller og gule ændringsmarkeringer. Svar 30. september 2026: »Ja, arbejd videre med denne retning«. Retningen kan videreføres i kommende sider; dette godkender ikke nye beregningsregler, R-004, firmalogo eller opbygningsvisualisering.

- **B-021:** Brugeren ønsker lavere tokenforbrug og lidt færre tests: »begrænse tests en smule, og forsøge at optimere på tokenforbrug således du får lavet så meget kodearbejde som muligt i en session«. Nye tests målrettes ændrede risici og brugerforløb; eksisterende beregningskontrol bevares. Ingen godkendelse af tabt funktionalitet eller ændrede resultater.
- **B-022:** Brugeren tillader mindre modeller til passende delopgaver, men understreger, at Astra skal holde overblik og styring. Afgrænsede underagenter kan derfor bruges; hovedagenten styrer scope, gennemgår ændringer og integrerer. Første delopgave er indstillingsreference med GPT-6 Sol. Hovedsamtalens model er ikke ændret af værktøjet.

| B-023 | 30.09.2026 | Godkendt | Bevar det valgte Standard-geonet ved navigation og mellem sessioner, så længe produktet er gyldigt. Brugeren: »Ja, bevar produktvalget«. Afgrænset ændring af FUND-001; oprindelige beregninger bevares. |

- **B-024:** Brugeren ønsker vandrette klassevalg og designdiagram i popup uden at øge hovedboksens højde. Cv-tabellens overlap skal rettes, og »Alle produkter« skal kontrolleres mod originalen. Klassevalg ombrydes på små skærme; diagram og Cv-tabel åbnes i popupper. Produktoversigten genskaber originalens syv kolonner og sortering. Dette godkender de nævnte layoutrettelser, ikke nye beregningsregler eller opbygningsfigurer.

- **A-010:** Besvaret og godkendt 30.09.2026 i B-025. Det forelagte opbygningsudkast i `OPBYGNINGSFIGURER.md` er godkendt; senere figurer og PDF-design har særskilt accept.

## Rapport og mellemregninger — 30.09.2026


Beslutning B-025 følger brugerens besked i denne chat. B-026–028 registreres efter brugerens udtrykkelige instruktion om at følge afsnit 0 i `C:\Users\dst\Documents\MSL-rapportdemo\CODEX-OPGAVE.md`; de citerede svar er gengivet fra denne opgavefil.

- **B-025:** A-010 er godkendt. Brugeren: »Det er fint. Fortsæt. Vær omhyggelig med de fulde mellemregninger, da der er nogle avancerede figurer med«. Det forelagte opbygningsdesign kan videreføres. Dette godkender ikke M1-figurerne, det personlige designdiagram M5 eller PDF-design.
- **B-026:** Rapporten genereres alene som PDF med Typst; Word-eksport udgår. Brugeren: »vil gerne nøjes med at generere en pdf fil, men det kræver at denne pdf er perfekt sat op«. Dette erstatter forbeholdet om Word-eksport i B-011. Betingelsen om perfekt opsætning bevares som acceptkrav; den endelige PDF kræver brugerens visuelle godkendelse.
- **B-027:** Appen er indtil videre en webapp. Rapporten hentes som en lokal PDF-download uden serverlagring. Brugeren: »Indtil videre bliver det en web app, så rapporten skal gemmes lokalt, ligesom den gør i den gamle app«. Browserkompilering er arkitekturforslaget i rapportdelplanen og forelægges før implementering.
- **B-028:** Firmaprofilen skal kunne ændres i appen som vist i rapportdemoen. Brugeren: »til at starte med vil jeg gerne have at firmaprofilen kan ændres i appen« og »Jeg vil gerne have med at man kan redigere firmaskabelonen i appen som du har vist«. Firmaprofil er redigerbare data; layout forbliver kode. Upload af hele skabeloner er ikke valgt. Demoen er reference og må læses/kopieres; ændring af den kræver særskilt godkendelse. Demoens design er ikke dermed endeligt godkendt. De syv rapportafsnits standardtekster flyttes ikke ind i firmaprofilen uden en ny beslutning. FUND-005 og A-006 er fortsat uændrede.
- **A-011:** Besvaret og godkendt 30.09.2026 i B-029 med brugerens otte præciseringer. M1, M5, firmaprofilsiden, rapportsiden og den endelige PDF forelægges senere som særskilte konkrete visuelle udkast. Ingen merge eller offentliggørelse er autoriseret.
- **B-029:** Brugeren: »Delplanerne godkendes (A-011): browserkompilering med typst.ts og den foreslåede rækkefølge.« Planerne rettes først efter brugerens otte punkter; derefter startes M5. Tomme rapporttekster bevarer overskriften og gengives tomme, som baseline `empty-text.pdf`; tidligere udeladelsesformulering i opgavefil/plan var forkert. Syv projektfelter huskes; dato huskes ikke og starter på dags dato. Firmaprofilstandarder udledes af originalrapport/prototypens målte værdier, ikke demoens margener; afvigelser listes ved PDF-accept. M5 bevarer original Plotly-specifikation/hover og eksporterer SVG til Typst. Hver del får konkret casetabel før implementering; M9 dækker resterende hjælpetekster/status/fremhævelser. Rapportens egne figurkald optages særskilt. Dette godkender arkitektur/rækkefølge, ikke de senere konkrete visuelle udkast.
- **B-030:** Brugeren: »Jeg vil gerne at redigerede rapporttekster og valg gemmes mellem sessioner, men at man kan nulstille til standard også.« Omfatter de syv tekster, grundlagslinjer, Standard-materialenavne, snitvalg og designdiagramvalg. Nulstil pr. tekst og Nulstil felter bevares; fælles nulstilling af tekster og valg til standard tilføjes. Et gemt valg anvendes kun, når det er gyldigt for den aktuelle beregning; ellers bruges originalens betingelse og standard. Automatisk lagring i samme browser/computer efter B-019. Dato er undtaget; tomme tekstværdier huskes uden standardfallback. Standardtekster flyttes ikke ind i firmaprofilen.
- **B-031:** Brugeren godkender det forelagte M5-designdiagram: »det er fint.« Svaret følger den særskilte visuelle forelæggelse på dimensioneringssiden. M5-visningen med originalens kurver, hover, intervalbånd og markørvalg er godkendt. Dette godkender ikke M1-figurer, profilside, rapportside eller endeligt PDF-layout. Næste del er M6/M2 i den allerede godkendte rækkefølge.
- **B-032:** M2-kortlægningen er rettet efter brugerens svar: »Ja, bevar det aktive forløb (anbefalet)«. `_vis_beregnings_breakdown` har ingen kald i den godkendte original og genberegner uden aktive indstillinger. De ubrugte tabeller forbliver skjult; de aktive mellemregninger under »Sådan er resultatet beregnet« videreføres i M1. M6 porteres fra den aktive `_input_materialelag_med_korrektioner`. Ingen nye tabeller eller beregningsregler er godkendt.
