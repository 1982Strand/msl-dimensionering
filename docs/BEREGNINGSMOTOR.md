# TypeScript-beregningsmotor

Bemærkning 01.10.2026: Rapportforsøget `spikes/report-typescript/` og kommandoen `npm run test:reports` er fjernet ved oprydningen (B-059). Omtaler nedenfor bevares som historik; forsøget findes i Git-historikken.

Implementeret efter brugerens B-014 den 29. september 2026. Reference: `a330cfd6734ac2478be1304a362c69f94e412d25`. Der er ingen godkendte ændringer af faglige regler eller standardværdier.

## Implementeret og sammenlignet

| Område | TypeScript | Kontrol / funktioner |
| --- | --- | --- |
| Data og standarder | `src/engine/data.ts`, `defaults.json` | Indbyggede tabeller, produkter, materialer og grænser udtrukket fra referencecommitten; F-02.2/3, datadelen af F-03.1 |
| Beregning | `calculator.ts` | Opslag, Eo-interpolation, korrektion, minimum, reduktion, koblet phi og konservativ afslutning; F-03.2/3, F-06.4 |
| Trafik | `traffic.ts` | VejDim, logaritmisk interpolation, ækvivalent Eo, yderområder; F-04.1/2 |
| Oprunding og lag | `afrunding.ts`, `lagfordeling.ts` | Trin, fordelinger, VD-minima, restlag, friktionsvinkel; F-05.1/2, beregningsdelen af F-06.1–6 |
| Produkter og placering | `products.ts`, `placement.ts` | Produkttabeller, intervaller, grupper, dæklag, afstande og overlæg; F-02.10, F-07.1/2 |
| Validering og enheder | `validators.ts`, `enhed.ts` | Fejl/advarsler/anbefalinger, mm/cm; F-08.1/2, F-10.1 |
| Sammensat dimensionering | `dimensionering.ts` | Grundlag, klasseminimum, Standard/Brugerdefineret, materialevægtet/manuelt phi, produktvalg og seneste rapportdata; beregningsdelen af F-02.5–10, F-06.5 og F-12.1 |

Motoren har ingen afhængighed af Python, Streamlit, React eller Typst. `dimensioner()` modtager input, aktive tabeller, materialer og indstillinger og returnerer samme dimensioneringsdata som den gamle app. Et blokeret forløb returnerer `null`; den kommende tilstandsstyring skal dermed rydde det gamle resultat som originalen. Inputobjekter ændres ikke af beregningen.

Programmets standarddata indeholder ikke testcasenes forventede resultater. Redigerede tabeller kan sendes direkte til motoren. Normalisering, kurveinterpolation, tabelopbygning, JSON-indlæsning og beslutninger om gemning er nu flyttet til rene funktioner; se `DATAREDIGERING.md`. React-editor og fysisk lagring udestår.

## Præcision og bevis

- 2.062 originale cases består med præcis sammenligning af alle felter, beskeder, lister og mellemresultater.
- 255 ekstra frosne Python-cases kontrollerer bl.a. halve tal, negative tal, binære decimalgrænser, formatering, ugyldige indstillinger og manglende/redigerede tabeller.
- 17 aktive dimensioneringssnapshots genskabes ud fra registrerede kontroller og indbyggede materialer. Testen bruger ikke de forventede beregningsresultater som input. Hele rapportpayloaden sammenlignes, inklusive minimum, placering og produktintervaller.
- Tre ekstra kontroller sikrer forventet dækning og standardindstillinger: i alt **2.337 beståede tests på Node 24.19.0**. Streng TypeScript-kontrol og formateringskontrol består.

Python `round()` og decimalformatering kan ikke erstattes direkte af JavaScripts `Math.round()`/`toFixed()`. `python-numbers.ts` afrunder derfor den præcise binære talværdi med BigInt og samme regel ved halve tal som Python. Den særskilte faglige phi-afrunding bevarer originalens egen regel. Eksisterende sammenligningsgrænser i originalen er bevaret; der er ikke indført migrationstolerancer.

Referenceforventningerne ændres ikke for at få TypeScript til at bestå. Kontrollerne dokumenterer overensstemmelse med originalen for det registrerede omfang; de er ikke en selvstændig ingeniørfaglig godkendelse af metoden.

## Resterende arbejde

1. Tilslut de porterede datafunktioner til React-editor, nulstilling og den aftalte lagring. Normalisering, tabelopbygning, JSON-indlæsning og korrelationer er kontrolleret mod 236 nye forventninger; samlet 2.582 tests består. CSV og UI-forløb udestår.
2. Flyt tilstandsstyring, navigation, referencegrupper og appens samlede status-/forklaringstekster. De 17 tests genskaber beregningerne, men betjener ingen React-kontroller.
3. Kontroller flere kombinationer af indstillinger i hele forløbet, herunder under-minimum-valg, slettede materialer, produktfallback og ustabil phi-kobling. De enkelte kernemoduler har bredere dækning end de sammensatte forløb.
4. Byg React/Vite/shadcn-grundlaget og gennemfør browserkontrol. Visuelle udkast og figurgeometri kræver særskilt accept.
5. Flyt rapportens faglige tekst-/tabeldannelse og figurpipeline; tilslut Typst til de samme motorresultater. Prototypen bruger endnu de oprindelige rapporttekster og billeder.
6. Aftal adgang, personlige/fælles data, Word-behov og produktionsdrift før offentliggørelse.

## Serena og Semble

Semble er anvendt til at lokalisere kode og dokumenter i begge repositories. Serena er aktiveret i den nye projektmappe; `.serena/project.yml` har TypeScript og Python, og projektets arbejdsregler, kommandoer og referencekrav er gemt som projekthukommelse.

Den allerede kørende Serena-MCP-session beholdt sin tidligere Python-konfiguration. TypeScript-sprogserveren blev derfor startet og brugt gennem Serenas CLI til indeksering af de nye TypeScript-symboler. Ved en ny MCP-session skal den gemte konfiguration indlæses. Dette begrænser ikke motorens drift eller test.

```powershell
serena project index-file src/engine/dimensionering.ts C:\MSL-Dimensionering
serena memories check C:\MSL-Dimensionering
```

På Windows kan CLI-output kræve `PYTHONIOENCODING=utf-8`, fordi Serenas kontrolresultat indeholder Unicode-tegn.

## Supplerende dataleverance

`editing.ts`, `input-values.ts` og `correlation.ts` flytter reglerne for materialer, diagramtabeller, VejDim-rækker og indstillinger. Se [DATAREDIGERING.md](DATAREDIGERING.md) for referencegrundlag og præcis afgrænsning. De 2.337 tests ovenfor beskriver første motorleverance; samlet består nu 2.582.
