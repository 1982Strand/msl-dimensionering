
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  dimensioner,
  type DimensioningInput,
  type Material,
  type Settings,
} from '../src/engine/dimensionering.ts';
import type { BasisTable } from '../src/engine/types.ts';
import { cv_til_eu } from '../src/engine/data.ts';
import {
  reportData,
  grundlag_linjer,
  resultat_linjer,
  SECTION_KEYS,
  type ReportContext,
  type ReportChoices,
  type EditedTexts,
  type ReportMetadata,
} from '../src/report/report-data.ts';
interface Snapshot {
  id: string;
  page: string;
  settings: Settings;
  widgets: { key: string; value: string | number | boolean }[];
  dimensioning: unknown;
  report_text: { basis: [string, string][]; results: [string, string][] } | null;
}
const ui = JSON.parse(
  readFileSync(new URL('../tests/cases/ui-flows.json', import.meta.url), 'utf8'),
) as {
  defaults: { materialer: Material[]; aktiv_t_basis_table: BasisTable };
  snapshots: Snapshot[];
};
const reference = JSON.parse(
  readFileSync(new URL('../tests/cases/report-contexts.json', import.meta.url), 'utf8'),
) as {
  cases: {
    case: string;
    snapshot: string;
    context: ReportContext & { visualisering: unknown; designdiagram: unknown };
    sections: Record<string, string>;
  }[];
};

// Kun rå widgetværdier, indstillinger og indbyggede materialer/tabel bruges
// som motorinput. Snapshot.dimensioning og context bruges kun som forventninger.
function inputFraSnapshot(s: Snapshot): DimensioningInput {
  const w = Object.fromEntries(s.widgets.map((item) => [item.key, item.value]));
  function value(key: string): string | number | boolean {
    assert.ok(Object.hasOwn(w, key), `${s.id}: manglende original sessionsværdi ${key}`);
    return w[key];
  }
  const standard = value('tilstand') === 'Standard',
    prefix = standard ? 'std' : 'bd';
  const eu = String(value(`${prefix}_eu_mode`)).startsWith('Cv')
    ? cv_til_eu(Number(value(`${prefix}_cv_slider`)))!
    : Number(value(`${prefix}_eu_slider`));
  const materials: Material[] = [];
  if (!standard) {
    for (let i = 0; i < Number(value('bd_antal_lag')); i++) {
      const name = String(value(`bd_mat_${i}`));
      const source = ui.defaults.materialer.find((m) => m.navn === name);
      materials.push({
        navn: name,
        phi: source ? source.phi : Number(value(`bd_phi_m_${i}`)),
        max_korn: source ? source.max_korn : Number(value(`bd_korn_m_${i}`)),
        lagtype: source ? source.lagtype : String(value(`bd_lt_m_${i}`)),
        tykkelse_mm: Number(value(`bd_t_${i}`)),
        pct: null,
        krav_maskestoerrelse_mm: source?.krav_maskestoerrelse_mm ?? null,
      });
    }
  }
  return {
    tilstand: standard ? 'Standard' : 'Brugerdefineret',
    eu,
    grundlag:
      value(`${prefix}_grundlag`) === 'Trafikklasse'
        ? { type: 'trafikklasse', t_klasse: String(value(`${prefix}_valgt_tklasse`)) }
        : { type: 'belastningsklasse', klasse: Number(value(`${prefix}_valgt_klasse`)) },
    geonet_navn: String(value(`${prefix}_geonet`)),
    materialer: materials,
    phi_manuel: !standard && value('bd_phi_override') ? Number(value('bd_phi_man')) : null,
    indstillinger: s.settings,
    t_basis_table: ui.defaults.aktiv_t_basis_table,
  };
}

function rapportvalg(name: string): { valg: ReportChoices; tekster: EditedTexts } {
  const valg: ReportChoices = {},
    tekster: EditedTexts = {};
  if (name === 'centimetres') valg.enhed = 'cm';
  if (name === 'empty-text') for (const key of SECTION_KEYS) tekster[key] = '';
  if (name === 'no-basis')
    valg.grundlag_linjer = { eu: false, grundlag: false, materialer: false, phi: false };
  if (name === 'long-text')
    tekster.oplyste_forudsaetninger = Array(18)
      .fill('Syntetisk prøvesag. Underbund og materialer skal eftervises ved kontrol.')
      .join('\n\n');
  return { valg, tekster };
}

export function reportCases() {
  return reference.cases.map((c) => {
    const snapshot = ui.snapshots.find((s) => s.id === c.snapshot)!;
    const result = dimensioner(inputFraSnapshot(snapshot))!;
    const metadata: ReportMetadata = {
      projekt: 'MSL reference ' + c.case,
      beskrivelse: 'Syntetisk migrationskontrol',
      omfang: 'Dimensionering af vejopbygning',
      udfoeres_for: 'MSL prøveprojekt',
      sagsbehandler: 'Testingeniør',
      sagsbehandler_mail: 'test@example.invalid',
      kontrol: 'Kontrolperson',
      dato: '2026-09-29',
    };
    const { valg, tekster } = rapportvalg(c.case);
    return {
      name: c.case,
      result,
      metadata,
      valg,
      tekster,
      data: reportData(result, metadata, valg, tekster),
      settings: snapshot.settings,
      table: ui.defaults.aktiv_t_basis_table,
    };
  });
}

export type ReportCase = ReturnType<typeof reportCases>[number];

/** Originaltilfælde samt de allerede forelagte B-046/B-048/B-049-varianter. */
export function reportReviewCases(): ReportCase[] {
  const cases = reportCases();
  const special = structuredClone(cases[0]);
  special.name = 'special-characters';
  special.metadata.projekt = '# $ * _ @ < > [ ] \\ #panic("MUST NOT RUN")';
  special.metadata.beskrivelse = 'Flerlinjet beskrivelse\n# $ * _ @ < > [ ] \\';
  special.tekster.udfoerelse =
    'Bogstavelig tekst: # $ * _ @ < > [ ] \\\n#panic("MUST NOT RUN")\n\n   • Indrykket punkt\n           o Underpunkt';
  special.data = reportData(special.result, special.metadata, special.valg, special.tekster);
  cases.push(special);
  const formatted = structuredClone(cases[0]);
  formatted.name = 'b046-formatted-text';
  formatted.tekster.udfoerelse =
    'Et afsnit med **fed tekst** og *kursiv tekst*.\n\n' +
    '• Første punkt\n  - Underpunkt med **fed** tekst\n    o Underpunkt med *kursiv* tekst\n' +
    '- ' +
    'En lang punktlinje skal fortsætte under teksten med hængende indrykning. '.repeat(8) +
    '\n\n  Almindelig indrykning\n# $ [ ] \\ @ < > #panic("MUST NOT RUN")\n**Uafsluttet';
  formatted.data = reportData(
    formatted.result,
    formatted.metadata,
    formatted.valg,
    formatted.tekster,
  );
  cases.push(formatted);
  const omitted = structuredClone(cases[0]);
  omitted.name = 'b046-omitted-sections';
  omitted.valg.medtag_afsnit = { oplyste_forudsaetninger: false, udfoerelse: false };
  omitted.data = reportData(omitted.result, omitted.metadata, omitted.valg, omitted.tekster);
  cases.push(omitted);
  // B-048: ekstra lag oven på originaltilfældene; forventningerne ændres ikke.
  for (const control of [false, true]) {
    const c = structuredClone(cases[0]);
    c.name = control ? 'b048-med-kontrollant' : 'b048-uden-kontrollant';
    Object.assign(c.metadata, {
      sagsbehandler: 'Anna Jensen',
      sagsbehandler_initialer: 'AJ',
      sagsbehandler_mail: 'anna@example.invalid',
      sagsbehandler_telefon: '12345678',
      kontrol: 'Bo Nielsen',
      kontrol_initialer: 'BN',
      kontrol_telefon: '87654321',
      kontrol_mail: 'bo@example.invalid',
      kontrollant_i_bunden: control,
    });
    c.data = reportData(c.result, c.metadata, c.valg, c.tekster);
    cases.push(c);
  }
  const edited = structuredClone(cases[0]);
  edited.name = 'b049-rettede-linjer';
  const basisLine = grundlag_linjer(edited.result, edited.valg).find(([key]) => key === 'eu')!;
  const resultLine = resultat_linjer(edited.result, edited.valg).find(([key]) => key === '1lag')!;
  edited.valg.linje_rettelser = {
    basis_eu: {
      beregnet_tekst: basisLine[1],
      beregnet_vaerdi: basisLine[2],
      tekst: 'Eftervist E-modul',
      vaerdi: '22 MPa (prøvesag)',
    },
    resultat_1lag: {
      beregnet_tekst: resultLine[1],
      beregnet_vaerdi: resultLine[2],
      tekst: 'Tilpasset MSL-opbygning',
      vaerdi: '450 mm (prøvesag)',
    },
  };
  edited.valg.resultat_linjer = { '2lag': false };
  edited.data = reportData(edited.result, edited.metadata, edited.valg, edited.tekster);
  cases.push(edited);
  const hiddenResults = structuredClone(cases[0]);
  hiddenResults.name = 'b049-skjult-resultattabel';
  hiddenResults.valg.resultat_linjer = Object.fromEntries(
    resultat_linjer(hiddenResults.result, hiddenResults.valg).map(([key]) => [key, false]),
  );
  hiddenResults.data = reportData(
    hiddenResults.result,
    hiddenResults.metadata,
    hiddenResults.valg,
    hiddenResults.tekster,
  );
  cases.push(hiddenResults);

  return cases;
}
