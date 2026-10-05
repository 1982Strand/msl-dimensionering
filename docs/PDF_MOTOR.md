# PDF-motor under 25 MiB pr. fil (B-078)

Undersøgt 5. oktober 2026 i `codex/pdf-motor`, uden netværk. Motor:
`@myriaddreamin/typst-ts-web-compiler` 0.7.0. Målinger på lokal Windows-maskine
med Node 26.4.0; tider er maskinafhængige og inkluderer ikke internetoverførsel.

## Valgt levering

`npm run build` kører `tools/pak-pdf-motor.ts` efter Vite. Scriptet pakker den
byggede WASM-fil med gzip niveau 9, kontrollerer den faktisk skrevne fil med
browserens udpakningsfunktion og sammenligner SHA-256 med pakkens original.
Derefter fjernes originalen fra `dist`. Alle filer i hele `dist`, også i
undermapper, kontrolleres mod **26.214.400 bytes (25 MiB)**. Kontrollen kører
dermed også i eksisterende CI samt ved »Genstart app«, som kalder `npm run build`.

`src/report/compiler.ts` henter den samme Vite-genererede URL med `.gz` tilføjet
i produktionsbygningen. I Vite-dev bruges pakkens almindelige WASM-URL.
`unpackPdfMotor` kontrollerer HTTP-status, pakker gzip ud med
`DecompressionStream('gzip')` og afviser svar uden WASM-header, fx en login-side.
Hvis HTTP-laget allerede har udpakket filen via `Content-Encoding: gzip`,
accepteres WASM-bytes direkte. HTTP-komprimering af gzip-filen fungerer også:
browseren fjerner transportkomprimeringen, hvorefter appen fjerner filkomprimeringen.
Der kræves ingen særlig MIME-type eller serverfunktion, fordi typst får bytes.

Motoren initialiseres før typst.ts' promise-cache, som hidtil, og en fejlet
hentning eller udpakning kan forsøges igen. Danske fejlbeskeder og lazy loading
bevares. Browsertesternes WASM-mønstre omfatter nu både `.wasm` og `.wasm.gz`.

Typst.ts accepterer `RequestInfo | URL | Response | BufferSource |
WebAssembly.Module`, også som promise fra `getModule`. Det er kontrolleret i
de installerede `dist/esm/options.init.d.mts`, `dist/esm/wasm.d.mts` og wrapperens
`pkg/typst_ts_web_compiler.d.ts`/`.mjs`. `Uint8Array` accepteres både af
`init({ module_or_path: wasm })` og `getModule: () => wasm`.

Gzip fungerer med almindelig statisk levering i Vite-preview, Azure og
Cloudflare, inklusive deres eksisterende adgangskontrol. Fjernserverne er
ikke afprøvet her. Der skal bruges `npm run build`, eftersom et direkte
`vite build` alene ikke udfører eftertrinnet. Browseren skal understøtte
`DecompressionStream` med gzip. Brotli vælges ikke, da samme støtte ikke kan
forudsættes i Chrome. Ingen ny pakke er nødvendig.

## Størrelser og leveringstider

| Levering           |                      Filstørrelse |              Pakning |      Lokal læsning og gendannelse, median af 5 |
| ------------------ | --------------------------------: | -------------------: | ---------------------------------------------: |
| Original           |     28.325.178 bytes / 27,013 MiB |                    — |            læsning og WASM-kompilering: 134 ms |
| Gzip niveau 9      |     10.839.742 bytes / 10,338 MiB |               1,81 s | Node zlib: 272 ms; DecompressionStream: 596 ms |
| Brotli kvalitet 11 |       7.216.543 bytes / 6,882 MiB |             199,33 s |                              Node zlib: 319 ms |
| To lige store dele | 2 × 14.162.589 bytes / 13,507 MiB | skæring og skrivning |             parallel læsning og samling: 37 ms |

Pakning er målt én gang. Gendannelse er målt med varm lokal filcache, inklusive
filindlæsning og opbygning af resultatbuffer, uden PDF-kompilering. Originalens
kompileringstid er en separat måling og skal ikke læses som en direkte
pakningssammenligning. Node genbruger muligvis WASM-kompileringscache.

Alle tre leveringsforsøg gendanner samme SHA-256:
`1fc968438a672366dfec39c96c842c26ed29caff4eb1bcaab19a6c60867de5fd`.
Gzip er valgt for mindre overførsel og én statisk fil. Deling er hurtigere ved
lokal gendannelse, men overfører 2,61 gange så mange bytes og kræver to hentninger.
Begge løsninger holder hver fil under grænsen og bevarer motoren byte for byte.
Kun gzip er implementeret i appen. `public/staticwebapp.config.json` angiver `.gz` som `application/gzip` i Azure; appen afhænger dog ikke af MIME-typen.

## Indlejrede data

WASM-sektionerne er aflæst ved parsing af sektionslængder og data-segmenter,
ikke ved at tælle alle binære matches som ressourcer. `code` er 19.098.528 bytes
(18,214 MiB); `data` er 9.152.613 bytes (8,729 MiB). De 10.118 data-segmenter
indeholder 9.070.249 payload-bytes; resten er segmentmetadata. Den eneste
custom-sektion er `producers`, 72 bytes payload og 74 bytes inklusive header.

| Ressource                             | Fund og anslået størrelse                                                                                                                                                                                                                                                                                                                                                      | Sikkerhed                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Bibliografiske stile og oversættelser | En blok på 2.661.019 bytes (2,538 MiB), ca. 93 % tekst. CBOR-lignende `e@name`, `e$text`, `locale`, CSL-makroer og licenstekster; kildehenvisninger til hayagriva/citationberg. Næsten hele blokken er bibliografidata.                                                                                                                                                        | Høj for indhold, segmentgrænsen inkluderer lidt anden data.                            |
| Syntaksfarvning                       | 63 genkendelige zlib-strømme på tilsammen 565.371 bytes; 60 med `source.` og syntaksregler på tilsammen 551.751 bytes (0,526 MiB), udpakket med `#anon_*`-kontekster. Der er flere kortere strømme/metadata. Syntect 5.3.0 og two-face 0.4.5 fremgår af indlejrede kildehenvisninger.                                                                                          | Direkte målt minimum; samlet syntaksområde er større.                                  |
| Orddeling                             | `hypher-0.1.6/src/lib.rs` findes. En stor trie-lignende blok på 1.157.705 bytes (1,104 MiB), med bogstavmønstre og binære tabeller, er kandidat til mønsterdata.                                                                                                                                                                                                               | Anslag; uden symboler/kildegenbygning kan hele blokken ikke tilskrives hypher sikkert. |
| ICU/linjebrydning                     | Markører for `segmenter/line@1`, `segmenter/lstm/wl_auto@1`, grapheme og line-break-egenskaber, samt ICU segmenter 1.5.0. Tre store tabelblokke på 321.249, 316.809 og 317.269 bytes (tilsammen 0,911 MiB) er kandidater til indlejrede modeldata. Yderligere Unicode-tabeller findes.                                                                                         | Anslag; blokke er ikke entydigt adskilt efter bibliotek.                               |
| Fonte                                 | Ingen komplette SFNT-fonte valideret ved `OTTO`, `true` eller `00 01 00 00` plus tabeldirectory. New Computer Modern, Libertinus og DejaVu forekommer i standardnavne, fontmetadata og dokumentation. Der findes derimod 14 rå CFF-fonte: ChromSans, ChromFixed, ChromSerif, ChromDingbats og ChromSymbol i en blok på 264.791 bytes (0,253 MiB), sandsynligvis PDF-basefonte. | CFF-navne og headerstruktur er direkte genkendt; blokken indeholder også metadata.     |
| Emoji                                 | Navne på emoji-fallbackfonte og Unicode-egenskaber; ingen identificeret stor emoji-font eller separat billedsamling.                                                                                                                                                                                                                                                           | Intet dokumenteret besparelsestal.                                                     |

En genbygning uden den store bibliografiblok kunne teoretisk spare omtrent
2,5 MiB data og måske kode, hvilket alene er mere end overskridelsen på
2,013 MiB. Begrænset syntaksfarvning kunne også give en mindre besparelse.
Det kræver kildekode, feature-/ressourceændringer og ny kontrol af funktionerne;
R6 alene beviser ikke, at alle funktioner bevares. Orddelings- og
linjebrydningsdata påvirker layout og bør ikke fjernes. Der er intet belæg
for en stor besparelse ved at fjerne de nævnte standardskrifter. Ingen data
eller funktioner er fjernet i denne prototype.

## R6 og øvrige kontroller

`tools/build-r6-pdfs.ts` bruger `tools/report-pdf-builder.ts`, som oprindeligt
altid læste motoren fra `node_modules`. Builderen accepterer nu
`PDF_MOTOR_WASM` som eksplicit sti til almindelig eller gzip-pakket WASM.
Uden variablen bevares den hidtidige kilde. R6-scriptet og godkendte
kontrolsummer er uændrede.

Kontrol af den byggede motor i PowerShell:

```powershell
$env:Path = "C:\Program Files\Git\ucrt64\bin;$env:Path"
$env:PDF_MOTOR_WASM = (Get-ChildItem dist/assets/typst_ts_web_compiler_bg-*.wasm.gz).FullName
node tools/build-r6-pdfs.ts
```

Gzip fra `dist`: **31/31 PDF'er byte-identiske**, indholds- og layoutdelkontrol
består; hele R6-kørslen tog 11,00 s. Den almindelige kørsel uden variablen
(pakkens original) består også og tog 9,63 s. Største fil blandt 37 `dist`-filer er motoren
på 10,338 MiB. `npm run typecheck`, `npm test` (3.048 tests),
`npm run format:check` og `npm run build` består. De nye Node-tests bruger en
midlertidig mappe og tager ca. 3,4 s uden at genbygge hele appen. Rapportens
browsertests køres af Claude.

## Binaryen

Binaryen 132 bruges kun til undersøgelsen, ikke til den valgte løsning.
`--detect-features` alene fejlede validering. Validering består med de eksplicitte flag
`--enable-bulk-memory --enable-sign-ext --enable-mutable-globals
--enable-nontrapping-float-to-int`. Ingen navne- eller debugsektion findes,
og fjernelse af `producers` alene kan højst spare 74 bytes.

| Variant                            |                     Størrelse |              Binaryen-tid | R6                             |
| ---------------------------------- | ----------------------------: | ------------------------: | ------------------------------ |
| `-Os`                              | 28.259.380 bytes / 26,950 MiB |                  365,36 s | 31/31 identiske; 9,51 s        |
| Derefter kun `--strip-producers`   | 28.281.298 bytes / 26,971 MiB |        yderligere 27,49 s | 31/31 identiske; 10,73 s       |
| `-Oz --strip-producers`            | 27.499.691 bytes / 26,226 MiB |                  440,77 s | 31/31 identiske; 9,65 s        |
| `-O3 --strip-producers`            | 28.456.807 bytes / 27,139 MiB |                  600,15 s | 31/31 identiske; 9,76 s        |
| `-Oz --strip-producers --converge` |             Ingen resultatfil | 1.219,37 s før afbrydelse | Ikke mulig uden en resultatfil |

`-Os` sparer 65.798 bytes, men er stadig over grænsen. Den separate strip-kørsel
fjernede `producers`, men Binaryens skrivning uden optimeringsniveau øgede
kodeafsnittet med 21.992 bytes. Den samlede ændring er derfor **+21.918 bytes**;
strip-kørslen er ikke en ren fjernelse af 74 bytes i filen. Datasektionen er
uændret i begge varianter. Begge motorer validerer og virker i hele R6-sættet.

`-Oz --strip-producers` giver 27.499.691 bytes / 26,226 MiB på 440,77 s.
Motoren validerer, og alle 31 R6-PDF'er er identiske (9,65 s). Besparelsen er
825.487 bytes, men den er fortsat 1,226 MiB over grænsen.

`-O3` er større end originalen. Alle færdige varianter validerer og virker,
men ingen er under 25 MiB. `--converge` blev afbrudt ved en afgrænset
20-minuttersmåling (faktisk 1.219,37 s vægtid / 1.169,97 s CPU-tid).
Binaryen havde endnu ikke skrevet nogen resultatfil. Der er derfor intet
størrelses- eller R6-resultat for denne variant, og det er ikke påvist, at
konvergens ikke kan nå under 25 MiB med en længere kørsel. Den valgte løsning
afhænger ikke af dette forsøg. Den oprindelige fulde målematrix blev afbrudt
efter `-Os`, og ovenstående varianter blev herefter kørt separat.

Eksempel på reproduktion (lang kørsel; målt på kopier i `.local/pdf-motor/`):

```powershell
node node_modules/binaryen/bin/wasm-opt `
  node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm `
  --detect-features --enable-bulk-memory --enable-sign-ext --enable-mutable-globals `
  --enable-nontrapping-float-to-int -Oz --strip-producers `
  -o .local/pdf-motor/Oz-strip-producers.wasm
$env:PDF_MOTOR_WASM = (Resolve-Path .local/pdf-motor/Oz-strip-producers.wasm).Path
node tools/build-r6-pdfs.ts
```

Optimeringstiderne er hele CLI-kørsler inklusive indlæsning, validering og
skrivning. Nogle varianter blev målt samtidig og kan være påvirket af CPU-belastning.
Ingen optimeret motor er lagt i `dist` eller anvendt af appen.

## Aflevering

Ændrede filer: `package.json`, `src/report/compiler.ts`, `src/report/pdf-motor.ts`,
`tools/pak-pdf-motor.ts`, `tools/report-pdf-builder.ts`, `tests/pdf-motor.test.ts`,
`tests/browser/report.spec.ts` og denne dokumentation. Ingen commits eller merges.
Beslutningslog, referencefiler og godkendte R6-kontrolsummer er urørte.
Forsøg, motor-kopier og logfiler er gemt lokalt i `.local/pdf-motor/`, uden for Git.

Åbne kontroller: Claude kører rapportens browsertests; ingen preview eller
fjernudrulning er startet her. En længere konvergenskørsel kan eventuelt
undersøges særskilt. **Binaryen skal ikke være en fast udviklingspakke for
gzip-løsningen.** Der er ingen nye afhængigheder.
