# M1: »Sådan er resultatet beregnet« — tekst, tal og figurer

Status 01.10.2026: tekst/tal og de to figurer er implementeret og referencekontrolleret.
Browserkontrol og visuel godkendelse udestår. Grundlaget er den isolerede
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
`CouplingExplanation.tsx` gengiver dem med React i én shadcn `Accordion`, lukket fra
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
figurcaptions/signaturtekster (figurmodellen udelades kun fra denne tekstsammenligning). Tekstkroppens strukturerede data serialiseres
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
| `npm test` | 2.804 tests bestået, heraf 20 nye figurtests og de eksisterende M1-/M5-tests |
| `npm run format` | Bestået |
| `npm run format:check` | Bestået |
| `npm run build` | Bestået; Vites advarsel om bundles over 500 kB |
| Ny Python-optagelse i sammenligningstilstand | Ikke kørt efter seneste instruktion; Claudes bekræftelse ovenfor er grundlaget |
| `npx.cmd --no-install playwright test tests/browser/kobling.spec.ts tests/browser/personal-diagram.spec.ts` | Begge forsøgt; browserstart blokeres med `browserType.launch: spawn EPERM` |

Npm/npx køres via `.cmd`, fordi PowerShell blokerer `.ps1`-launcherne.
Browsertesten dækker lukket start, åbning med mus/tastatur, fire/seks trin,
begge figurer i trafikcasen, hover på resultatpunkt og kørt punkt,
piletaster/Escape, forklaringsboks inden for figuren ved mobilbredde,
afvisning og sidefejl. Disse browserassertioner er
endnu ikke kørselsverificeret.

## Figurer og figurkontrol

`kobling-figures.ts` modtager de samme aktive tabeller, VejDim-kørsler,
Eₒ/naboer, φᵥ/net-korrektioner og eksakte resultatpunkter, som M1-forklaringen
bruger. Originalens opslag genbruger motorens `slaa_op_interp`.
Skalaernes 8 % luft og inddelingerne er porteret fra `_kob_skala` og
`_kob_akse_ticks`: Eᵤ-aksen er logaritmisk i kørselsfiguren og lineær i
designdiagrammet. Tomme/for korte kurver skjules efter originalens betingelser.

`kobling-figures-svg.ts` gengiver selvstændig SVG uden DOM i variant 4-stil
(B-034/B-035): temaets farver, hårfint gitter, stiplede nabokurver,
decimalkomma og signaturboks øverst til højre. Caption og signaturposter
bevares. Unikke id-præfikser bruges på skærmen; samme renderer kan bruges
ved rapporteksport. `CouplingFigure.tsx` tilføjer hover på nærmeste datapunkt
på den aktive kurve/punktserie med forrang til resultatpunkter, glorie, ring
og forklaringsboks afgrænset til figuren. Piletaster og Escape understøttes.
M5's implementation og tests er uændrede.

`tests/kobling-figures.test.ts` dækker alle **otte figurkald** i referencen
(to kørselsfigurer og seks diagramfigurer):

- Rå data sammenlignes uden tolerance med de originale argumenter:
  kørslernes SG + BL, brugerens Eᵤ/ubundne krav, alle korrigerede
  kurveknudepunkter, nabokurvernes Eₒ, resultatpunkternes værdier/roller/ringe
  og akseområderne. Kurver rekonstrueres uafhængigt fra den optagne tabel og
  originalens korrektionsformel i testen.
- Originalens SVG kontrolleres for antal/rækkefølge af kurver og punkter,
  stiplede naboer, markeringer og hjælpelinjer. SVG'ens koordinater afkodes
  til intervaller i dataenheder og kontrolleres mod modellens værdier.
  Intervallerne udtrykker alene den gemte SVG's afrunding til 0,1 SVG-enhed;
  de er ikke en tolerance for motorværdier. Nye pixelkoordinater sammenlignes
  ikke med originalens (B-034).
- Inddelingers værdier/etiketter, aksetitler, klasseetiketter, markeret Eᵤ,
  captions og signaturposter sammenlignes med originalens tekster.
- SVG kontrolleres for determinisme, escaping, id-præfikser og fravær af
  `NaN`/`Infinity`. Supplerende cases dækker aktive brugerdata, tomme/for korte
  kurver, identiske skalaværdier og inddelingstrin på 2,5.

## Udestående og afgrænsning

Samlet visuel kontrol og godkendelse af de konkrete M1-figurer håndteres af
Claude efter projektets arbejdsgang. OUT-2 er fortsat en randkurve-case med
caption og ingen trin/figurer i referencen; den dækkes ikke af de otte
figurkald. Eventuelt yderligere figurgrundlag for OUT-2 udestår.
Referencefilen og `tools/capture_*` er uændrede.

Ingen beregningsregler er ændret, og ingen originalfejl er rettet. Originalens
tekster er gengivet uændret.

## B-038: originalens opstilling og stil

Ét Accordion-punkt, lukket fra start, viser alle trin på én gang.
`src/ui/coupling.css` overfører originalens `.kob-*`-regler: trinhoved med
inline-kilde, højrestillet resultat/note, indrykning, formelbokse, klassekort,
chips, figurkort med prik-/ringsignatur og figurtekst, lagkolonner,
skillelinjer og fodnote. Mål, afstande, skriftstørrelser, vægte og bruddet
ved 1100 px bevares. Temaets tekst-, grå-, kant- og primærfarver bruges,
hvor de har en tilsvarende rolle; øvrige originalfarver bevares.
Skrift og farver følger B-040. Farver som de originale designdiagrammer: 1 lag `#2a78d6`, 2 lag lilla `#7b1fa2`, indtastet opbygning rød `#b42318`. Tekst følger appens skrift; kun regnestykker bruger fastbreddeskrift som `.formula`.
Figurens dublerede SVG-signatur skjules på skærmen til fordel for originalens
signatur under figuren; hover og SVG-rendererens standard til eksport bevares.
Tekster, tal, beregninger og referenceforventninger er uændrede.
