/** Samlet forelæggelsessæt. Kun syntetiske metadata; ingen nye referencer. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reportReviewCases, type ReportCase } from './report-cases.ts';
import { dimensioner, type Settings } from '../src/engine/dimensionering.ts';
import { reportData, grundlag_linjer, resultat_linjer } from '../src/report/report-data.ts';
import { DEFAULT_COMPANY_PROFILE, type CompanyProfile } from '../src/report/profile-defaults.ts';
import { PROFILE_LIMITS, changeProfileField } from '../src/report/company-profile.ts';

export interface R6Case {
  name: string;
  description: string;
  source: string;
  report: ReportCase;
  profile: CompanyProfile;
  forbiddenStrings: string[];
}

export function r6ReportCases(): R6Case[] {
  const original = reportReviewCases();
  const descriptions: [string, string][] = [
    ['standard-bk4-mm', 'Standard, belastningsklasse 4, mm; ugyldigt 2-lagssnit udelades'],
    ['standard-to-geonetlag', 'Standard med gyldig 2-lagskombination'],
    ['intervalprodukt-nx850', 'Intervalprodukt Tensar InterAx NX850, 1/2 lag og intervalbånd'],
    ['standard-trafikklasse-t4', 'Standard, trafikklasse T4 og VejDim-grundlag'],
    ['brugerdefineret-tre-materialelag', 'Brugerdefineret, tre materialelag, mm'],
    ['brugerdefineret-manuel-phi', 'Brugerdefineret med manuelt angivet friktionsvinkel'],
    ['brugerdefineret-cm', 'Brugerdefineret med cm i tabeller og figurer'],
    ['tomme-afsnit', 'Alle syv tekster bevidst tomme; overskrifter bevares'],
    ['fravalgt-grundlag', 'Alle grundlagslinjer fravalgt; tabel og overskrift udelades'],
    ['lange-afsnit', 'Lang forudsætningstekst med mange afsnit og sideskift'],
    ['specialtegn', 'Bogstavelige Typst-specialtegn og flerlinjet beskrivelse'],
    ['formateret-tekst', 'B-046: fed, kursiv, punkter, underpunkter og hængende indrykning'],
    ['fravalgte-afsnit', 'B-046: afsnit og deres overskrifter fravalgt'],
    [
      'personer-uden-bundkolonne',
      'Sagsbehandler i bunden; kvalitetssikring kun som initialer øverst',
    ],
    [
      'personer-med-bundkolonne',
      'Sagsbehandler og kvalitetssikring i to bundkolonner; telefon før mail',
    ],
    ['rettede-og-fravalgte-linjer', 'B-049: redigeret tekst/værdi og fravalgt resultatlinje'],
    ['fravalgt-resultattabel', 'Alle resultatlinjer fravalgt; overskrift/indledning bevares'],
  ];
  assert.equal(original.length, descriptions.length);
  const cases: R6Case[] = original.map((report, i) => ({
    name: descriptions[i][0],
    description: descriptions[i][1],
    source: report.name,
    report,
    profile: structuredClone(DEFAULT_COMPANY_PROFILE),
    forbiddenStrings: [],
  }));
  const basis = original[0];
  function add(name: string, description: string, source: string, report = structuredClone(basis)) {
    const c: R6Case = {
      name,
      description,
      source,
      report,
      profile: structuredClone(DEFAULT_COMPANY_PROFILE),
      forbiddenStrings: [],
    };
    cases.push(c);
    return c;
  }
  const outer = JSON.parse(
    readFileSync(new URL('../reference/dimensioning-page-cases.json', import.meta.url), 'utf8'),
  ).cases.find((c: { id: string }) => c.id === 'OUT-2').input as {
    tilstand: 'Standard';
    eu: number;
    klasse: string;
    geonet_navn: string;
    indstillinger: Settings;
    materialer: [];
  };
  const out = add(
    'yderomraade-vejdim-out2',
    'Trafikklasse T1 uden for diagrammet; VejDim under inden/uden',
    'OUT-2',
  );
  out.report.settings = structuredClone(outer.indstillinger);
  out.report.result = dimensioner({
    tilstand: outer.tilstand,
    eu: outer.eu,
    grundlag: { type: 'trafikklasse', t_klasse: outer.klasse },
    geonet_navn: outer.geonet_navn,
    materialer: outer.materialer,
    indstillinger: out.report.settings,
    t_basis_table: out.report.table,
  })!;
  assert.ok(out.report.result);
  const long = add(
    'lange-projekt-og-tabeltekster',
    'Lange projekt-/materialenavne, flerlinjet beskrivelse og tabelværdi',
    'Syntetisk R6',
  );
  long.report.metadata.projekt =
    'Syntetisk prøveprojekt for adgangsveje og oplagspladser ved det nordlige driftsområde – etape 2';
  long.report.metadata.beskrivelse =
    'Prøvesag uden kundedata.\n' +
    'Den eksisterende opbygning undersøges på flere delstrækninger med forskellige materialer og kontrolpunkter. '.repeat(
      4,
    );
  long.report.valg.standard_materialer = [
    'Genanvendt stabilgrus fra syntetisk prøvesag med særskilt kontrol af kornkurve og komprimering',
    'Bundsikringsmateriale til adgangsvej og oplagsplads med eftervisning af frostfølsomhed',
  ];
  const resultLine = resultat_linjer(long.report.result, long.report.valg).find(
    ([key]) => key === '1lag',
  )!;
  long.report.valg.linje_rettelser = {
    resultat_1lag: {
      beregnet_tekst: resultLine[1],
      beregnet_vaerdi: resultLine[2],
      tekst: 'Stabiliseret prøveopbygning med ét geonetlag og eftervisning på delstrækninger',
      vaerdi: '650 mm\nKontrol på delstrækning A\nKontrol på delstrækning B',
    },
  };
  long.report.tekster.udfoerelse =
    '\tIndrykket almindelig tekst efter B-052.\n\t• Indrykket punkt efter B-046.';

  function profileCase(name: string, description: string, changes: [string, unknown][]) {
    const c = add(name, description, 'Profilvariation af standard');
    for (const [path, value] of changes) {
      const changed = changeProfileField(c.profile, path, value);
      assert.equal(changed.error, null, `${name}: ${path}`);
      c.profile = changed.profile;
    }
  }
  for (const index of [0, 1]) {
    profileCase(
      `logo-${PROFILE_LIMITS.logo_bredde_mm[index]}mm`,
      `Logo ${PROFILE_LIMITS.logo_bredde_mm[index]} mm`,
      [['logo_bredde_mm', PROFILE_LIMITS.logo_bredde_mm[index]]],
    );
  }
  profileCase('logo-kun-foerste-side', 'Logo og slogan kun på første side', [
    ['logo_paa_alle_sider', false],
  ]);
  for (const [index, label] of ['minimum', 'maksimum'].entries()) {
    profileCase(
      `margener-${label}`,
      `Alle margener ved ${label}: top/bund/venstre/højre`,
      Object.entries(PROFILE_LIMITS)
        .filter(([path]) => path.startsWith('margener_mm.'))
        .map(([path, limits]) => [path, limits[index]]),
    );
  }
  for (const size of PROFILE_LIMITS['skrift.stoerrelse_pt']) {
    profileCase(`skrift-${size}pt`, `Brødtekst ${size} pt`, [['skrift.stoerrelse_pt', size]]);
  }
  profileCase('liberation-sans', 'Liberation Sans som brødtekst', [
    ['skrift.broedtekst', 'Liberation Sans'],
  ]);
  profileCase('side-1-af-3', 'Sidetal »Side 1 af 3« på standardsagens tre sider', [
    ['sidetal', 'side-af'],
  ]);
  profileCase('farvede-overskrifter', 'Overskrifter i firmafarven', [
    ['overskrifter_i_farve', true],
  ]);
  profileCase('lang-sidefod', 'Lang kontaktlinje med ombrydning og reserveret plads', [
    [
      'sidefod',
      Array.from(
        { length: 8 },
        (_, i) =>
          `Prøveafdeling ${i + 1} | Syntetisk Vej 12 | 5000 Prøveby | Tlf. 12 34 56 78 | afdeling${i + 1}@example.invalid`,
      ).join(' | '),
    ],
  ]);
  profileCase('anden-firmafarve', 'Anden firmafarve i sidefod og overskrifter', [
    ['farve', '#173f7a'],
    ['overskrifter_i_farve', true],
  ]);

  for (const [i, c] of cases.entries()) {
    c.name = `${String(i + 1).padStart(2, '0')}-${c.name}`;
    c.report.data = reportData(c.report.result, c.report.metadata, c.report.valg, c.report.tekster);
    // Unikke markører sikrer, at også skjult brødtekst afprøves, ikke kun overskrifter.
    for (const [key, included] of Object.entries(c.report.valg.medtag_afsnit ?? {})) {
      if (included === false) {
        const marker = `R6-FRAVALGT-${key}`;
        c.report.tekster[key as keyof typeof c.report.tekster] = marker;
        c.forbiddenStrings.push(marker);
      }
    }
    c.report.data = reportData(c.report.result, c.report.metadata, c.report.valg, c.report.tekster);
    if (c.source === 'no-basis') c.forbiddenStrings.push('Grundlag for beregning:');
    if (c.source === 'b049-skjult-resultattabel')
      c.forbiddenStrings.push(...resultat_linjer(c.report.result, {}).map(([, label]) => label));
    if (c.source === 'b048-uden-kontrollant')
      c.forbiddenStrings.push('Bo Nielsen', '87 65 43 21', 'bo@example.invalid');
    if (c.source === 'b049-rettede-linjer')
      c.forbiddenStrings.push('Underbundens E-modul (Eᵤ)', 'Stabiliseret tykkelse — 1 lag');
  }
  // Det nye yderområdetilfælde skal faktisk udløse den særlige rapportlinje.
  assert.ok(grundlag_linjer(out.report.result, {}).some(([key]) => key === 'yderomraade'));
  return cases;
}
