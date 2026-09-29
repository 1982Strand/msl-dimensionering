# Projektets faste rammer
- Arbejdsmappe C:\MSL-Dimensionering; gammel app C:\geonet_beregning er skrivebeskyttet reference i migreringsarbejdet.
- Fast referencecommit a330cfd6734ac2478be1304a362c69f94e412d25. Brug tools/legacy_reference.py: frisk git archive uden lokale brugerfiler. Importér aldrig den aktive gamle arbejdsmappe til referencekørsler.
- Beregningsmotor omskrives til TypeScript efter B-014. Brugeren skal godkende funktionelle afvigelser; heller ikke kendte gamle fejl rettes implicit.
- reference/core-cases.json og øvrige referenceforventninger må ikke overskrives for at få tests til at bestå. Bevar indbyggede standarder, ikke brugerdefinerede JSON-filer.
- src/engine er uafhængig faglogik; app.py indeholder yderligere sammensætning og tilstand, som ikke er dækket alene ved at portere core.
- Numerik og stil: `mem:conventions`. Stack og rapportforbehold: `mem:tech_stack`. Kørsler: `mem:suggested_commands`. Afslutningskontrol: `mem:task_completion`.
- Lokale rapportpakker, kundedata og reference-private må ikke til Git. Design/opbygningsfigurer kræver særskilt godkendelse; rapportfinpudsning er udskudt af brugeren (B-013).