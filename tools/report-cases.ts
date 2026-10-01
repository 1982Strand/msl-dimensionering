// Rå input som R1-testen: ui-flows widgets og prepare_reference-opskriften.
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
