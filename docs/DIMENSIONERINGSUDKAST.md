# Dimensioneringsformularer i React

Udkastet findes på `/#dimensionering`. Standard og Brugerdefineret er koblet til den eksisterende TypeScript-motor og bruger de aktive materialer, diagrammer, VejDim-kørsler og indstillinger.

Originalens inputvalg bevares: Eᵤ eller Cv, belastningsklasse 1–6 eller trafikklasse T1–T6, navngivne geonetprodukter og i Brugerdefineret ét til tre materialelag med tykkelser i mm. Manuel materialefriktion, kornstørrelse, lagtype og overskrivning af φᵥ er tilkoblet. Minimum 200 mm pr. indtastet lag og øvrige originale feltgrænser gælder fortsat. Standard starter med Eᵤ 10 MPa og klasse 4; Brugerdefineret starter med 300 mm Stabilgrus SGII 0-32 og 400 mm Bundsikringssand.

Formularerne har særskilte værdier pr. tilstand og automatisk lagring i samme browser/computer. Nulstilling rydder dimensioneringsfelter, mens tilstand, grunddata og indstillinger bevares, som originalens nulstilling gør. B-023 godkender bevaret gyldigt Standard-produkt ved navigation; originalens referencecase UI-005 ændres ikke.

Resultatkort viser φᵥ-korrigeret uarmeret tykkelse, tykkelser med ét/to geonetlag og reduktioner. Procenter vises som hele procenttal efter originalens formattering. Afvist trafikgrundlag skjuler resultater. »Alle produkter« følger originalens syv kolonner: Produkt, Klasse, Indeks, 1 lag, Sparet, 2 lag, Sparet. Ugyldige tykkelser og besparelser vises som »—«; Klasse følger det aktuelle belastnings-/trafikgrundlag. Standardorden, kolonnesortering, konservative intervaltykkelser, valgt produkt og rå referencebesparelser er bevaret. Validerings- og placeringsbeskeder kommer fra den porterede motor.

Efter brugerens fire browserkommentarer (B-024) ligger klassevalgene vandret med ombrydning på små skærme. Designdiagrammet og Cv-korrelationstabellen åbnes i popupper, som ikke ændrer hovedboksens størrelse. De kan lukkes med kryds, Escape eller klik udenfor, og fokus vender tilbage til åbningsknappen.

## Kontrol

- Formularadapteren matcher alle 17 originale dimensioneringspayloads uden tolerance, inklusive manuelle lag, φᵥ, trafikklasse og indstillinger.
- Ni nye originale widgetsnapshots registrerer standarder, felter, grænser, produktlabels og afhængigheder. Optagelse sker fra et isoleret arkiv af a330cfd; eksisterende referenceforventninger overskrives ikke.
- Seks nye produktoversigter er optaget fra originalens faktiske HTML i et isoleret arkiv af a330cfd. Alle 120 rækker, kolonner, standardorden og billedtekster matcher i Standard/Brugerdefineret, belastnings-/trafikklasse og mm/cm. Capture-værktøjet nægter ændring af eksisterende forventninger.
- Tre målrettede browserforløb består: resultater og procentvisning, intervalprodukt, B-023, genåbning, afvist trafikklasse, Cv, manuelle materialer, φᵥ, ændret oprunding, integergrænse, afgrænset nulstilling, vandrette klassevalg, popupper, syv produktkolonner/sortering og mobilvisning.
- 2.751 motor-/datatests, typekontrol og produktionsbygning består. De tidligere 21 browserforløb bestod på Windows og Linux ved 6429265; CI omfatter nu 22.

## Stadig under udvikling

Opbygningsfigurer er tilkoblet med originalens tre/fire snit, fælles lodrette skala, netkoter, optimale niveauer, indtastet reference og visningsindstillinger. Seks originale figurcases matcher uden tolerance. Placeringsbeskeder følger den tegnede lagfordeling. Se `OPBYGNINGSFIGURER.md`; det forelagte design er godkendt i B-025. PDF-kontrol og andre figurers visuelle accept udestår.

Personligt designdiagram M5 og endepunktvalg er tilkoblet med samme Plotly-specifikation/hover som originalen; SVG-eksport er afprøvet gennem browserens Typst-compiler. M5-visningen er godkendt i B-031, se `PERSONLIGT_DESIGNDIAGRAM.md`. Fulde mellemregninger/koblingsforklaringer, produktgruppernes komplette tabeller og rapporttilkobling udestår. Rå/eksakte referencenoter hører til M4; resterende originale hjælpetekster, statusoplysninger og resultatfremhævelser hører til M9. Se den godkendte `MELLEMREGNINGER_PLAN.md`.

Cv-korrelationstabellen findes nu lokalt som popup. Trafikklasse-korrelationen åbnes fortsat via korrelationssiden; originalens lokale trafikklassevisning på dimensioneringssiden mangler. Forsiden starter fortsat på Materialer under udviklingen. Samlet navigation og visuel accept behandles senere. Dette udkast er ikke en færdig offentlig app.

Procentindtastning af materialelag og »Anden armering (manuel)« er ikke eksponeret i den gamle apps aktive brugerflade. De indføres ikke som nye forløb uden afklaring; se FUND-002.

## Aktiv φᵥ-opsummering — M6, 30.09.2026

Originalens aktive formelkolonne er nu porteret med præcise tal, fortegn, linjeskift og afrundingsnoter. Elleve originale UI-cases, fire helpercases og ét nyt browserforløb kontrollerer den. Se PHI_OPSUMMERING.md. De ubrugte M2-tabeller forbliver skjult efter B-032; aktive fulde regnelinjer følger i M1. M5’s udkastmarkering er fjernet efter B-031.
