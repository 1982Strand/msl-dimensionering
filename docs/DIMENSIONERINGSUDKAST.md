# Dimensioneringsformularer i React

Udkastet findes på `/#dimensionering`. Standard og Brugerdefineret er koblet til den eksisterende TypeScript-motor og bruger de aktive materialer, diagrammer, VejDim-kørsler og indstillinger.

Originalens inputvalg bevares: Eᵤ eller Cv, belastningsklasse 1–6 eller trafikklasse T1–T6, navngivne geonetprodukter og i Brugerdefineret ét til tre materialelag med tykkelser i mm. Manuel materialefriktion, kornstørrelse, lagtype og overskrivning af φᵥ er tilkoblet. Minimum 200 mm pr. indtastet lag og øvrige originale feltgrænser gælder fortsat. Standard starter med Eᵤ 10 MPa og klasse 4; Brugerdefineret starter med 300 mm Stabilgrus SGII 0-32 og 400 mm Bundsikringssand.

Formularerne har særskilte værdier pr. tilstand og automatisk lagring i samme browser/computer. Nulstilling rydder dimensioneringsfelter, mens tilstand, grunddata og indstillinger bevares, som originalens nulstilling gør. B-023 godkender bevaret gyldigt Standard-produkt ved navigation; originalens referencecase UI-005 ændres ikke.

Resultatkort viser φᵥ-korrigeret uarmeret tykkelse, tykkelser med ét/to geonetlag og reduktioner. Procenter vises som hele procenttal efter originalens formattering. Afvist trafikgrundlag skjuler resultater. Produktoversigten angiver beregnede tykkelser, korrektionsintervaller og anbefalede belastningsklasser. Validerings- og placeringsbeskeder kommer fra den porterede motor.

## Kontrol

- Formularadapteren matcher alle 17 originale dimensioneringspayloads uden tolerance, inklusive manuelle lag, φᵥ, trafikklasse og indstillinger.
- Ni nye originale widgetsnapshots registrerer standarder, felter, grænser, produktlabels og afhængigheder. Optagelse sker fra et isoleret arkiv af a330cfd; eksisterende referenceforventninger overskrives ikke.
- To målrettede browserforløb dækker resultater og procentvisning, intervalprodukt, B-023, genåbning, afvist trafikklasse, Cv, manuelle materialer, φᵥ, ændret oprunding, integergrænse, afgrænset nulstilling og mobilvisning.
- 2.750 motor-/datatests, typekontrol og produktionsbygning består. CI kører alle 21 browserforløb på Windows og Linux.

## Stadig under udvikling

Opbygningsfigurer, personligt designdiagram, endepunkter, fulde mellemregninger/koblingsforklaringer, produktgruppernes komplette tabeller og rapporttilkobling udestår. En del originale hjælpetekster og statusoplysninger skal stadig overføres. Resultatoversigtens fulde fremhævelser og rå/eksakte referencenoter er heller ikke afsluttet. Opbygningsvisualisering kræver særskilt godkendelse.

Korrelationstabellen åbnes foreløbigt via korrelationssiden; originalens lokale tabelvisning på dimensioneringssiden mangler. Forsiden starter fortsat på Materialer under udviklingen. Samlet navigation og visuel accept behandles senere. Dette udkast er ikke en færdig offentlig app.

Procentindtastning af materialelag og »Anden armering (manuel)« er ikke eksponeret i den gamle apps aktive brugerflade. De indføres ikke som nye forløb uden afklaring; se FUND-002.
