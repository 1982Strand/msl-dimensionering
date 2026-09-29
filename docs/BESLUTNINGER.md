# Beslutningslog

## Aftalt af brugeren — 29. september 2026

| ID | Beslutning | Grundlag |
| --- | --- | --- |
| B-001 | Nyt repository hedder `msl-dimensionering`; ny arbejdsmappe er `C:\MSL-Dimensionering` | Brugerens opstartsbesked |
| B-002 | Brugerfladen bygges med React, TypeScript, Vite og shadcn/ui | Brugerens opstartsbesked |
| B-003 | Beregninger, virkemåde og funktionalitet bevares; ændringer og forbedringer kræver brugerens godkendelse | Brugerens opstartsbesked |
| B-004 | Appdesign og visualisering af opbygninger kræver brugerens godkendelse | Brugerens opstartsbesked |
| B-005 | Planen udarbejdes sammen med brugeren, med løbende afklarende spørgsmål | Brugerens opstartsbesked |
| B-006 | Beregningsmotorens sprog/arkitektur afklares efter kortlægningen | Brugerens svar: »Afklar efter kortlægningen« |
| B-007 | Den gamle apps aktuelle ændringer committes og pushes; den version er udgangspunktet | Brugerens svar: »den gamle app skal fuldt committes og pushes, og så er det det vi arbejder ud fra.« Udført: `a330cfd6734ac2478be1304a362c69f94e412d25` på `origin/main` |

## Foreløbige praktiske valg

Supplerende aftaler den 29. september 2026:

- **B-008:** Den gamle apps indbyggede standardværdier bevares. Brugerens svar: »Bevar den gamle apps standard værdier. Gå igang med planen«.
- **B-009:** Arbejdet med planens kortlægning og referencegrundlag er igangsat efter samme besked. Arkitekturvalg, funktionelle afvigelser og visuelle løsninger kræver fortsat afklaring/godkendelse.

| ID | Valg | Status |
| --- | --- | --- |
| P-001 | Repository oprettes privat under den tilgængelige konto `1982Strand` | Reversibelt opstartsvalg meddelt brugeren; offentliggørelse er ikke besluttet |
| P-002 | Første commit indeholder plan og arbejdsregler | Forberedelse; ingen beregninger eller design implementeret |

## Spørgsmål forelagt brugeren

| ID | Spørgsmål | Status |
| --- | --- | --- |
| A-001 | Skal hele beregningsmotoren omskrives til TypeScript, bevares i Python, eller afklares efter kortlægning? | Besvaret: afklares efter kortlægningen, jf. B-006 |
| A-002 | Skal den lokale arbejdskopi, seneste GitHub-version eller en bestemt version være reference? | Besvaret og udført: aktuelle ændringer committet og pushet, jf. B-007 |

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

Der er endnu ingen godkendte funktionelle afvigelser eller visuelle løsninger.

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
