import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dimensioner } from '../src/engine/dimensionering.ts';
import type { DimensioningInput, Material, Settings } from '../src/engine/dimensionering.ts';
import type { BasisTable } from '../src/engine/types.ts';
import { cv_til_eu } from '../src/engine/data.ts';
import { parseReportText } from '../src/report/text-format.ts';
import { reportCases } from '../tools/report-cases.ts';
import {
  reportData,
  SECTION_KEYS,
  formatér_dimensioneringsgrundlag,
  formatér_dimensioneringsresultat,
  type EditedTexts,
  type ReportChoices,
  type ReportContext,
} from '../src/report/report-data.ts';

interface Snapshot {
  id: string;
  page: string;
  settings: Settings;
  widgets: { key: string; value: string | number | boolean }[];
  dimensioning: unknown;
  report_text: { basis: [string, string][]; results: [string, string][] } | null;
}

test('B-048: initialer øverst med navnefallback, underskrift med/uden kontrollant og uden tomme linjer', () => {
  const c = reportCases()[0];
  const metadata = {
    ...c.metadata,
    sagsbehandler_initialer: ' AJ ',
    sagsbehandler_telefon: ' 12345678 ',
    kontrol_initialer: 'BN',
    kontrol_mail: 'bo@example.invalid',
    kontrol_telefon: '87654321',
  };
  const data = reportData(c.result, metadata);
  assert.deepEqual(data.context, reportData(c.result, c.metadata).context);
  assert.deepEqual(data.medarbejdere, {
    udfoert_af: 'AJ',
    kontrol: 'BN',
    sagsbehandler: [c.metadata.sagsbehandler, c.metadata.sagsbehandler_mail, '12345678'],
    kontrollant: null,
  });
  const both = reportData(c.result, { ...metadata, kontrollant_i_bunden: true });
  assert.deepEqual(both.medarbejdere.kontrollant, [
    c.metadata.kontrol,
    '87654321',
    'bo@example.invalid',
  ]);
  const fallback = reportData(c.result, {
    ...metadata,
    sagsbehandler_initialer: ' ',
    kontrol_initialer: '',
    sagsbehandler_mail: '',
    kontrol_telefon: '',
    kontrollant_i_bunden: true,
  });
  assert.equal(fallback.medarbejdere.udfoert_af, c.metadata.sagsbehandler);
  assert.equal(fallback.medarbejdere.kontrol, c.metadata.kontrol);
  assert.deepEqual(fallback.medarbejdere.sagsbehandler, [c.metadata.sagsbehandler, '12345678']);
  assert.deepEqual(fallback.medarbejdere.kontrollant, [c.metadata.kontrol, 'bo@example.invalid']);
  const empty = reportData(c.result, { kontrollant_i_bunden: true });
  assert.deepEqual(empty.medarbejdere.sagsbehandler, []);
  assert.deepEqual(empty.medarbejdere.kontrollant, []);
});
const ui = JSON.parse(
  readFileSync(new URL('../reference/ui-flows.json', import.meta.url), 'utf8'),
) as {
  defaults: { materialer: Material[]; aktiv_t_basis_table: BasisTable };
  snapshots: Snapshot[];
};
const reference = JSON.parse(
  readFileSync(new URL('../reference/report-contexts.json', import.meta.url), 'utf8'),
) as {
  source_commit: string;
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

// Rå rapportinput fra prepare_reference.py's cases/data, ikke fra context.
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

for (const c of reference.cases) {
  test(`R1 ${c.case}: hele konteksten og overskrifterne matcher originalen præcist`, () => {
    const snapshot = ui.snapshots.find((s) => s.id === c.snapshot);
    assert.ok(snapshot, `${c.case}: manglende original snapshot ${c.snapshot}`);
    const input = inputFraSnapshot(snapshot);
    const result = dimensioner(input);
    assert.ok(result, `${c.case}: motoren skal danne et gyldigt resultat`);
    assert.deepEqual(
      result,
      snapshot.dimensioning,
      'rå input skal først genskabe hele motorresultatet',
    );
    const metadata = {
      projekt: `MSL reference ${c.case}`,
      beskrivelse: 'Syntetisk migrationskontrol',
      omfang: 'Dimensionering af vejopbygning',
      udfoeres_for: 'MSL prøveprojekt',
      sagsbehandler: 'Testingeniør',
      sagsbehandler_mail: 'test@example.invalid',
      kontrol: 'Kontrolperson',
      dato: '2026-09-29',
    };
    const { valg, tekster } = rapportvalg(c.case);
    const before = structuredClone({ result, metadata, valg, tekster });
    const actual = reportData(result, metadata, valg, tekster);
    // Eneste udeladelse er de to billeder, som hører til R3. Ingen trim,
    // talafrunding, whitespace-, Unicode- eller anden værdinormalisering.
    // Python-tupler er allerede JSON-arrays i de frosne forventninger;
    // TypeScript-tupler er arrays. Derfor kræves ingen typenormalisering her.
    const { visualisering: _vis, designdiagram: _diagram, ...expected } = c.context;
    assert.deepEqual(actual.context, expected);
    // B-046 er et ekstra lag; de originale kontekststrenge ovenfor er uændrede.
    assert.deepEqual(
      actual.formattedTexts,
      Object.fromEntries(
        SECTION_KEYS.map((key) => [key, parseReportText(expected[`tekst_${key}`])]),
      ),
    );
    assert.deepEqual(actual.sections, c.sections);
    assert.deepEqual(Object.keys(actual.sections), SECTION_KEYS, 'original afsnitsrækkefølge');
    if (c.case === 'no-basis') {
      assert.equal(actual.grundlag, null, 'både tabel og overskrift skal udelades af layoutet');
      assert.deepEqual(actual.context.dim_grundlag, []);
    } else {
      assert.deepEqual(actual.grundlag, {
        overskrift: 'Grundlag for beregning',
        rows: expected.dim_grundlag,
      });
    }
    assert.deepEqual(
      { result, metadata, valg, tekster },
      before,
      'rapportdata må ikke ændre input',
    );
  });
}

test('R1: alle ti originale rapporttilfælde er med', () => {
  assert.equal(reference.source_commit, 'a330cfd6734ac2478be1304a362c69f94e412d25');
  assert.deepEqual(
    reference.cases.map((c) => [c.case, c.snapshot]),
    [
      ['standard', 'UI-001'],
      ['two-layers', 'UI-002'],
      ['nx850', 'UI-003'],
      ['traffic', 'UI-traffic-T4-10'],
      ['custom-three', 'UI-010'],
      ['manual-phi', 'UI-011'],
      ['centimetres', 'UI-013'],
      ['empty-text', 'UI-001'],
      ['no-basis', 'UI-001'],
      ['long-text', 'UI-001'],
    ],
  );
});

test('R1: aktive UI-snapshots med rapportdata matcher også originalens rapporttabeller', () => {
  const snapshots = ui.snapshots.filter((s) => s.page === 'dimensionering');
  assert.equal(snapshots.length, 17);
  for (const snapshot of snapshots) {
    // Afvist dimensionering har hverken rapporttabeller eller geonet-widget.
    if (!snapshot.report_text) continue;
    const result = dimensioner(inputFraSnapshot(snapshot));
    assert.ok(result, snapshot.id);
    assert.deepEqual(
      formatér_dimensioneringsgrundlag(result),
      snapshot.report_text.basis,
      snapshot.id,
    );
    assert.deepEqual(
      formatér_dimensioneringsresultat(result),
      snapshot.report_text.results,
      snapshot.id,
    );
  }
});
