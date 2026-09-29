# Referencegrundlag

Opdateret 29. september 2026 efter brugerens instruktion om at committe og pushe den gamle app og anvende denne version som udgangspunkt.

## Fastlagt kildeversion

- Lokal kilde: `C:\geonet_beregning`
- Remote: `https://github.com/1982Strand/Geonet_beregning.git`
- Referencecommit: `a330cfd6734ac2478be1304a362c69f94e412d25`
- Gren: `main`; lokal HEAD og `origin/main` på GitHub er kontrolleret til samme commit.
- Versionsstreng i appen: `v0.6`
- Git-arbejdskopien er ren efter commit og push.
- Beslutning: B-007 i beslutningsloggen.

Den eksisterende lokale ændring, som blev committet, fjerner en kommentar og kaldet `st.caption(_yder_regel_linje(regler))` ved trafikklassevalget. Den fjernede tekst blev ikke ændret yderligere af migrationsarbejdet. Tidligere HEAD var `8e47a9e9043dec0e481bbb96b909df14adb6254c`.

## Lokal referencekopi

Placering: `C:\MSL-Dimensionering\reference-private\a330cfd\`. Mappen er ignoreret af Git og skal bevares lokalt.

- `source.zip`: Git-arkiv af den præcise referencecommit, inklusive sporede data og skabeloner.
- `materialer_brugerdefineret.json`, `designdiagrammer_brugerdefineret.json`, `indstillinger_brugerdefineret.json` og `rapport_metadata_brugerdefineret.json`: kopier af eksisterende lokale filer.
- `python-version.txt` og `installed-packages.txt`: miljøoplysninger fra den gamle apps virtuelle Python-miljø.
- `manifest.json`: optagelsestidspunkt, kildecommit, filstørrelser og SHA-256-kontrolsummer.

`trafikklasse_korrelation_brugerdefineret.json` fandtes ikke lokalt ved kopieringen. Koden understøtter filen; standardgrundlaget i kildekoden bevares i arkivet.

Lokale brugerfiler er bevaret uden at blive uploadet. Det skal stadig aftales, hvilke brugerdefinerede værdier der er normative referencecases, og hvilke der kun er lokale eksempler. Personlige rapportmetadata skal ikke indgå i offentlige testdata.

## Resterende referencearbejde

1. Bekræft relevante lokale tabeller og indstillinger med brugeren.
2. Dokumenter startforløb og systemafhængigheder ud over Python-pakker; afprøv en reproducerbar referencekørsel.
3. Registrer input, resultater, advarsler og figurer/rapporter for konkrete referencecases.
4. Registrer brugerens accept af cases og eventuelle numeriske tolerancer.

Der er endnu ikke kørt sammenligningstests eller foretaget en fuld audit af den gamle app. Plan og foreløbig kortlægning er baseret på kildeinspektion. Commit/push og den lokale referencekopi fastlægger udgangspunktet; de dokumenterer ikke, at en migration allerede er verificeret.
