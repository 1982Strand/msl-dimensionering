# PDF-motor

PDF'er kompileres i browseren med Typst via `@myriaddreamin/typst-ts-web-compiler` og `@myriaddreamin/typst.ts`. Skabeloner ligger i `src/report/typst/`. Rapportdata, figurer og firmaprofil holdes adskilt.

Efter Vite pakker `tools/pak-pdf-motor.ts` compilerens WASM med gzip og kontrollerer, at den udpakkede fil er byte-identisk med pakken. Browseren henter og udpakker filen med `DecompressionStream`. Komprimeringen ændrer ikke motoren, rapportteksterne eller PDF-resultaterne.

Motoren fylder ca. 27,01 MiB udpakket og 10,34 MiB pakket. Komprimeringen mindsker overførsel hos enhver udbyder; udbyderspecifikke filgrænser kontrolleres særskilt under `hosting/`.

`tests/pdf-motor.test.ts` afprøver gzip, byte-identitet og fejltilstande. `tools/build-r6-pdfs.ts` kontrollerer det godkendte rapportsæt. Kontrolsummerne i `tools/r6-godkendt.json` må ikke overskrives for at acceptere en ændring.
