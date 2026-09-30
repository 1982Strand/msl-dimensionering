# React-dimensionering

Dimensioning.tsx er siden /#dimensionering. dimensioning-form.ts omsætter de gamle std_/bd_-felter til den eksisterende dimensioner-motor. Værdier gemmes i session.values i browserlageret. Standard starter med Eᵤ 10 MPa og klasse 4; Brugerdefineret starter med 300 mm SGII og 400 mm bundsikringssand.

B-023 godkender bevaret gyldigt Standard-produkt ved navigation og genåbning. Den originale UI-005-reference må ikke omskrives. Nulstilling rydder dimensioneringsfelter og bevarer tilstand, grunddata og indstillinger.

Adapteren matcher alle 17 originale dimensioneringspayloads. Ni widgetsnapshots findes i dimensioning-ui-cases.json; metadata i dimensioning-ui.json. Capture-værktøjet anvender isoleret a330cfd og nægter overskrivning. 2.750 motor-/datatests og to målrettede browserforløb bestod ved 9477dc6. Procenter fra motoren er brøker og vises gange 100 med PythonFixed, nul decimaler. Antal lag og manuel kornstørrelse kræver heltal.

Figurer, personligt diagram, fulde forklaringer og produktgruppetabeller, rapporttilkobling og resterende hjælpetekster udestår. Cv-tabellen åbnes lokalt i InfoPopup (Radix Dialog); trafikklasse-korrelation henviser stadig til VejDim. B-024 autoriserer vandrette klassevalg og diagram/Cv-popupper uden layoutændring. product-overview.ts følger originalens syv kolonner, konservative intervaltykkelser, rå besparelsesreference og sortering; ugyldige celler er —. Seks faktisk renderede tabeller fra isoleret a330cfd ligger i product-overview-cases.json; 120 rækker matcher i Standard/custom, load/traffic og mm/cm. 2.751 Node-tests og tre dimensioneringsbrowserforløb består. De 21 tidligere browserforløb bestod Windows/Linux ved 6429265; CI omfatter nu 22. Originalens aktive UI tilbyder hverken procentindtastning af lag eller manuel armering. Præcist omfang står i docs/DIMENSIONERINGSUDKAST.md.

Brug Semble først ved kodesøgning. Serena CLI index-file virker til TypeScript, hvis den cachede MCP-sprogserver ikke gør.