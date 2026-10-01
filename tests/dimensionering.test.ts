import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dimensioner } from '../src/engine/dimensionering.ts';
import type { DimensioningInput, Material, Settings } from '../src/engine/dimensionering.ts';
import type { BasisTable } from '../src/engine/types.ts';
import { cv_til_eu } from '../src/engine/data.ts';

interface Snapshot {
  id: string;
  page: string;
  settings: Settings;
  dimensioning: unknown;
  widgets: { key: string; value: string | number | boolean }[];
}
const frozen = JSON.parse(
  readFileSync(new URL('../reference/ui-flows.json', import.meta.url), 'utf8'),
) as {
  defaults: { materialer: Material[]; aktiv_t_basis_table: BasisTable };
  snapshots: Snapshot[];
};
// Reconstruct solely from recorded controls/default data, never from expected calculation fields.
const active = frozen.snapshots.filter((s) => s.page === 'dimensionering');
for (const s of active)
  test(`${s.id}: same dimensioning/report payload from recorded controls`, () => {
    const w = Object.fromEntries(s.widgets.map((w) => [w.key, w.value]));
    const standard = w.tilstand === 'Standard',
      prefix = standard ? 'std' : 'bd';
    const eu = String(w[`${prefix}_eu_mode`]).startsWith('Cv')
      ? cv_til_eu(Number(w[`${prefix}_cv_slider`]))!
      : Number(w[`${prefix}_eu_slider`]);
    const materials: Material[] = [];
    if (!standard)
      for (let i = 0; i < Number(w.bd_antal_lag); i++) {
        const name = String(w[`bd_mat_${i}`]),
          source = frozen.defaults.materialer.find((m) => m.navn === name);
        materials.push({
          navn: name,
          phi: source ? source.phi : Number(w[`bd_phi_m_${i}`]),
          max_korn: source ? source.max_korn : Number(w[`bd_korn_m_${i}`]),
          lagtype: source ? source.lagtype : String(w[`bd_lt_m_${i}`]),
          tykkelse_mm: Number(w[`bd_t_${i}`]),
          pct: null,
          krav_maskestoerrelse_mm: source?.krav_maskestoerrelse_mm ?? null,
        });
      }
    const input: DimensioningInput = {
      tilstand: standard ? 'Standard' : 'Brugerdefineret',
      eu,
      grundlag:
        w[`${prefix}_grundlag`] === 'Trafikklasse'
          ? { type: 'trafikklasse', t_klasse: String(w[`${prefix}_valgt_tklasse`]) }
          : { type: 'belastningsklasse', klasse: Number(w[`${prefix}_valgt_klasse`]) },
      geonet_navn: w[`${prefix}_geonet`] as string | undefined,
      materialer: materials,
      phi_manuel: w.bd_phi_override ? Number(w.bd_phi_man) : null,
      indstillinger: s.settings,
      t_basis_table: frozen.defaults.aktiv_t_basis_table,
    };
    const before = structuredClone(input);
    assert.deepEqual(dimensioner(input), s.dimensioning);
    assert.deepEqual(input, before, 'must not mutate controls/settings');
  });
test('all active dimensioning snapshots are covered', () => assert.equal(active.length, 17));
