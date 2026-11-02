# Indstillinger

Indstillingerne styrer blandt andet enheder, afrunding, lagfordeling, geonetplacering og beregningsvalg. Standarderne ligger i `src/engine/defaults.json`; feltpræsentationen ligger i `settings-ui.json` og `settings-presentation.ts`.

Ændringer gemmes personligt i browseren. Nulstilling gendanner de indbyggede standarder for den valgte del og bevarer øvrige data efter appens eksisterende regler. Felternes afhængigheder og virkning på beregninger kontrolleres i enheds- og browsertests.

Eksporterede indstillinger og andre brugerdefinerede JSON-filer opbevares lokalt. De må ikke blive indbyggede standarder uden særskilt godkendelse; opsætningen for den offentlige udgave er den godkendte undtagelse.

## Opsætning for den offentlige udgave

1. Indstil værdierne i den lokale udgave.
2. Eksportér opsætningen under Indstillinger.
3. Kør `npm run opsaetning -- <fil>`.
4. Commit og push ændringen.

Funktionerne og listen `kan_aendres` kan rettes direkte i `src/ui/opsaetning-offentlig.json`.
