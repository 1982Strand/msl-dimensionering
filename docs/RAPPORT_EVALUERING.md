# Evaluering af rapportgenerering i TypeScript

Dato: 29. september 2026. Status: teknisk evaluering på baggrund af den konkrete kildekode, strukturel inspektion af Word-skabelonen og officiel dokumentation. Ingen produktionsrapportmotor, visuel ændring eller ændring af eksportfunktioner er godkendt.

**Suppleret med konkret PDF-afprøvning:** Efter brugerens ønske om PDF som muligt primært format er [Typst vurderet og afprøvet](TYPST_AFPROEVNING.md) på ti rapportcases. Nedenstående vurderer især en bevaret Word-baseret eksportvej. TypeScript-DOCX/LibreOffice er fortsat en kandidat; Typst er nu den anbefalede kandidat til videre afprøvning ved PDF som primært format.

## Konklusion og anbefaling

**Rapportgenereringen kan udføres i TypeScript. Det kræver ikke, at LibreOffice fjernes.** TypeScript/Node kan opbygge DOCX-filen og derefter lade LibreOffice danne PDF af netop den fil.

Jeg anbefaler at afprøve **TypeScript → eksisterende Word-design → DOCX → LibreOffice → PDF** som første kandidat. Den retning kan fjerne Python fra rapporttjenesten og samtidig bevare redigerbar Word-eksport og princippet om ét fælles dokument som grundlag for begge formater. Det er en mere målrettet næste kandidat end min oprindelige anbefaling om nødvendigvis at beholde Python til rapporter.

En løsning med **TypeScript/HTML → Chromium → PDF** er også mulig, men har en større konsekvens: PDF-layoutet skal bygges i HTML/CSS, og Word-eksporten skal fortsat produceres gennem en særskilt DOCX-vej. Begge formater er eksisterende funktionalitet og skal bevares, medmindre brugeren godkender andet. Jeg vil derfor ikke vælge HTML/PDF som hovedvej alene for at udfase LibreOffice.

Denne anbefaling er en teknisk vurdering. Identisk layout, bedre svartid og lavere driftsforbrug er endnu ikke demonstreret ved prøvegenerering.

## Hvad den gamle app faktisk gør

Forløbet i `app.py:8782` og `core/rapport.py:900` består af flere uafhængige dele:

1. Den seneste dimensionering samles med metadata, redigerede tekster, valg af grundlagslinjer og ønskede snit.
2. Beregningsdata formateres til to tabeller: grundlag og resultater.
3. Opbygningssnit og eventuelt designdiagram tegnes med den fælles Plotly-kode og eksporteres til PNG gennem Kaleido/Chrome.
4. `docxtpl`/`python-docx` udfylder Word-skabelonen og indsætter tabeller, tekst og billeder.
5. På Windows konverterer Microsoft Word via `docx2pdf`. På andre platforme bruges LibreOffice i baggrunden.
6. Word og PDF kan downloades. Hvis PDF-konverteringen fejler, kan Word-filen stadig hentes. Rapportinput har et fingeraftryk, som forhindrer download af en gammel rapport efter ændringer.

**Python opbygger og styrer dokumentet; Word/LibreOffice foretager PDF-gengivelsen.** Et skift fra Python til TypeScript siger derfor ikke i sig selv noget om skrifter, sideskift eller PDF-hastighed. LibreOffice har en dokumenteret kommandolinjeeksport, som kan kaldes af en Node-tjeneste såvel som af Python. [LibreOffice PDF-eksport](https://help.libreoffice.org/latest/en-US/text/shared/guide/pdf_params.html).

## Inspektion af den konkrete skabelon

Den uændrede skabelon fra referencecommitten er strukturelt registreret i `reference/report-template-audit.json` med SHA-256. Den indeholder 35 pakkedele, 26 skabelonmarkører, to dynamiske tabeller og syv redigerbare tekstafsnit. Siden er omtrent A4 med definerede margener. Skabelonens typografidefinitioner refererer blandt andet til flere Helvetica Neue-varianter.

Følgende forhold skal håndteres ved flytningen:

- De eksisterende Jinja-markører såsom `{%tr for r in dim_grundlag %}` er specifikke for den nuværende motor. De skal oversættes til den valgte TypeScript-motors syntaks; biblioteket kan ikke blot byttes under den samme kode.
- Den nuværende Pythonkode samler tags, der er delt mellem tekststykker i Word, og opdeler tabel-loopmarkører, der står i samme række. Den funktion skal enten erstattes korrekt eller gøres overflødig gennem en kontrolleret tilpasning af skabelonen.
- Tom brugerredigeret tekst betyder »udelad teksten«; den må ikke blive erstattet af standardtekst. Manglende værdi og tom streng skal fortsat behandles forskelligt.
- Grundlagets overskrift/tabel fjernes, når alle grundlagslinjer er fravalgt.
- Figurer indsættes i den eksisterende rapport med en bredde på 16 cm. Skala, labels og valg af snit skal komme fra samme data som skærmens figurer.
- Skrifttyper, størrelser, margener, sidehoved/-fod og felter skal kontrolleres på det valgte servermiljø. Et skift af font eller erstatningsfont kan påvirke linjebrud, selv når alle tal og ord er uændrede.

Inspektionen er strukturel. Den fastslår ikke antallet af sider i en udfyldt rapport eller, at to motorer vil give identisk layout.

## Sammenligning af mulighederne

| Egenskab | Nuværende Python + Word/LibreOffice | TypeScript + DOCX + LibreOffice | TypeScript + HTML/Chromium-PDF samt særskilt DOCX |
| --- | --- | --- | --- |
| Redigerbar Word-fil | Findes | Bevares med TypeScript-bibliotek | Kræver stadig separat DOCX-generering |
| PDF-grundlag | Den genererede Word-fil | Den genererede Word-fil | HTML/CSS-opstilling |
| Eksisterende Word-design | Findes | Kan bruges som udgangspunkt med ændrede tags | Kan bevares for DOCX; PDF-design skal bygges særskilt |
| Risiko for forskelle mellem Word/PDF | Allerede mulig mellem Word og LibreOffice | Stadig renderer-/fontafhængig, men fælles dokumentgrundlag | To forskellige layoutsystemer skal holdes i overensstemmelse |
| Python i produktion | Ja | Kan udfases | Kan udfases |
| LibreOffice i produktion | Ja på nuværende ikke-Windows-vej | Ja | Kan udfases for PDF-vejen |
| Øvrig drift | Python og billed-/dokumentmotorer | Node og billed-/dokumentmotorer | Node/Chromium og DOCX-generator |
| React-forhåndsvisning | Eksisterende figurpreview | Figurer kan deles; endelig dokumentside skal stadig renderes | HTML kan ligne printvisningen tæt, men PDF-sidebrud kræver særskilt kontrol |
| Sandsynligt ændringsomfang | Intet ved bevarelse | Dataformat, Word-tags, generering og processtyring | Samme plus separat PDF-layout og dobbelt eksportkontrol |
| Dokumenteret hastighedsgevinst her | Ikke målt | Ikke målt | Ikke målt |

Playwright kan producere PDF med print-CSS, A4, margener, sidehoved/-fod og sideantal. Det gør HTML-sporet teknisk muligt; det konverterer ikke den eksisterende Word-fil til det samme PDF-layout. [Playwright PDF](https://playwright.dev/docs/api/class-page#page-pdf).

## TypeScript-biblioteker til Word

**docx-templates** er en relevant første kandidat til afprøvning. Det er skrevet i TypeScript og understøtter Word-skabeloner, tabelrækker i løkker, betingelser og dynamiske billeder. Projektet angiver MIT-licens. Det passer på funktionstyperne i vores skabelon, men kompatibilitet med netop denne skabelons XML og formatering skal afprøves. [Projektets dokumentation](https://github.com/guigrpa/docx-templates).

**docx** kan opbygge dokumenter og har en `patchDocument`-funktion, som erstatter pladsholdere i eksisterende DOCX. Den er relevant, hvis vi vil kontrollere dokumentstrukturen mere direkte. Det skal særskilt undersøges, hvor meget af de to dynamiske tabeller og billedplaceringerne der kan bevares uden en større genopbygning. [Patcher-dokumentation](https://docx.js.org/api/functions/index.patchDocument.html).

**Docxtemplater** er en anden mulighed for Word-skabeloner. Basisfunktionerne er gratis, men den officielle billedudvidelse er kommerciel; prissiden angiver 500 EUR pr. modul pr. år ved opslaget den 29. september 2026. Det er ikke en nødvendig omkostning for at bruge TypeScript, da andre biblioteker understøtter billeder. Biblioteket konverterer ikke selv til PDF. [Priser](https://docxtemplater.com/pricing/), [billedmodul](https://docxtemplater.com/modules/image/), [PDF-afgrænsning](https://docxtemplater.com/docs/faq/#convert-to-pdf).

Der er ikke valgt, installeret eller købt noget af dette til produktionsappen. Ingen rapportdata er sendt til eksterne konverteringstjenester.

## Konkrete muligheder for optimering

### Genbrug figurer når deres indhold ikke ændres

I `app.py:9220` og frem eksporteres figurerne som PNG under rendering af rapportsiden. De kald ligger før knappen »Generér rapport«. Ændres et metadatafelt, kan Streamlits genkørsel derfor også gentage billedeksporten, selv om opbygningen er den samme.

Forslag: giv figurerne deres eget fingeraftryk ud fra dimensionering, snitvalg, diagramdata, enhed og visningsindstillinger. Genbrug et allerede genereret billede, når de data er uændrede. Projektets navn eller dato skal ikke gøre en identisk figur ugyldig. Figurernes indhold og eksportkvalitet bevares. Forventet gevinst: færre gentagne eksporter; den faktiske tidsgevinst skal måles.

### Dan et fælles, uforanderligt rapportgrundlag

Forslag: saml beregningsresultat, anvendte standarddata, indstillinger, tekster og valgte figurer i ét versionsmærket rapportgrundlag. Generér Word og PDF fra det samme grundlag. Rapportkoden skal formatere og vise resultaterne, ikke foretage en ny faglig beregning med potentielt andre indstillinger.

Det viderefører den eksisterende idé om `sidste_dim` og rapportens fingeraftryk, men gør grænsen mellem app og rapporttjeneste tydeligere. Det kræver også en eksplicit regel for, hvornår ændringer i globale tabeller gør en eksisterende dimensionering forældet.

### Styr eksport som et afgrænset job

Forslag: eksport med tydelig status, begrænset samtidighed, timeout og genbrug af identiske resultater. Den gamle LibreOffice-vej har allerede en særskilt profilmappe og timeout; disse egenskaber skal bevares. En forbedring er derfor ikke blot at tilføje dem igen, men at kontrollere hele forløbet ved flere samtidige brugere.

### Hold Word og PDF sammen

Forslag: fortsæt med først at generere den konkrete DOCX og derefter konvertere den til PDF. Det giver ét dokumentindhold at efterprøve og bevarer Word-download ved PDF-fejl. En browserbaseret PDF-generator kan overvejes senere, hvis der er en konkret fordel, som opvejer et ekstra layout at vedligeholde.

Ændringer i ventetid/status, hvornår filer dannes, adfærd ved manglende figurer eller hvad en bruger kan hente, skal forelægges som konkrete adfærdsændringer. Ingen af forslagene er implementeret.

## Afprøvning før endeligt valg

En afgrænset prototype skal afprøve TypeScript-DOCX og den nuværende Python-DOCX på **samme rapportgrundlag**. Den bør ligge isoleret fra den kommende produktionsapp, så evalueringen ikke låser arkitekturen.

Cases: Standard med ét/to geonetlag, Brugerdefineret med tre lag, NX750/NX850 med interval, trafikklasse inklusive accepteret yderområde, mm/cm, lange projektnavne og tekster, tomme afsnit, fravalgte grundlagslinjer og alle relevante snitvalg. Derefter skal den samme LibreOffice-version og de samme skrifter bruges til begge PDF-konverteringer.

Acceptpunkter:

1. Samme værdier, enheder, afrundinger, produktnavne, mellemresultater, tekster og forbehold.
2. Samme valgte tabeller og figurer; ingen skjult ændring ved tomme/manglende felter.
3. Intakte skabelondele, marginer, tekststile, tabeller, header/footer og relevante Word-felter.
4. Sidevis visuel gennemgang af begge PDF'er og stikprøve i Word; forskelle forelægges brugeren.
5. Måling af kold/varm generering, billedrendering, DOCX-pakning, PDF-konvertering og samlet svartid hver for sig. Brug gentagelser og samtidige job før der konkluderes på hastighed eller kapacitet.
6. Fejlprøver: manglende billede, ugyldige data, konverteringstimeout, forældet grundlag og samtidig generering for forskellige brugere.

En prototype, der klarer disse punkter, kan give et reelt grundlag for at vælge fuld TypeScript-generering. Evalueringsarbejdet her dokumenterer gennemførligheden på biblioteks- og skabelonniveau, men har ikke endnu udført denne prøvegenerering eller en layout-/hastighedssammenligning.
