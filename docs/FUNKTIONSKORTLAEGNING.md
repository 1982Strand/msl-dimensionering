# Foreløbig funktionskortlægning

Status: denne indledende oversigt fra 29. september 2026 er nu suppleret af [funktionsmatrixen](FUNKTIONSMATRIX.md) og [kørte referencecases](../reference/README.md). Kildestier er relative til `C:\geonet_beregning`. Linjer henviser til referencecommit `a330cfd`.

Kontroldækning og resterende arbejde fremgår af funktionsmatrixen. Ingen områder er markeret som færdigmigreret.

| ID | Område | Observeret kilde | Hvad skal bevares/kontrolleres |
| --- | --- | --- | --- |
| F-01 | Navigation og tilstand | `app.py:7242`, `ui.py` | Otte sider: Dimensionering, Rapport, Materialer, Geonet-database, Designdiagrammer, Trafikklasse-korrelation, Hjælp og dokumentation, Indstillinger; sidevalg og tilstand |
| F-02 | Dimensionering | `core/calculator.py:1`, `app.py` | Standard/Brugerdefineret, uarmeret/ét/to geonetlag, korrektioner, mellemresultater, produkter og grupper |
| F-03 | Datagrundlag og opslag | `core/data.py`, `core/calculator.py:87` | Materialer, geonet, diagramtabeller, gyldige opslagspunkter og manglende værdier; der må ikke indføres ny interpolation som en stiltiende forbedring |
| F-04 | Trafikklasse-korrelation | `core/data.py:224`, `app.py` | VejDim-kørsler, ækvivalent Eo, tabelredigering, opslag og regler under/over diagrammets område |
| F-05 | Oprunding | `core/afrunding.py:1` | Trin 1/10/50/100 mm, oprunding, reduktion før/efter oprunding, præcise værdier og friktionsvinkelafrunding |
| F-06 | Lagfordeling | `core/lagfordeling.py:1` | Proportional/minimum/fastholdt, tynde restlag, minimumstykkelser og sammenhæng mellem friktionsvinkel og lagfordeling |
| F-07 | Geonetplacering | `core/placement.py:1` | Dæklag, laggrænse, afstande, produktkrav, overlæg og placering af øverste net |
| F-08 | Inputkontrol | Import og kald af `core/validators.py` i `app.py` | Kortlægges særskilt: afvisninger, advarsler, anbefalinger og ugyldige kombinationer |
| F-09 | Figurer og opbygninger | `core/diagram.py:1`, `ui.py:417`, `core/rapport.py:175` | Fælles figurer til skærm/rapport; lag, skala, mål, labels, geonetlinjer og signaturer |
| F-10 | Enheder og præsentation | `core/enhed.py:1`, `app.py:149` | Beregning i mm, visning i mm/cm, decimaler og uændret præcision; visningsvalg må ikke ændre beregningen |
| F-11 | Brugerdefinerede data | `app.py:124` og indlæsningsfunktioner | JSON for materialer, diagrammer, korrelation, indstillinger og rapportmetadata; standarder, normalisering, gemning/nulstilling og levetid |
| F-12 | Rapport og eksport | `core/rapport.py:900`, `app.py` | Word/PDF-forløb, skabelon, metadata, tekster, tabeller, figurer og valgte snit; detaljer/afhængigheder skal verificeres |
| F-13 | Hjælp og kilder | `core/hjaelp.py`, `Dokumenter og data/hjaelp/`, `app.py:7300` | Otte kapitler, faglige forbehold, formler, figurer, kildehenvisninger og interne links |

## Særlige forhold identificeret ved opstart

- Beregningsmodulerne er delvist adskilt fra Streamlit, men `app.py` rummer også normalisering, lagopbygning, gemning og sammensætning af resultater. En flytning af `calculator.py` alene dækker ikke hele virkemåden.
- Ved opstart afveg den lokale `app.py` fra HEAD ved fjernelse af fire linjer omkring en forklarende tekst ved trafikklassevalget. Den eksisterende ændring er efter brugerens instruktion committet og pushet i referenceversion `a330cfd`.
- Brugerdefinerede JSON-filer er ignoreret af den gamle apps Git-konfiguration. De skal vurderes ved fastlåsning af referencen.
- `core/backup 17.06.26/` indeholder historiske kopier. De er ikke automatisk reference for den aktive app.
- Eksisterende skærm og rapport anvender fælles figurkode. Valg af ny figurteknik skal bevare fagligt indhold og sammenhæng mellem de to udgaver.
- Den indledende søgning identificerede ikke en dedikeret automatiseret testsuite. Det er ikke dokumentation for, at ingen tests findes; dette skal afklares i fase 1.

## Detaljeret registrering i fase 1

For hvert underpunkt tilføjes: gammel kilde og kaldested, forudsætninger, input/standarder, forventet adfærd, gemt tilstand, referencecase-ID, ny implementation, automatisk kontrol, manuel kontrol og eventuel beslutning om afvigelse.
