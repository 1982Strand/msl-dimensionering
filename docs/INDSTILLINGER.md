# Indstillinger

Indstillingerne styrer blandt andet enheder, afrunding, lagfordeling, geonetplacering og beregningsvalg. Standarderne ligger i `src/engine/defaults.json`; feltpræsentationen ligger i `settings-ui.json` og `settings-presentation.ts`.

Ændringer gemmes personligt i browseren. Nulstilling gendanner de indbyggede standarder for den valgte del og bevarer øvrige data efter appens eksisterende regler. Felternes afhængigheder og virkning på beregninger kontrolleres i enheds- og browsertests.

Eksporterede indstillinger og andre brugerdefinerede JSON-filer opbevares lokalt. De må ikke blive indbyggede standarder uden særskilt godkendelse.
