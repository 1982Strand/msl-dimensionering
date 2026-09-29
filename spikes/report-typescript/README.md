# Rapportprototype med TypeScript og Typst

Isoleret afprøvning, ikke produktionskode eller godkendt rapportdesign. Beregninger og formatering af faglige værdier udføres fortsat af den fastlagte Python-reference. TypeScript kontrollerer de færdige rapportdata og starter Typst med en fast skabelon. Typst genberegner ingen dimensioneringsresultater.

## Indhold

- `prepare_reference.py`: kører den uændrede gamle Word-bygger med ti syntetiske cases og observerer dens faktiske skabelondata. Manglende/tomme tekster behandles af originalen. Resultatet sammenlignes med `reference/report-contexts.json`; `--record` afviser overskrivning.
- `compile.ts`: valideret JSON → separat midlertidig mappe pr. job → Typst → PDF. Ingen eksterne TypeScript-pakker; afprøvet med Node 24.19.0 og indbygget TypeScript-understøttelse. Der er endnu ikke en separat `tsc`-kontrol.
- `report.typ`: foreløbig sideopsætning med den eksisterende rapports rækkefølge, tekst og brand som sammenligningsgrundlag. Layout, skrifter og sideskift er ikke en identisk portering.
- `compile.test.ts`: inputkontrakt, stier, tekst som data, gentagelighed og adskillelse af samtidige job.
- `check_pdfs.py`: sammenholder PDF-tekst med alle dynamiske tekst-/tabelværdier. Kun blanktegn, soft hyphens og eksakt kendt sidehoved/-fod normaliseres. Desuden kontrolleres de to Typst-figurers afkodede RGB-pixels mod inputbillederne.
- `export-word-pdf.ps1`: referencekonvertering via en separat skjult Word-instans. Input åbnes skrivebeskyttet og lukkes uden at blive gemt. Ingen igangværende Word-dokumenter tilgås. Scriptet har endnu ingen ekstern watchdog ved en fastlåst COM-konvertering og er kun et lokalt referenceværktøj.

## Gentag på denne Windows-arbejdsplads

Kør fra `C:\MSL-Dimensionering`. `NODE_BIN` og `ARTIFACT_PYTHON` nedenfor betegner de absolutte runtime-stier fra workspace dependency loader; brug det leverede Node 24 og Python til TypeScript/PDF-kontrollen. Referencen kræver særskilt den gamle apps eksisterende miljø for at reproducere dens pakker.

```powershell
& .\spikes\report-typescript\setup-typst.ps1
& 'C:\geonet_beregning\.venv\Scripts\python.exe' spikes/report-typescript/prepare_reference.py
& .\spikes\report-typescript\export-word-pdf.ps1 -InputDirectory .local/report-prototype/baseline -OutputDirectory .local/report-prototype/baseline-pdf
& $NODE_BIN spikes/report-typescript/compile.ts
& $NODE_BIN --test spikes/report-typescript/compile.test.ts
& $ARTIFACT_PYTHON spikes/report-typescript/check_pdfs.py
```

Compilerprogrammet gemmes kun under `.local`, versionsfastlåst til 0.15.1 med SHA-256 fra GitHubs releaseasset. Ingen global installation eller Typst-cloudkonto bruges. JSON, billeder, DOCX, PDF og målinger ligger under `.local/report-prototype/`; kun syntetiske referenceforventninger og kontrolresultater indgår i Git.

## Begrænsninger

De to testbilleder kommer fra den gamle apps registrerede standardfigurer, eksporteres én gang og genbruges i begge rapportmotorer. Det tester dokumentets billedindsættelse, ikke rapportsidens snitvalg, billedopbygning eller en portering af Plotly til TypeScript. Andre cases er bevidst uden billeder.

LibreOffice fandtes ikke i den tilgængelige runtime. Dokumentværktøjets `render_docx.py` fejlede derfor med `LibreOffice soffice.exe was not found on PATH`. Den eksisterende Windows-vej med Word 16.0 blev anvendt til reference-PDF; Poppler renderede PDF-sider til visuel kontrol. Ingen DOCX leveres som nyt færdigt dokument, og LibreOffice/serverresultater er fortsat uafprøvede.

Calibri og Arial fra denne Windows-installation bruges i prototypen. Den gamle skabelon refererer til Helvetica-varianter, men den lokale Word-PDF bruger faktisk Calibri/Arial. En serverudgave kræver aftalte, tilgængelige fonte og særskilt layoutkontrol. Der er ikke kopieret fonte ind i repository.

Kun standardeksemplets tre sider i begge motorer er visuelt gennemgået i fuld størrelse. De øvrige ni cases har automatisk indholds-/strukturkontrol; de er ikke visuelt godkendt. PDF/UA, PDF/A, mobilvisning, browsergenerering, produktionskø og fuld migreringskorrekthed er ikke verificeret.
