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

- Hvilke lokale materialer, diagrammer, korrelationer og indstillinger hører til referencegrundlaget?
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
