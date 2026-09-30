# M1: »Sådan er resultatet beregnet« — tekst og tal

Status 30.09.2026: tekst/tal er implementeret og referencekontrolleret.
Browserkontrol og de to figurer udestår. Grundlaget er den isolerede
referencecommit `a330cfd6734ac2478be1304a362c69f94e412d25`.

## Reference og omfang

Claude har uden for sandkassen optaget `reference/kobling-cases.json` med
`tools/capture_kobling_reference.py --record` og bekræftet en ny optagelse i
sammenligningstilstand: »Eight M1 cases match exactly« (oplyst i opgaven).
Referencefilen og optageværktøjet er ikke ændret i denne fortsættelse.
Gammel Python er ikke forsøgt kørt, jf. den seneste instruktion.

| Case | Kontrolleret forløb |
| --- | --- |
| FIG-001 | Standard/BK4/Eᵤ10/mm, ugyldig 2-lagskurve udelades |
| FIG-002 | Standard/BK4/Eᵤ5/mm, intervalprodukt NX850 |
| FIG-004 | Brugerdefineret/BK4/Eᵤ5/cm, materialekorrektion og begge lag |
| TR-1 | Standard/T4/Eᵤ10/mm, direkte VejDim-kørsel og seks trin |
| TR-2 | Brugerdefineret/T4/Eᵤ7/cm, log-interpolation og seks trin |
| OUT-1 | Afvist T1/Eᵤ10: sektionen skjules |
| OUT-2 | T1/Eᵤ10 med VejDim-yderregel: caption, ingen trin |
| PH-2 | Brugerdefineret/BK4/Eᵤ5/mm, søjlemetode og lagets egen φᵥ |

`kobling-explanation.ts` danner titel, kilde, formler, regnelinjer, resultater,
noter, captions og figurpladser som strukturerede tekst-/elementdata.
`CouplingExplanation.tsx` gengiver dem med React i et `<details>`, lukket fra
start. HTML-strenge fra referencen indsættes aldrig i appen.

Trafiktrinenes mellemresultater genbruger `eoSteps` fra `table-explanation.ts`.
Diagramopslag, vægtede materialedata, eksakte/afrundede motorresultater og
afrundingstillæg genbruger de eksisterende motorfunktioner. Dimensioneringen
genberegnes ikke i forklaringen. Belastningsklasse viser fire trin, og de to
gyldige trafikcases viser seks. Manglende kurver og resultater udelades efter
originalens betingelser. Eksakte værdier bruges i regnelinjerne; oprunding
tilføjes som eget led, og overskriften viser den færdige tykkelse.

## Kontrol

Alle otte cases sammenlignes uden tolerance med referencefilens felter og
`original_html`. Testene kontrollerer titel, åbningstilstand, synlighed,
trinrækkefølge, kilde, chip, resultat, noter, formler, enheder samt
figurcaptions/signaturtekster. Tekstkroppens strukturerede data serialiseres
udelukkende i testen og sammenlignes præcist med `body_html`; dermed
kontrolleres også kortene, fremhævelser, mellemrum, indrykninger og linjeskift.

Optagelsens normalisering adskiller Streamlit-, kolonne- og figurindpakning.
Afledte tekstfelter fjerner præsentationstags og afkoder HTML-entiteter;
formler opdeles ved eksisterende linjeskift. HTML-kroppe og SVG bevares.
Testens serialisering bruger originalens HTML-escaping; ingen tekst, tal
eller mellemrum normaliseres for at få sammenligningen til at bestå.

| Kontrol | Resultat i worktree |
| --- | --- |
| `npm run typecheck` | Bestået |
| `npm test` | 2.765 tests bestået, heraf otte nye M1-cases |
| `npm run format` | Bestået |
| `npm run format:check` | Bestået |
| `npm run build` | Bestået; Vites advarsel om bundles over 500 kB |
| Ny Python-optagelse i sammenligningstilstand | Ikke kørt efter seneste instruktion; Claudes bekræftelse ovenfor er grundlaget |
| `npx playwright test tests/browser/kobling.spec.ts` | Testen findes, men browserstart blokeres med `browserType.launch: spawn EPERM` |

Npm/npx køres via `.cmd`, fordi PowerShell blokerer `.ps1`-launcherne.
Browsertesten dækker lukket start, åbning med mus/tastatur, fire/seks trin,
figurpladser, mobilbredde, afvisning og sidefejl. Disse browserassertioner er
endnu ikke kørselsverificeret.

## Udestående og afgrænsning

`_kob_figur_koersler` og `_kob_figur_diagram` er ikke implementeret her.
Deres plads markeres midlertidigt med en diskret ramme »Figur følger«;
originalens captions og signaturtekster følger med. Figurargumenter og SVG
ligger uændret i referencen til den senere figuropgave. Samlet visuel kontrol
og eventuel forelæggelse håndteres af Claude efter projektets arbejdsgang.

Ingen beregningsregler er ændret, og ingen originalfejl er rettet. Originalens
tekster er gengivet uændret.
