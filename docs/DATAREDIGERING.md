# Migrering af redigerbare grunddata

Reference: `a330cfd6734ac2478be1304a362c69f94e412d25`, indbyggede standarder. Denne leverance flytter databehandlingen; den indfører ikke en ny redigeringsarbejdsgang.

## Implementeret

`src/engine/editing.ts` og `input-values.ts` indeholder:

- Normalisering af materialer, heltalsafrunding, grænser, tomme felter, dubletnavne og udfyldning af manglende maskekrav fra standarden. Navnesammenligningen følger Pythons Unicode-casefold, også når almindelig konvertering til små bogstaver ville give et andet resultat.
- Normalisering af diagramrækker og de seks diagrammer, gamle kolonnenavne, dubletfejl og direkte opbygning af beregningstabellen. Tomme felter bevares som manglende værdier; der indføres ikke automatisk interpolation af brugerens tomme celler.
- Den oprindelige interpolation mellem aflæste kurvepunkter, inklusive afrunding og afvisning uden for punktområdet.
- Normalisering af VejDim-rækker, supplering med manglende standardrækker, materialetekster og genberegnede totaler. Duplikerede T/Eu-rækker behandles som originalen; der indføres ikke nye afvisningsregler.
- Samlet normalisering af indstillinger, indlæsning fra JSON-tekst og samme kontrollerede fallback til standard. VejDim-filer accepterer fortsat BOM, hvor de øvrige loaders følger den gamle apps adfærd.
- Beskrivelse af gemmehandlingen som `write` med data eller `delete`, når VejDim-data svarer til standarden. Det kommende lag for lagring skal udføre handlingen på den aftalte placering.

`src/engine/correlation.ts` indeholder korrelationstabellens værdier og detaljer, trafikklassernes Eu-interval, oversættelse fra anbefalede belastningsklasser og de eksisterende betegnelser/nøgletal.

De nye funktioner returnerer selvstændige data. Den oprindelige udfyldningsfunktion ændrede listen på stedet; TypeScript-versionen giver de samme værdier uden at ændre kalderens input. Det er intern strukturering, ikke en ændring af værdier eller brugerforløb.

## Reference og kontrol

Før TypeScript-implementationen blev **150 forventninger** registreret i `reference/editing-cases.json`. Værktøjet udtrækker og kører de uændrede funktionsdefinitioner og konstanter fra den fastlåste `app.py`, sammen med de rigtige core-moduler. Det undgår at starte Streamlit ved import. Filindlæsning og gemning udføres af originalfunktionerne i en midlertidig udpakning af referencecommitten.

Yderligere **86 forventninger** i `reference/data-flow-cases.json` kontrollerer korrelationer, trafiktekster og seks forløb fra redigerede diagram-/VejDim-data og indstillinger til beregningsresultat. Dette er sammensætning af originale funktioner, ikke betjening af tabeller i en browser.

Alle 236 nye forventninger matcher præcist. Sammen med to dækningskontroller og de tidligere tests består **2.575 tests** på Node 24.19.0. Der er ingen migrationstolerance. Streng TypeScript-kontrol består. Oprindelige referencefiler er uændrede; de nye sæt er supplerende.

```powershell
npm run typecheck
npm test
npm run format:check
& C:\geonet_beregning\.venv\Scripts\python.exe -X utf8 tools/capture_editing_reference.py
& C:\geonet_beregning\.venv\Scripts\python.exe -X utf8 tools/capture_data_flow_reference.py
```

Begge optageværktøjer afviser overskrivning af eksisterende forventninger. Unicode-tabellen er udtrukket fra det samme Python-miljø og kontrolleres ved genkørsel.

## Afgrænsning og næste trin

Der er endnu ingen React-tabeleditor eller fysisk lagring bag de nye funktioner. Lagringssted, brugeradgang og personlige/fælles data er fortsat åbne valg. Browserens navigation, aktuelle inputfelter, gemmestatus, nulstillingsknapper, CSV-eksport og alle fejl ved fysisk filadgang er ikke dækket af denne leverance. De skal kobles til og afprøves særskilt.

Kontrollen omfatter de registrerede gyldige, tomme og ugyldige inputs; den beviser ikke håndtering af enhver tænkelig håndredigeret fil. I originalen kan visse ugyldige typer og ikke-endelige tal udløse undtagelser. Den registrerede `OverflowError` ved en uendelig materialevinkel er bevaret; en pænere brugerfejl kræver egen aftale.

Brugerens ønskede forbedringsforslag ligger i [REDIGERINGSFORSLAG.md](REDIGERINGSFORSLAG.md). De er adskilt fra denne portering og afventer godkendelse. Ingen kladde, fortryd-funktion eller ændret gemmetidspunkt er indført endnu.
