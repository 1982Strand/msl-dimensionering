# Temaudkast (B-042)

Direkte adgang: `/#temaudkast`. Siden er skjult fra navigationen og er kun til forelæggelse. Hvert afsnit kan skiftes mellem Forslag (levende shadcn-komponenter med appens rigtige tekster og data) og Nu (udklip af de rigtige sider i `public/temaudkast/`). De rigtige sider er uændrede, indtil forslaget er godkendt.

## Kortlægning af nuværende stil

- **Farver og skrift:** CSS'en har 73 hårdkodede farvekoder, heraf 12 nuancer af grå tekst, og 18 skriftstørrelser fra 8,5 til 34 px.
- **Knapper:** den globale regel `button, input { font: inherit }` ligger uden for Tailwinds lag. Den tvinger alle shadcn-knapper op i 16 px ved siden af tekst i 13 px.
- **Tabeller:** de globale regler for `table`, `th` og `td` (`min-width: 1030px`, faste kolonnebredder) har krævet lokale nulstillinger flere steder.
- **Beskeder:** der er fem forskellige boksetyper (`warning-banner`, `info-banner`, `.message`, `settings-note` og Gælder-boksen).
- **Øvrige forskelle:**
  - afsnitsnumre som »1« og »01«;
  - stien skifter mellem »Grunddata« og »Opslag«;
  - native valglister, afkrydsningsfelter og skydere står ved siden af shadcn-felter;
  - resultatfliserne viser reduktionen i fastbreddeskrift.

## Forslag

1. **Farver og skrift:**
   - ti farver: baggrund, kort, tekst, dæmpet tekst, kant, primær, topbjælke, fremhævet, advarsel og fejl;
   - seks skriftstørrelser: 28, 16, 14, 13, 12 og 11 px;
   - Segoe UI bevares;
   - tal får ens cifferbredde.
2. **Topbjælke og sidehoved:**
   - topbjælken er 56 px;
   - ens sidehoved på alle sider;
   - stien følger menuens grupper;
   - Tilstand og belastningsklasse 1–6 vises som segmenterede knapper, der stadig er radioknapper for tastatur og skærmlæser.
3. **Afsnitskort og felter:** shadcn Card, RadioGroup, Slider og Label. Skyderens værdi står til højre for etiketten, og »Se designdiagram« får ikon.
4. **Resultat:**
   - ens resultatfliser;
   - reduktionen i almindelig skrift;
   - »Tyndest« som mærke;
   - produktvælgeren er uændret.
5. **Indstillinger:**
   - valglister bliver shadcn Select;
   - afkrydsningsfelter og radioknapper bliver shadcn Checkbox og RadioGroup;
   - »Gælder: …« bliver et mærke;
   - brødtekst i 14 px.
6. **Beskeder:** shadcn Alert i udgaverne info, advarsel og fejl, hver med ikon.
7. **Tabeller og knapper:**
   - lavere rækker og højrestillede tal;
   - knapper i 14 px med ikon og én hovedknap pr. side;
   - de globale tabelregler fjernes.
8. **Rapport:** tydelige faner med ikon og »Ikke udfyldt« som mærke.

Tekster, tal, valg og beregninger er uændrede. Nye shadcn-komponenter i udkastet er Card, Checkbox, RadioGroup, Select, Slider og Label. De bruger den eksisterende `radix-ui`-pakke, så der er ingen nye afhængigheder.
