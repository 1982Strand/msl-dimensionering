# Afslutning af ændringer
- Motorændringer: npm run typecheck; npm test; npm run format:check. Alle forventninger sammenlignes præcist, og hver core-referencecase skal have en adapter.
- Datagrundlagsændring: tools/export_engine_data.py --check med legacy-venv. Referenceændringer må ikke godkendes automatisk.
- Rapportændringer: npm run test:reports og eksisterende PDF-indholds-/layoutkontroller efter README; visuel kontrol af relevante sider.
- git diff --check; bekræft C:\geonet_beregning fortsat uændret. Læg aldrig .local/output/reference-private eller kundedata i commit.
- Opdater funktionsmatrix/migrationsstatus med præcist scope: beståede core-tests er ikke fuld appmigrering eller selvstændig faglig validering.
- Brug codex/-gren. Hold eksisterende migrations-PR opdateret; ingen merge/offentliggørelse uden aftale.