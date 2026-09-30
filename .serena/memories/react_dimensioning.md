# React-dimensionering

Dimensioning.tsx er siden /#dimensionering. dimensioning-form.ts omsætter de gamle std_/bd_-felter til den eksisterende dimensioner-motor. Værdier gemmes i session.values i browserlageret. Standard starter med Eᵤ 10 MPa og klasse 4; Brugerdefineret starter med 300 mm SGII og 400 mm bundsikringssand.

B-023 godkender bevaret gyldigt Standard-produkt ved navigation og genåbning. Den originale UI-005-reference må ikke omskrives. Nulstilling rydder dimensioneringsfelter og bevarer tilstand, grunddata og indstillinger.

Adapteren matcher alle 17 originale dimensioneringspayloads. Ni widgetsnapshots findes i dimensioning-ui-cases.json; metadata i dimensioning-ui.json. Capture-værktøjet anvender isoleret a330cfd og nægter overskrivning. 2.750 motor-/datatests og to målrettede browserforløb bestod ved 9477dc6. Procenter fra motoren er brøker og vises gange 100 med PythonFixed, nul decimaler. Antal lag og manuel kornstørrelse kræver heltal.

Figurer, personligt diagram, fulde forklaringer og produktgruppetabeller, rapporttilkobling og resterende hjælpetekster udestår. Korrelationstabellen åbnes foreløbigt på VejDim-siden. Originalens aktive UI tilbyder hverken procentindtastning af lag eller manuel armering. Præcist omfang står i docs/DIMENSIONERINGSUDKAST.md.

Brug Semble først ved kodesøgning. Serena CLI index-file virker til TypeScript, hvis den cachede MCP-sprogserver ikke gør.