# Data og lokal lagring

Materialer, designdiagrammer, trafikklasse-korrelation og indstillinger kan redigeres med eksisterende validering, ændringsvisning, fortryd, gentag og nulstilling.

Indbyggede standarder ligger i appens kode. Personlige ændringer, formularværdier, firmaprofil og medarbejderkartotek gemmes i browserens localStorage; egne logoer ligger i IndexedDB. Der er ingen fælles kundedatabase eller automatisk upload af kundedata til GitHub eller hostingudbyderen.

Lagringen er knyttet til webadresse, browserprofil og computer. Rydning af webstedets data eller privat browsing kan fjerne lagringen. Ved en ny webadresse følger værdierne ikke automatisk med. Brug de tilgængelige eksporthandlinger og kontrollér nødvendige sager før flytning. PDF'er og personlige JSON-filer hører ikke til i Git.

Den delte udgave skjuler firmaprofilen og anvender standardprofilen i rapporter. Medarbejderkartoteket er personligt og redigerbart. Skjulningen er en visningsregel; indbyggede standarddata og beregningskode kan læses af dem, der har adgang til appen.
