# Redigering af rapportens basisskabelon

29. september 2026. Implementeret i den isolerede prototype; endnu ingen administrationsside i appen.

## Hvad kan ændres?

| Ændring | Hvor den udføres nu |
| --- | --- |
| Nyt logo, firmafarve, kontaktlinje og slogan | Firmaprofilen `spikes/report-typescript/theme.json` og den tilhørende billedfil |
| Skrifttyper, størrelse, margener og linjeafstand | Firmaprofilen; kræver tilgængelige skrifter og ny layoutkontrol |
| Gentage logo og sidefod på alle sider | Firmaprofilen |
| Overskrifter og rækkefølge af de fem afsluttende tekstafsnit | Firmaprofilen; hvert afsnit skal fortsat være med præcis én gang |
| Nyt sidehoved, forsidelayout, tabeller, figurplacering eller større ombygning af afsnit | `spikes/report-typescript/layout.typ` |
| Projektets konkrete tekster og rapportvalg | Rapportdata, adskilt fra firmaprofil og layout |

Typst-skabelonen redigeres som kode med en PDF som resultat. Den er ikke en Word-skabelon, hvor elementer flyttes direkte med musen. En fremtidig administrationsside kan gøre de almindelige ændringer til formularfelter, eksempelvis »Upload logo«, farvevalg og kontaktoplysninger. En generel visuel skabeloneditor er en selvstændig, større funktion og er ikke implementeret eller besluttet.

En ændring i logo eller layout kræver ingen ændring i beregningsmotoren. Ved større ændringer laves prøve-PDF'er til brugerens godkendelse. Godkendelse af design giver ikke lov til at ændre beregninger, standardtekster eller hvilke faglige oplysninger rapporten indeholder.

## Bevarelse af rapporter

Prototypen gemmer ved eksport en særskilt pakke med:

- Den færdige PDF.
- De præcise rapporttekster, formaterede tabelværdier og figurhenvisninger.
- Den registrerede dimensionering, metadata, rapportvalg, redigerede tekster og indstillinger fra referencecasen.
- Kopier af den anvendte firmaprofil, begge skabelonfiler, logo og figurer.
- Kontrolsummer, skabelonversion, kildecommit samt compiler- og fontoplysninger.

Pakkerne gemmes under `.local/report-prototype/bundles/` i mapper identificeret ved deres indhold. Eksisterende pakker overskrives ikke af eksportfunktionen. En geneksport med nyt design får sin egen pakke. Kontrolsummer opdager ændrede filer; de er ikke en digital signatur eller et fuldt revisionssystem. Rapportpakker er lokale og udeladt fra Git.

Den arkiverede PDF kan åbnes uafhængigt af senere designændringer. Gendannelse af nøjagtig samme PDF ved ny kompilering kræver også samme compiler og skrifter. Skriftfiler er ikke inkluderet af hensyn til distribution/rettigheder; kun deres kontrolsummer er registreret. Andre skrifter end dem i denne afprøvning kræver en særskilt fontregistrering. En produktionsløsning skal have aftalt backup, adgangsstyring, dataskema og håndtering af versioner; dette er endnu en prototype.

Hvis Word senere bliver nødvendigt, bør det dannes fra de bevarede rapportdata med en særskilt Word-skabelon. En konvertering fra PDF giver ikke samme sikkerhed for redigerbar struktur og layout.

## Formatering efter anden afprøvning

Alle ti cases har nu samme sideantal, samme registrerede tekstlinjer og samme fordeling af de synlige tekstlinjer på sider som den lokale Word-reference. Indrykninger og de eksisterende punkttegn gengives fra originalens tekst. Logo og sidefod gentages på alle sider som i originalen. Tomme tekstfelter erstattes ikke af standardtekst.

I alle ti cases er største målte lodrette forskydning af tekstlinjerne 0,53 punkt (cirka 0,19 mm), og den største vandrette forskydning er 0,04 punkt. Det er observationer af layoutet, ikke accepterede tolerancer for beregninger. Tomme linjer inde i teksten bevares også ved sideskift; trafikcasen kontrollerer dette ved overgangen til side 3. Kontrollen afviser ændrede tekstlinjer eller deres fordeling på sider; positionsmålene rapporteres særskilt. Dette er ikke en påstand om pixelidentiske PDF'er eller godkendt produktionslayout.

Automatisk kontrol genfinder alle forventede dynamiske tekster og tabelværdier, og begge figurers pixels er bevaret i Standard. Standard-eksemplets tre sider er visuelt gennemgået efter ændringen. De øvrige cases har automatisk kontrol; fuld visuel accept, alle rapportvalg, lange tabeller, andre fonte og LibreOffice/servermiljø udestår. Målingerne findes i `reference/report-format-results.json`. De oprindelige målinger i `reference/report-prototype-results.json` er bevaret som historik.

## Forslag til vedligeholdelsesforløb

1. Opret en ny version af firmaprofil/skabelon.
2. Tilpas logo, tekster eller layout uden at ændre de faglige rapportdata.
3. Dan prøve-PDF'er for korte, lange og tomme afsnit samt rapporter med figurer.
4. Kontroller indhold, sideskift, indrykninger og tabeller og forelæg resultatet til godkendelse.
5. Brug den godkendte version til nye rapporter, mens eksisterende rapportpakker bevares.
