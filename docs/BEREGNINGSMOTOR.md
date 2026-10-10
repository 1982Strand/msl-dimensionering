# Beregningsmotor

Motoren ligger i `src/engine/` og kører i TypeScript i browseren. Brugerflade, browserlagring og rapportlayout er adskilt fra beregningerne.

`defaults.json` indeholder de godkendte indbyggede standarder. Personlige tabeller og indstillinger er separate browserdata. Beregningerne omfatter diagramopslag, trafikklasse-korrelation, materialer, friktionsvinkel, lagfordeling, produktvalg og geonetplacering.

Tests sammenligner input, mellemresultater, slutresultater, fejl, advarsler og viste værdier med godkendte cases i `tests/cases/`. Forventede resultater indlæses ikke af appen. Nye tolerancer eller faglige ændringer kræver særskilt godkendelse.
