# Data og lokal lagring

Materialer, designdiagrammer, trafikklasse-korrelation og indstillinger kan redigeres med eksisterende validering, ændringsvisning, fortryd, gentag og nulstilling.

Indbyggede standarder ligger i appens kode. Personlige ændringer, formularværdier, firmaprofil og medarbejderkartotek gemmes i browserens localStorage; egne logoer ligger i IndexedDB. Der er ingen fælles kundedatabase eller automatisk upload af kundedata til GitHub eller hostingudbyderen.

Lagringen er knyttet til webadresse, browserprofil og computer. Rydning af webstedets data eller privat browsing kan fjerne lagringen. Ved en ny webadresse følger værdierne ikke automatisk med. Brug de tilgængelige eksporthandlinger og kontrollér nødvendige sager før flytning. PDF'er og personlige JSON-filer hører ikke til i Git.

Hvad der kan ses og rettes, afhænger af udgaven; se `src/ui/udgaver.ts`. Den lokale udgave har redigerbar firmaprofil og eget medarbejderkartotek i browseren. Den interne udgave skjuler firmaprofilen, anvender standardprofilen i rapporter og har en indbygget medarbejderliste. Den offentlige udgave har hverken firmaprofil eller medarbejderkartotek, og dens øvrige funktioner følger `src/ui/opsaetning-offentlig.json`. Skjulningen er en visningsregel; indbyggede standarddata og beregningskode kan læses af dem, der har adgang til appen.
