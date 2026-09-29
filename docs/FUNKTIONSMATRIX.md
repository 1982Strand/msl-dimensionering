# Detaljeret funktionsmatrix — første gennemgang

Reference: `a330cfd`, indbyggede standardværdier. Alle kildehenvisninger er relative til den gamle app. »Kørt« betyder observeret i originalen, ikke migreret eller godkendt i ny app. Den komplette statiske liste med signaturer og widgetudtryk ligger i `reference/inventory.json`.

## Dimensionering og tilstand

| ID | Funktion / bevaret kontrakt | Kilde | Reference / status |
| --- | --- | --- | --- |
| F-01.1 | Otte navigationssider, Standard som første tilstand | `app.py:7242`, `app.py:10695` | Alle sider besøgt; UI-cases |
| F-01.2 | Inputbevarelse ved navigation | `app.py:10657` | UI-003–005; produktnulstilling registreret som FUND-001 |
| F-01.3 | Nulstil rydder kun dimensioneringsfelternes præfikser; indstillinger bevares | `app.py:10676` | UI-008 |
| F-02.1 | Eu-slider 1–45 MPa, start 10, trin 1 | `app.py:1241`, `core/data.py` | UI-001/002; alle tabelrækker i `diagram-grid` |
| F-02.2 | Cv-slider 0–180, start 60, trin 5; tabelopslag til Eu | `app.py:1241`, `core/data.py:1934` | UI-007; `cv-conversion` |
| F-02.3 | Belastningsklasse 1–6, start 4; Eo 30/45/60/80/120/150 | `app.py:1317`, `app.py:1643` | UI-001; `diagram-grid` |
| F-02.4 | Trafikklasse T1–T6, start T4; seneste gyldige valg fastholdes ved fravalg | `app.py:1550` | UI-006 og trafikcases; selve fravalgshandlingen mangler |
| F-02.5 | Standard regner med phi 37°; valgt geonet starter TX160 | `app.py:6057`, `app.py:4301` | UI-001; kommentarer med ældre phi-værdier må ikke overtrumfe aktiv kode |
| F-02.6 | Brugerdefineret: 1–3 materialelag; standard SGII 0-32 300 mm + Bundsikringssand 400 mm | `app.py:6521` | UI-009/010 |
| F-02.7 | Indtastet lagtykkelse 200–2.000 mm, trin 50; manuel phi 20–60°, korn 0–500 og lagtype | `app.py:6521` | UI-010; alle inputgrænser endnu ikke afprøvet i UI |
| F-02.8 | Tykkelsesvægtet phi, mulighed for manuel overskrivning; overskrivning afkobler søjlens phi-regel | `app.py:6405`, `app.py:6852` | UI-011; `coupled-phi` |
| F-02.9 | Manglende driftspunkt fjerner seneste dimensionering og blokerer videre forløb | `app.py:6057`, `app.py:6852` | UI-traffic-T1-3, UI-016 |
| F-02.10 | Konservative/optimale produktintervaller, grupper, sortering, valgt geonet og referencegrupper | `core/calculator.py:488`, `core/calculator.py:651`, `app.py:3493`, `app.py:4030` | `products`, `product-groups`, UI-003; sorteringsklik og alle optimale visninger udestår |
| F-02.11 | Manuel armering findes i database og beregningskode | `app.py:6852`, `core/calculator.py:488` | Fuld UI-adgang uafklaret; FUND-002 |

## Beregning og datagrundlag

| ID | Funktion / bevaret kontrakt | Kilde | Reference / status |
| --- | --- | --- | --- |
| F-03.1 | Aflæste diagramkurver omsættes til heltals-Eu-tabeller; ingen ekstrapolation | `core/data.py:95`, `core/data.py:142` | Standardtabeller fastlåst; `diagram-grid` |
| F-03.2 | Direkte opslag kræver en Eu-række; trafikklasse kan interpolere mellem Eo-kolonner | `core/calculator.py:82`, `core/calculator.py:122` | `diagram-grid`, `invalid-calculation`, trafikcases |
| F-03.3 | Korrektion fra phi og geonet, skala, reference og reduktion | `core/calculator.py:166`, `core/calculator.py:307` | `correction`, `round-calculation` |
| F-04.1 | VejDim SG+BL giver ubundet tykkelse; tilbageberegning af Eo og produktklasse | `core/data.py:399`, `core/data.py:564`, `core/data.py:733` | `traffic-default`, UI-traffic-T4-10 |
| F-04.2 | Standardtolerance 5 % over/under; under inden = laveste kurve; uden tolerance = afvis | `core/data.py:477` | `traffic-rules`, `traffic-boundary` |
| F-04.3 | Redigering af VejDim-kørsler, CSV, nulstilling og vis flere/færre rækker | `app.py:8319` | Side besøgt; redigering/CSV endnu ikke kørt |
| F-05.1 | Oprunding 1/10/50/100 mm, start 50; reduktion af oprundede tal; præcise værdier skjult som standard | `core/afrunding.py:39`, `app.py:9513` | `round-up`, `round-calculation`, UI-014 |
| F-05.2 | Phi: ingen/ned/nærmeste; halve grader op; standard ingen | `core/afrunding.py:101` | `round-phi` |
| F-06.1 | Øverste lag: proportional/minimum/fastholdt; start minimum | `core/lagfordeling.py:304` | `layer-distribution` |
| F-06.2 | Samlet minimum til; klasse 1–6: 200/200/200/250/275/300 mm | `core/lagfordeling.py:116` | Default-snapshot og UI; faglig kommentar omtaler foreløbige værdier, jf. FUND-003 |
| F-06.3 | Restlag vis/flet/VD; start vis; fletgrænse 100 mm; VD-minima 100/200 mm | `core/lagfordeling.py:288`, `core/lagfordeling.py:376` | `layer-distribution`, `coupled-phi`; samtlige minimumsgrænser udestår |
| F-06.4 | Phi indtastet/laveste/søjle, start laveste; gentagelse og konservativ afslutning ved ustabilitet | `core/calculator.py:242` | `coupled-phi`; en dokumenteret oscillerende case udestår |
| F-06.5 | Standard opdeling til, klassisk fra; klassisk ignorerer minimum/fordeling for Standard | `app.py:374`, `app.py:10246` | UI-001/UI-015 |
| F-06.6 | Under stabilgrusminimum: stabilgrus/løft/ubundet, start stabilgrus; krav om bundsikring fra | `core/lagfordeling.py:147`, `app.py:10246` | Default-snapshot; alle forløb udestår |
| F-07.1 | Dæklag, produktkrav, afstande, overlæg omkring Eu 5 og dimensionerende tykkelse | `core/placement.py:33`, `core/placement.py:116` | `placement`, `overlap` |
| F-07.2 | Øverste net ved laggrænse/dæklag/laggrænse med minimum; start laggrænse | `core/placement.py:94`, `app.py:10361` | `layer-placement` |
| F-08.1 | Hårde fejl, bløde advarsler og anbefalinger er forskellige udfald | `core/validators.py:48` | `validation`, `product-validation`; behold hele beskeder |
| F-08.2 | Kornstørrelse, maskestørrelse, lagrækkefølge og anbefalet produktklasse | `core/validators.py:200` | `product-validation` |

## Figurer, redigering, rapport og hjælp

| ID | Funktion / bevaret kontrakt | Kilde | Reference / status |
| --- | --- | --- | --- |
| F-09.1 | Fælles lodret skala, lagtyper, geonetpositioner, mål og best-case-markering | `core/diagram.py:374`, `core/diagram.py:850` | FIG-001–004 registrerer originalens geometri/labels; pixelkontrol udestår |
| F-09.2 | Geonetnavn, målstreg, måltal og signatur til som standard | `app.py:145`, `app.py:9513` | Default-snapshot; visuelt udkast ikke godkendt |
| F-09.3 | Personligt diagram, rådiagram og koblingsforklaringer/mellemregninger | `core/diagram.py:29`, `core/diagram.py:235`, `app.py:2969` | Statiske funktioner registreret; interaktion/hovers udestår |
| F-10.1 | mm/cm er visning; beregning og laginput i mm, korn/masker altid mm | `core/enhed.py:31`, `app.py:9513` | `display-length`, UI-013 |
| F-11.1 | Materialetabeller: navn, phi, korn, maske, lagtype, bemærkning; automatisk gemning | `app.py:8584`, `app.py:8652` | Side besøgt; ændring/nulstilling/dubletter udestår |
| F-11.2 | Manglende/slettet materiale giver manuelt lag og advarsel | `app.py:6521` | Kildegennemgået; særskilt case udestår |
| F-11.3 | Diagramredigering opdaterer aktiv tabel undervejs; nulstilling pr. diagram og alle | `app.py:7904`, `app.py:8076` | Side besøgt; semantik om gemmetidspunkt registreret som FUND-004 |
| F-11.4 | Indstillinger normaliseres og gemmes; ny session genindlæser | `app.py:165`, `app.py:184` | `normalize`, UI-012–017 |
| F-11.5 | Geonet-database er et opslag med produktdata og noter | `app.py:7558` | Side besøgt; ingen eksisterende redigeringsfunktion må antages |
| F-12.1 | Rapport bygger på seneste dimensionering med valgt geonet | `app.py:8782` | UI-016; beregningstekster for gyldige cases registreret |
| F-12.2 | Metadata huskes på disk, dato starter dags dato; særskilt nulstilling | `app.py:623`, `app.py:8782` | Kildegennemgået; faktisk metadataforløb udestår |
| F-12.3 | Valg af snit, grundlagslinjer, diagram, tekster og enhed | `app.py:8711`, `app.py:8782` | Kilde/inventar; fulde rapportvalg udestår |
| F-12.4 | Word fra eksisterende skabelon; tom redigeret tekst respekteres | `core/rapport.py:900` | Kildegennemgået; faktisk filgenerering/visuel kontrol udestår |
| F-12.5 | PDF via Word på Windows, LibreOffice ellers; Word kan hentes ved PDF-fejl | `core/rapport.py:1030`, `app.py:9382` | Kildegennemgået; drifts- og eksportkontrol udestår |
| F-12.6 | Fingeraftryk blokerer download af gammel rapport efter inputændring | `app.py:9360` | Kildegennemgået; forløbskontrol udestår |
| F-13.1 | Otte hjælpekapitler, formler, figurer, kilder og »gå til« | `core/hjaelp.py:218`, `app.py:7466` | Hjælpeside åbnet; alle links og dokumenthenvisninger udestår |

## Færdigkriterium for hvert ID

Et ID kan først afsluttes, når relevant originaladfærd er registreret, ny implementation er koblet til casen, automatisk/manuel kontrol er gennemført og eventuelle afvigelser har en konkret godkendelse. Ingen ID'er er afsluttet som migreret.
