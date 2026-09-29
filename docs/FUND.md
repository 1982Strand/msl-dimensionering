# Fund til afklaring

Alle fund nedenfor gælder referencecommit `a330cfd`. Der er ikke ændret i den gamle app, og ingen rettelse er godkendt.

## FUND-001 — produktvalg nulstilles efter navigation i Standard

**Observeret to gange i appens testmiljø:** vælg Standard, Eu 5 MPa, belastningsklasse 4 og Tensar InterAx NX850. Åbn Materialer og vend tilbage til Dimensionering. Eu 5 bevares, men produktet er igen Tensar TriAx TX160. De konservative tykkelser skifter fra 750/650 mm til 850/750 mm for ét/to lag, fordi et andet produkt nu er valgt.

Bevis: `reference/ui-flows.json`, UI-003 og UI-005. I `app.py:10648` omfatter præfikserne for bevarelse `bd_geonet`, men ikke `std_geonet`. Det forklarer forskellen mellem tilstandene. En rigtig browsergennemgang bør bekræfte det før en rettelse.

Muligt ændringsforslag: bevar det valgte Standard-geonet ved navigation, så længe produktet fortsat er gyldigt. Det ændrer eksisterende virkemåde og kræver brugerens godkendelse. Indtil da bevares den observerede adfærd i referencecasen.

## FUND-002 — manuel armering findes i kode, men adgang fra vælgeren er uafklaret

`render_brugerdefineret()` har input til manuel geonetkorrektion på −0,20 til +0,20. Produktoversigterne i `core/calculator.py:531` springer imidlertid »Anden armering (manuel)« over, og produktvælgeren dannes af de beregnede produkter i `app.py:6942`. De registrerede standard-/brugerdefinerede produktlister udstiller ikke det manuelle produkt.

Status: kildefund, ikke en fuldt afprøvet UI-fejl. Det skal afklares, om dette er tilsigtet, en ubrugt historisk funktion eller et manglende adgangsforløb. Funktionen må ikke automatisk fjernes eller gøres synlig som del af migreringen.

## FUND-003 — minimumstykkelser er kommenteret som foreløbige

Den aktive standardtabel i `core/lagfordeling.py:116` er 200/200/200/250/275/300 mm for klasse 1–6. Kommentaren angiver, at værdierne fra mødet 25. september 2026 ikke er endeligt fastlagt. Brugerens beslutning om at bevare standardværdierne betyder, at tallene bevares uændret i migreringen. En eventuel faglig revision skal behandles særskilt før udgivelse, hvis brugeren ønsker den.

## FUND-004 — diagramredigering gemmes løbende

Knappen »Redigér« har en hjælpetekst om, at ændringer gemmes ved »Færdig« (`app.py:7995`). Implementationen i `_rediger_diagramdata()` gemmer ændringer og opdaterer opslagstabellen undervejs (`app.py:8076`).

Status: kildefund; skal afprøves som forløb. En ny gem-knap eller ændret tekst må ikke stiltiende ændre den faktiske gemmeadfærd.

## FUND-005 — oplyste forudsætninger er fast standardtekst

Den gamle rapportbygger indsætter standardtekst med »Dimensioneringsgivende trafikbelastning: T6« og »Vingestyrke, Cv, skønnet i planum: > 100 kPa«, når afsnittet ikke er redigeret. Det sker også for Standard, belastningsklasse 4, Eu 10 MPa. Materialeteksten i samme afsnit angiver Genbrugsstabil, mens beregningsgrundlaget angiver Stabilgrus SG II og Bundsikring BL II.

Observeret i `reference/report-contexts.json`, case `standard`, og i den originale Word/PDF-generering. Det er redigerbar skabelontekst, ikke automatisk sammenstilling af den aktuelle dimensionerings forudsætninger.

Muligt ændringsforslag: forudfyld relevante forudsætninger fra det valgte grundlag, med tydelig mulighed for at supplere projektspecifikke oplysninger. Først skal det aftales, hvilke felter der er automatiske, hvilke der er fritekst, og hvordan ændret dimensionering påvirker redigeret tekst. Ingen ændring er indført.
