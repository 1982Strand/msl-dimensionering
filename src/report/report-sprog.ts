import type { SectionKey } from './report-data.ts';

export interface ReportStrings {
  tusindtal: string;
  typst_language: string;
  projekt: string;
  beskrivelse: string;
  omfang: string;
  udfoeres_for: string;
  udfoert_af: string;
  kvalitetssikring: string;
  dimensioneringsgrundlag: string;
  forudsaetninger: string;
  grundlag_for_beregning: string;
  dimensioneringsresultat: string;
  resultat_intro: string;
  by_dato_suffix: string;
  kolon: string;
  side_af_prefix: string;
  side_af_separator: string;
  dato: (iso: string) => string;
  grundlag: {
    eu: string;
    trafikklasse_label: string;
    trafikklasse: (t: string | number) => string;
    eo_aekv: string;
    yderomraade: string;
    belastningsklasse: string;
    materialeopbygning: string;
    standardmaterialer: string;
    phi: string;
  };
  resultat: { geonet: string; uarmeret: string; indtastet: string; lag1: string; lag2: string };
  yderomraade: {
    over: string;
    under: string;
    inden: string;
    uden: string;
    uden_afvigelse: (pct: string, retning: string) => string;
    med_afvigelse: (pct: string, retning: string, tolerance: string, placering: string) => string;
    vejdim: (tykkelse: string, eo: string) => string;
    rand: (eo: string, tykkelse: string) => string;
    ekstrapoleret: string;
  };
  materiale_lag: (n: number, navn: string) => string;
  materiale_phi: (phi: string) => string;
  materiale_separator: string;
  og: string;
  tom: string;
  section_titles: Readonly<Record<SectionKey, string>>;
  standard_tekster: Readonly<Record<SectionKey, string>>;
  standard_materialer: readonly [string, string];
  snit: {
    indtastet: string;
    ustabiliseret: string;
    ustabiliseret_phi: string;
    lag1: string;
    lag2: string;
    ubunden: string;
    geonet: string;
    underbund: (eu: string) => string;
    tom: string;
    ikke_gyldigt: string;
    /** Standardopbygningens lagnavne fra beregningen, oversat i rapportfiguren. */
    standard_lag: Readonly<Record<string, string>>;
  };
  konstruktion: {
    title: (geonet: string) => string;
    description: (snit: string) => string;
    legend_baerelag: string;
    legend_bundsikring: string;
    legend_optimal: string;
    legend_indtastet: string;
    overskud: (tykkelse: string) => string;
    optimalt: (tykkelse: string) => string;
    for_lidt: (tykkelse: string) => string;
    for_lidt_optimal: (mangel: string, overskud: string) => string;
    ikke_defineret: string;
    ikke_defineret_eu: (eu: string) => string;
    ikke_gyldigt: string;
    note_ustabiliseret: string;
    note_basis: string;
    note_net: (indeks: string) => string;
    note_phi: (pct: string) => string;
    note_oprunding: (tykkelse: string) => string;
    note_minimum: string;
    note_mindste_lag: string;
    note_titel: (indeks: string, pct: string) => string;
    note_resultat: (tykkelse: string) => string;
    optimal_fallback: (tykkelse: string) => string;
    indtastet_niveau: (tykkelse: string) => string;
    geonet_fra_top: (navn: string, tykkelse: string) => string;
  };
  diagram: {
    akse_x: string;
    akse_y: string;
    hover: (x: string, eu: string, navn: string) => string;
    ustabiliseret: string;
    vejdim_tal: string;
    lag: (n: number) => string;
    optimal: string;
    indtastet: (cm: string) => string;
    aria: string;
    titel_klasse: (klasse: number) => string;
    titel_trafikklasse: (klasse: string | number) => string;
    titel_reference: string;
    titel_eo: (eo: string) => string;
    title: (eo: string, klasse: string, phi: string, geonet: string) => string;
  };
}

const SECTION_TITLER_DK = {
  oplyste_forudsaetninger: 'Oplyste forudsætninger',
  generelle_forudsaetninger: 'Generelle dimensioneringsforudsætninger for MSL opbygning',
  krav_komprimering: 'Krav til komprimering',
  dim_sikkerhed: 'Dimensionering og sikkerhed',
  udfoerelse: 'Udførelse',
  kontrolplan: 'Kontrolplan',
  projekteringsansvar: 'Projekteringsansvar',
} satisfies Record<SectionKey, string>;
// Ordlyd, indrykninger og linjeskift fra originalen, også FUND-005/A-006.
// Standardteksterne tilpasses aldrig til beregningssagen.
const STANDARD_TEKSTER_DK: Readonly<Record<SectionKey, string>> = {
  oplyste_forudsaetninger:
    '   • Dimensionsgivende trafikbelastning: T6\n' +
    '   • Vingestyrke, Cv, skønnet i planum: > 100 kPa\n' +
    '   • Grundvandsspejl: ikke oplyst/ikke relevant\n' +
    '   • Bærelagsmaterialer:\n' +
    '           o Genbrugsstabil',
  generelle_forudsaetninger:
    'Dimensioneringen af MSL opbygningen (mekanisk stabiliseret bærelag) er ' +
    'baseret på resultaterne fra mere en 20 års feltforsøg udført i ' +
    'Skandinavien. Det ubundne bærelag fastholdes af et eller flere lag ' +
    'geonet, som låser og fastholder bærelaget hvormed trykspredningsvinklen ' +
    'forøges i lighed. I praksis betyder det, at bærelaget kan reduceres i ' +
    'forhold til den ikke-stabiliserede ubundne opbygning. Alternativt vil ' +
    'der kunne opnås en betydelig forøgelse af bæreevne for en MSL opbygning ' +
    'i forhold til en traditionel opbygning.\n\n' +
    'Differenssætninger vil i stort omfang blive udjævnet, ligesom den ' +
    'stabiliserede randzone for specielt flerlagsopbygninger vil blive ' +
    'mindre sårbar i forhold til sætninger. Selvom erfaringerne viser ' +
    'betydelige reduktioner i sætninger, så vil der kun sjældent kunne ' +
    'opnås en sætningsfri ombygning. Ligeledes bør der tages højde for evt. ' +
    'frostfølsomhed, selvom MSL-opbygningen vil udjævne eventuelle ' +
    'hævninger.\n\n' +
    'MSL-løsninger kan kombineres med letfyld, som dermed kan være med til ' +
    'at kompensere for eventuelle sætninger.\n\n' +
    'MSL-løsninger kan ligeledes håndtere og kompensere for bæreevnesvigt ' +
    'forårsaget af midlertidig kortvarig vandpåvirkning, eksempelvis i ' +
    'forbindelse med LAR-opbygninger.\n\n' +
    'For særligt sætningsgivende bundforhold vil det være en fordel at ' +
    'afvente med belægningsarbejde til sætningsforløbet har stabiliseret ' +
    'sig. Tidshorisonten er variabel, og kan vare op til et år.',
  krav_komprimering:
    'Det forudsættes, at der ved indbygning af de ubundne bærelag opnås og ' +
    'eftervises en komprimeringsgrad på middel 95 % og mindst 92 % målt ved ' +
    'Vibrationsforsøg.',
  dim_sikkerhed:
    'Dimensionering og kontrol af bæreevne kan være forbundet med en nogen ' +
    'måleusikkerhed.\n\n' +
    'Ved kontrol af bæreevnen for MSL opbygningen vil en eventuel negativ ' +
    'variation normalt være maksimalt 10 %.',
  udfoerelse:
    'MSL-opbygninger kan udføres hele året. I visse situationer kan det ' +
    'være en fordel at arbejdet tilrettelægges således, at det udføres i ' +
    'frostperioder, hvor fremkommeligheden i terrænet kan være mere ' +
    'gunstig.\n\n' +
    'Geonettenes formstabile struktur nødvendiggør at udlægningen sker på ' +
    'et relativt jævnt underlag. Eventuelt bevoksning skal som udgangspunkt ' +
    'fjernes. På meget sætningsgivende blød underbund kan rødder fra træer ' +
    'og buske med fordel blive stående, ligesom intakt tørv bør bevares. ' +
    'Det er dog vigtigt, at rødder og stubbe skæres helt ned, således at ' +
    'der maksimalt er en terrænforskel på +/- 5 cm.\n\n' +
    'Overlæg på geonet bør være minimum 0,4 m. Anlæg på udvendige skråninger ' +
    'bør normalt udføres med maksimalt anlæg 1,5.',
  kontrolplan:
    'Det anbefales at udføre supplerende geoteknisk sondering og indmåling ' +
    'af E-modul på planum, således at eventuelt behov for korrektion af ' +
    'opbygning kan foretages før indbygning.\n\n' +
    'Kontrol af bæreevne på oversiden af de indbyggede bærelag kan ske ved ' +
    'pladebelastningsforsøg suppleret med dynamisk minifaldlodsmåling.\n\n' +
    'Omfanget af kontrolplan vurderes på det enkelte projekt.',
  projekteringsansvar:
    'Såfremt der foreligger skriftligt aftale med præcisering af omfang og ' +
    'krav til konstruktionen samt honorar og ansvarsforpligtelse for ' +
    'projekteringen, kan ansvaret for dimensioneringen være omfattet af ' +
    'vores rådgiveransvarsforsikring.\n\n' +
    'Såfremt der ikke foreligger en skriftlige aftale omkring ansvarsforhold, ' +
    'og dersom dimensioneringen i tillæg er udarbejdet som en vederlagsfri ' +
    'service, fraskriver Byggros sig ansvaret for anvendelsen af ' +
    'beregninger, konstruktionsforslag og anden relateret rådgivning.',
};

const MAANEDER_SV = [
  'januari',
  'februari',
  'mars',
  'april',
  'maj',
  'juni',
  'juli',
  'augusti',
  'september',
  'oktober',
  'november',
  'december',
];
const SECTION_TITLER_SV = {
  oplyste_forudsaetninger: 'Angivna förutsättningar',
  generelle_forudsaetninger: 'Generella dimensioneringsförutsättningar för MSL-uppbyggnad',
  krav_komprimering: 'Krav på komprimering',
  dim_sikkerhed: 'Dimensionering och säkerhet',
  udfoerelse: 'Utförande',
  kontrolplan: 'Kontrollplan',
  projekteringsansvar: 'Projekteringsansvar',
} satisfies Record<SectionKey, string>;
// Oversættelse af de danske standardtekster; terminologi fra BG Byggros AB's svenske notat (2017).
const STANDARD_TEKSTER_SV: Readonly<Record<SectionKey, string>> = {
  oplyste_forudsaetninger:
    '   • Dimensionerande trafikbelastning: T6\n' +
    '   • Vingförsökets skjuvhållfasthet, Cv, uppskattad på terrass: > 100 kPa\n' +
    '   • Grundvattenyta: ej angiven/ej relevant\n' +
    '   • Bärlagermaterial:\n' +
    '           o Återvunnet krossmaterial',
  generelle_forudsaetninger:
    'Dimensioneringen av MSL-uppbyggnaden (mekaniskt stabiliserat bärlager) är ' +
    'baserad på resultaten från mer än 20 års fältförsök utförda i Skandinavien. ' +
    'Det obundna bärlagret hålls fast av ett eller flera lager geonät, som låser ' +
    'och håller fast bärlagret, varigenom tryckspridningsvinkeln ökar. I praktiken ' +
    'betyder det att bärlagret kan reduceras i förhållande till den icke ' +
    'stabiliserade obundna uppbyggnaden. Alternativt kan en betydande ökning av ' +
    'bärförmågan uppnås för en MSL-uppbyggnad i förhållande till en traditionell ' +
    'uppbyggnad.\n\n' +
    'Differenssättningar utjämnas i stor utsträckning, och den stabiliserade ' +
    'randzonen blir, särskilt för flerlagerskonstruktioner, mindre känslig för ' +
    'sättningar. Även om erfarenheterna visar betydande minskningar av ' +
    'sättningarna kan en sättningsfri ombyggnad endast sällan uppnås. Likaså bör ' +
    'hänsyn tas till eventuell tjälfarlighet, även om MSL-uppbyggnaden utjämnar ' +
    'eventuella tjällyftningar.\n\n' +
    'MSL-lösningar kan kombineras med lättfyllning, som därmed kan bidra till att ' +
    'kompensera för eventuella sättningar.\n\n' +
    'MSL-lösningar kan likaså hantera och kompensera för bärighetsbrist orsakad av ' +
    'tillfällig, kortvarig vattenpåverkan, exempelvis i samband med ' +
    'LOD-anläggningar.\n\n' +
    'För särskilt sättningsbenägen undergrund är det en fördel att vänta med ' +
    'beläggningsarbetet tills sättningsförloppet har stabiliserats. Tidshorisonten ' +
    'varierar och kan vara upp till ett år.',
  krav_komprimering:
    'Det förutsätts att det vid utläggning av de obundna bärlagren uppnås och ' +
    'verifieras en komprimeringsgrad på i medeltal 95 % och minst 92 % mätt med ' +
    'vibrationsförsök.',
  dim_sikkerhed:
    'Dimensionering och kontroll av bärförmåga kan vara förenade med en viss ' +
    'mätosäkerhet.\n\n' +
    'Vid kontroll av bärförmågan för MSL-uppbyggnaden är en eventuell negativ ' +
    'avvikelse normalt högst 10 %.',
  udfoerelse:
    'MSL-uppbyggnader kan utföras året runt. I vissa situationer kan det vara en ' +
    'fördel att planera arbetet så att det utförs under perioder med tjäle, då ' +
    'framkomligheten i terrängen kan vara gynnsammare.\n\n' +
    'Geonätens formstabila struktur gör att utläggningen måste ske på ett relativt ' +
    'jämnt underlag. Eventuell växtlighet ska som utgångspunkt tas bort. På mycket ' +
    'sättningsbenägen mjuk undergrund kan rötter från träd och buskar med fördel ' +
    'lämnas kvar, liksom intakt torv bör bevaras. Det är dock viktigt att rötter ' +
    'och stubbar kapas helt ned, så att nivåskillnaden i terrängen är högst ' +
    '+/- 5 cm.\n\n' +
    'Överlappet på geonät bör vara minst 0,4 m. Utvändiga slänter bör normalt ' +
    'utföras med en lutning på högst 1:1,5.',
  kontrolplan:
    'Det rekommenderas att utföra kompletterande geoteknisk sondering och mätning ' +
    'av E-modul på terrassen, så att ett eventuellt behov av att korrigera ' +
    'uppbyggnaden kan hanteras före utläggning.\n\n' +
    'Kontroll av bärförmågan på ovansidan av de utlagda bärlagren kan göras med ' +
    'statisk plattbelastning kompletterad med dynamisk lätt fallviktsmätning.\n\n' +
    'Kontrollplanens omfattning bedöms för det enskilda projektet.',
  projekteringsansvar:
    'Om det finns ett skriftligt avtal som preciserar omfattning och krav på ' +
    'konstruktionen samt arvode och ansvar för projekteringen, kan ansvaret för ' +
    'dimensioneringen omfattas av vår konsultansvarsförsäkring.\n\n' +
    'Om det inte finns något skriftligt avtal om ansvarsförhållanden, och om ' +
    'dimensioneringen dessutom är utförd som en kostnadsfri tjänst, frånsäger sig ' +
    'BG Byggros AB ansvaret för användningen av beräkningar, konstruktionsförslag ' +
    'och annan relaterad rådgivning.',
};

export const REPORT_STRINGS = {
  da: {
    tusindtal: '.',
    typst_language: 'da',
    projekt: 'Projekt: ',
    beskrivelse: 'Beskrivelse:',
    omfang: 'Omfang:',
    udfoeres_for: 'Udføres for:',
    udfoert_af: 'Udført af:',
    kvalitetssikring: 'Kvalitetssikring:',
    dimensioneringsgrundlag: 'Dimensioneringsgrundlag:',
    forudsaetninger: 'Forudsætninger:',
    grundlag_for_beregning: 'Grundlag for beregning',
    dimensioneringsresultat: 'Dimensioneringsresultat:',
    resultat_intro:
      'Baseret på ovennævnte indgangsparametre kan vi foreslå følgende MSL opbygning:',
    by_dato_suffix: ' d.',
    kolon: ':',
    side_af_prefix: 'Side ',
    side_af_separator: ' af ',
    dato: (iso: string) => {
      const c = [...iso];
      return !iso || c.length !== 10 || c[4] !== '-' || c[7] !== '-'
        ? iso
        : `${c.slice(8, 10).join('')}/${c.slice(5, 7).join('')}/${c.slice(0, 4).join('')}`;
    },
    grundlag: {
      eu: 'Underbundens E-modul (Eᵤ)',
      trafikklasse_label: 'Dimensioneringsgrundlag',
      trafikklasse: (t: string | number) => `Trafikklasse ${t} (VejDim)`,
      eo_aekv: 'Ækvivalent Eₒ (Eₒ,ækv)',
      yderomraade: 'Uden for diagrammets område',
      belastningsklasse: 'Belastningsklasse',
      materialeopbygning: 'Materialeopbygning',
      standardmaterialer: 'Designdiagrammernes referencemateriale',
      phi: 'Vægtet friktionsvinkel (φᵥ)',
    },
    resultat: {
      geonet: 'Valgt geonet',
      uarmeret: 'Ustabiliseret referenceopbygning',
      indtastet: 'Samlet tykkelse af valgt opbygning',
      lag1: 'Stabiliseret tykkelse — 1 lag',
      lag2: 'Stabiliseret tykkelse — 2 lag',
    },
    yderomraade: {
      over: 'over diagrammets øverste kurve',
      under: 'under diagrammets laveste kurve',
      inden: 'inden for',
      uden: 'uden for',
      uden_afvigelse: (p: string, r: string) =>
        `VejDims krav ligger ${p} % ${r}. Den ustabiliserede tykkelse er VejDims, og reduktionen er aflæst på randkurven.`,
      med_afvigelse: (p: string, r: string, t: string, l: string) =>
        `VejDims krav ligger ${p} % ${r}, ${l} tolerancen på ${t} %. `,
      vejdim: (t: string, eo: string) =>
        `Den ustabiliserede tykkelse er sat til VejDims ${t}, og reduktionen er aflæst på kurven Eₒ = ${eo} MPa`,
      rand: (eo: string, t: string) =>
        `Der er regnet med diagrammets laveste kurve, Eₒ = ${eo} MPa, på ${t}.`,
      ekstrapoleret: ' og dermed ekstrapoleret.',
    },
    materiale_lag: (n: number, navn: string) => `Lag ${n}: ${navn}`,
    materiale_phi: (phi: string) => `φᵢ = ${phi}`,
    materiale_separator: ' · ',
    og: ' og ',
    tom: '—',
    section_titles: SECTION_TITLER_DK,
    standard_tekster: STANDARD_TEKSTER_DK,
    standard_materialer: ['Stabilgrus SG II', 'Bundsikring BL II'] as const,
    snit: {
      indtastet: 'Indtastet opbygning',
      ustabiliseret: 'Ustabiliseret bærelagstykkelse',
      ustabiliseret_phi: 'Ustabiliseret bærelagstykkelse (φᵥ-korrigeret)',
      lag1: '1 lag geonet',
      lag2: '2 lag geonet',
      ubunden: 'Ubunden opbygning',
      geonet: 'Geonet',
      underbund: (eu: string) => `Underbund Eᵤ = ${eu} MPa`,
      tom: 'Ikke defineret',
      ikke_gyldigt: 'Ikke gyldigt for denne kombination',
      standard_lag: { Stabilgrus: 'Stabilgrus', Bundsikring: 'Bundsikring' },
    },
    konstruktion: {
      title: (n: string) => `Opbygningssnit · ${n}`,
      description: (s: string) => `Snittene vises i samme lodrette skala. ${s}`,
      legend_baerelag: 'Bærelag',
      legend_bundsikring: 'Bundsikring',
      legend_optimal: 'Optimal korrektion',
      legend_indtastet: 'Indtastet niveau',
      overskud: (t: string) => `${t} i overskud`,
      optimalt: (t: string) => `(${t} optimalt)`,
      for_lidt: (t: string) => `${t} for lidt`,
      for_lidt_optimal: (m: string, o: string) => `${m} for lidt (optimalt ${o} i overskud)`,
      ikke_defineret: 'Ikke defineret',
      ikke_defineret_eu: (eu: string) => `Ustabiliseret bærelag ikke defineret for Eᵤ = ${eu} MPa`,
      ikke_gyldigt: 'Ikke gyldigt for denne kombination',
      note_ustabiliseret: 'Ustabiliseret bærelagstykkelse',
      note_basis: 'Basisreduktion, referencenet',
      note_net: (i: string) => `Net-korrektion, indeks ${i}`,
      note_phi: (p: string) => `φᵥ-korrektion, ${p}`,
      note_oprunding: (t: string) => `Oprunding til nærmeste ${t}`,
      note_minimum: 'Tillæg til minimumstykkelse',
      note_mindste_lag: 'Tillæg for mindste lagtykkelse',
      note_titel: (i: string, p: string) =>
        `Optimal korrektion · effektindeks ${i} · net-korrektion ${p}`,
      note_resultat: (t: string) => `= Stabiliseret bærelagstykkelse: ${t}`,
      optimal_fallback: (t: string) => `Optimal korrektion · ${t}`,
      indtastet_niveau: (t: string) => `Indtastet niveau · ${t}`,
      geonet_fra_top: (n: string, t: string) => `${n} · ${t} fra overkant`,
    },
    diagram: {
      akse_x: 'Bærelagstykkelse [cm]',
      akse_y: 'Bundmodul Eᵤ [MPa]',
      hover: (x: string, eu: string, n: string) => `${x} cm · Eᵤ ${eu} MPa<extra>${n}</extra>`,
      ustabiliseret: 'Ustabiliseret',
      vejdim_tal: 'VejDims tal',
      lag: (n: number) => `${n} lag geonet`,
      optimal: 'optimal',
      indtastet: (cm: string) => `Indtastet opbygning (${cm} cm)`,
      aria: 'Personligt designdiagram',
      titel_klasse: (k: number) => `Klasse ${k}`,
      titel_trafikklasse: (k: string | number) => `Trafikklasse ${k}`,
      titel_reference: 'referencenet',
      titel_eo: (eo: string) => `Eₒ = ${eo}`,
      title: (eo: string, klasse: string, phi: string, geonet: string) =>
        `Eₒ = ${eo} MPa · ${klasse} · φᵥ = ${phi}° · ${geonet}`,
    },
  },
  // Udkast 2. november 2026: afventer gennemlæsning af en svensk fagperson.
  sv: {
    tusindtal: '',
    typst_language: 'sv',
    projekt: 'Projekt: ',
    beskrivelse: 'Beskrivning:',
    omfang: 'Omfattning:',
    udfoeres_for: 'Utförs för:',
    udfoert_af: 'Utförd av:',
    kvalitetssikring: 'Kvalitetssäkring:',
    dimensioneringsgrundlag: 'Dimensioneringsunderlag:',
    forudsaetninger: 'Förutsättningar:',
    grundlag_for_beregning: 'Beräkningsunderlag',
    dimensioneringsresultat: 'Dimensioneringsresultat:',
    resultat_intro:
      'Baserat på ovanstående ingångsparametrar kan vi föreslå följande MSL-uppbyggnad:',
    by_dato_suffix: ' den',
    kolon: ':',
    side_af_prefix: 'Sida ',
    side_af_separator: ' av ',
    dato: (iso: string) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
      const maaned = m ? MAANEDER_SV[Number(m[2]) - 1] : undefined;
      return m && maaned ? `${Number(m[3])} ${maaned} ${m[1]}` : iso;
    },
    grundlag: {
      eu: 'Terrassens E-modul (Eᵤ)',
      trafikklasse_label: 'Dimensioneringsunderlag',
      trafikklasse: (t: string | number) => `Trafikklass ${t} (VejDim)`,
      eo_aekv: 'Ekvivalent Eₒ (Eₒ,ekv)',
      yderomraade: 'Utanför diagrammets område',
      belastningsklasse: 'Belastningsklass',
      materialeopbygning: 'Materialuppbyggnad',
      standardmaterialer: 'Designdiagrammens referensmaterial',
      phi: 'Viktad friktionsvinkel (φᵥ)',
    },
    resultat: {
      geonet: 'Valt geonät',
      uarmeret: 'Ostabiliserad referensuppbyggnad',
      indtastet: 'Total tjocklek för vald uppbyggnad',
      lag1: 'Stabiliserad tjocklek — 1 lager',
      lag2: 'Stabiliserad tjocklek — 2 lager',
    },
    yderomraade: {
      over: 'över diagrammets översta kurva',
      under: 'under diagrammets lägsta kurva',
      inden: 'inom',
      uden: 'utanför',
      uden_afvigelse: (p: string, r: string) =>
        `VejDims krav ligger ${p} % ${r}. Den ostabiliserade tjockleken är VejDims, och reduktionen är avläst på randkurvan.`,
      med_afvigelse: (p: string, r: string, t: string, l: string) =>
        `VejDims krav ligger ${p} % ${r}, ${l} toleransen på ${t} %. `,
      vejdim: (t: string, eo: string) =>
        `Den ostabiliserade tjockleken är satt till VejDims ${t}, och reduktionen är avläst på kurvan Eₒ = ${eo} MPa`,
      rand: (eo: string, t: string) =>
        `Beräkningen bygger på diagrammets lägsta kurva, Eₒ = ${eo} MPa, på ${t}.`,
      ekstrapoleret: ' och därmed extrapolerad.',
    },
    materiale_lag: (n: number, navn: string) => `Lager ${n}: ${navn}`,
    materiale_phi: (phi: string) => `φᵢ = ${phi}`,
    materiale_separator: ' · ',
    og: ' och ',
    tom: '—',
    section_titles: SECTION_TITLER_SV,
    standard_tekster: STANDARD_TEKSTER_SV,
    standard_materialer: ['Obundet bärlager', 'Förstärkningslager'] as const,
    snit: {
      indtastet: 'Angiven uppbyggnad',
      ustabiliseret: 'Ostabiliserad bärlagertjocklek',
      ustabiliseret_phi: 'Ostabiliserad bärlagertjocklek (φᵥ-korrigerad)',
      lag1: '1 lager geonät',
      lag2: '2 lager geonät',
      ubunden: 'Obunden uppbyggnad',
      geonet: 'Geonät',
      underbund: (eu: string) => `Terrass Eᵤ = ${eu} MPa`,
      tom: 'Inte definierad',
      ikke_gyldigt: 'Inte giltig för denna kombination',
      standard_lag: { Stabilgrus: 'Obundet bärlager', Bundsikring: 'Förstärkningslager' },
    },
    konstruktion: {
      title: (n: string) => `Uppbyggnad i snitt · ${n}`,
      description: (s: string) => `Snitten visas i samma vertikala skala. ${s}`,
      legend_baerelag: 'Bärlager',
      legend_bundsikring: 'Förstärkningslager',
      legend_optimal: 'Optimal korrektion',
      legend_indtastet: 'Angiven nivå',
      overskud: (t: string) => `${t} i överskott`,
      optimalt: (t: string) => `(${t} optimalt)`,
      for_lidt: (t: string) => `${t} för lite`,
      for_lidt_optimal: (m: string, o: string) => `${m} för lite (optimalt ${o} i överskott)`,
      ikke_defineret: 'Inte definierad',
      ikke_defineret_eu: (eu: string) =>
        `Ostabiliserat bärlager inte definierat för Eᵤ = ${eu} MPa`,
      ikke_gyldigt: 'Inte giltig för denna kombination',
      note_ustabiliseret: 'Ostabiliserad bärlagertjocklek',
      note_basis: 'Basreduktion, referensnät',
      note_net: (i: string) => `Nätkorrektion, index ${i}`,
      note_phi: (p: string) => `φᵥ-korrektion, ${p}`,
      note_oprunding: (t: string) => `Avrundning uppåt till närmaste ${t}`,
      note_minimum: 'Tillägg till minimitjocklek',
      note_mindste_lag: 'Tillägg för minsta lagertjocklek',
      note_titel: (i: string, p: string) =>
        `Optimal korrektion · effektindex ${i} · nätkorrektion ${p}`,
      note_resultat: (t: string) => `= Stabiliserad bärlagertjocklek: ${t}`,
      optimal_fallback: (t: string) => `Optimal korrektion · ${t}`,
      indtastet_niveau: (t: string) => `Angiven nivå · ${t}`,
      geonet_fra_top: (n: string, t: string) => `${n} · ${t} från överkant`,
    },
    diagram: {
      akse_x: 'Bärlagertjocklek [cm]',
      akse_y: 'Terrassmodul Eᵤ [MPa]',
      hover: (x: string, eu: string, n: string) => `${x} cm · Eᵤ ${eu} MPa<extra>${n}</extra>`,
      ustabiliseret: 'Ostabiliserad',
      vejdim_tal: 'VejDims värden',
      lag: (n: number) => `${n} lager geonät`,
      optimal: 'optimal',
      indtastet: (cm: string) => `Angiven uppbyggnad (${cm} cm)`,
      aria: 'Personligt designdiagram',
      titel_klasse: (k: number) => `Klass ${k}`,
      titel_trafikklasse: (k: string | number) => `Trafikklass ${k}`,
      titel_reference: 'referensnät',
      titel_eo: (eo: string) => `Eₒ = ${eo}`,
      title: (eo: string, klasse: string, phi: string, geonet: string) =>
        `Eₒ = ${eo} MPa · ${klasse} · φᵥ = ${phi}° · ${geonet}`,
    },
  },
} as const satisfies Record<string, ReportStrings>;
export type ReportLanguage = keyof typeof REPORT_STRINGS;
export const reportStrings = (sprog: ReportLanguage = 'da'): ReportStrings => REPORT_STRINGS[sprog];

// Bevares som direkte danske eksporter, da brugerfladen og eksisterende tests anvender dem.
export const SECTION_TITLER = REPORT_STRINGS.da.section_titles;
export const STANDARD_TEKSTER = REPORT_STRINGS.da.standard_tekster;
export const STANDARD_MATERIALER_RAPPORT = REPORT_STRINGS.da.standard_materialer;
