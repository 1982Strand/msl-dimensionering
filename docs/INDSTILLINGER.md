# React-indstillinger

Indstillinger er tilkoblet den eksisterende TypeScript-motor på `/#indstillinger`. Otte originale afsnit, 26 valg/felter og minimumstykkelser for seks belastningsklasser er bevaret fra referencecommit `a330cfd`.

Gyldige ændringer anvendes straks og gemmes i samme browser/computer. Tal gemmes, når feltet forlades eller Enter trykkes; Escape gendanner den aktive værdi. Oprindelige grænser, valgmuligheder, afhængige felter og indbyggede standardværdier er bevaret. Nulstilling af minimumstabellen berører alene dens seks værdier.

Siden viser originalens oprundingseksempel, minimumsadvarsel, klassisk-standardbesked, stabilgruseksempel og afvigelsesoversigt. Afvigelsestabellen og de fire omfangstekster genberegnes fra aktive diagrammer, VejDim-kørsler og tolerancer. Ændrede tolerancer bruges også på trafikklasse-korrelationssiden.

## Kontrol

- Optagelse af den gamle app: 26 widgets og seks scenarier med felt-afhængigheder, omfangstekster og afvigelsestabel. Fastlåste referencefiler sammenlignes; overskrivning nægtes.
- Én målrettet sammenligning dækker afvigelsestabel og omfangstekster for alle seks originale scenarier. Samlet består 2.747 motor-/datatests.
- To browserforløb består: standardværdier, felt-afhængigheder, genåbning, minimumsadvarsel, eksempel, afgrænset nulstilling, ugyldige tolerancer og ændret faktisk korrelation. Mobiludkastet er visuelt kontrolleret.
- Typekontrol og produktionsbygning består. GitHub Actions kører den samlede samling med 19 browserforløb på Windows og Linux.

## Resterende arbejde

Originalens korte dynamiske afsnitsopsummeringer og alle »Gælder«-markeringer er endnu ikke flyttet. De registreres som resterende oplysninger og må ikke udgå i den færdige app. Visualiseringsvalgene er gemt, men dimensioneringsfigurer og den samlede rapportpipeline er endnu ikke tilkoblet React. Denne leverance afslutter derfor ikke hele indstillingsfunktionens accept.

Næste større trin er dimensioneringsformularer og produktvalg. Beregningerne findes allerede i TypeScript; formularernes afhængigheder, beskeder og opbygningsvisualisering skal bevares og kontrolleres separat.
