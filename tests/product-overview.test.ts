import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { standard_data_state } from '../src/engine/auto-edit.ts';
import { dimensioningInput } from '../src/engine/dimensioning-form.ts';
import { dimensioner } from '../src/engine/dimensionering.ts';
import { beregn_alle_produkter } from '../src/engine/products.ts';
import { productOverview, overviewColumns } from '../src/engine/product-overview.ts';

const reference = JSON.parse(
  readFileSync(new URL('./cases/product-overview-cases.json', import.meta.url), 'utf8'),
);

test('product overview matches six independently captured original tables in Standard/custom, load/traffic and mm/cm', () => {
  for (const c of reference.cases) {
    const data = {
      ...standard_data_state(),
      materialer: c.inputs.available_materials,
      indstillinger: c.inputs.settings,
    };
    const input = dimensioningInput({ ...c.inputs.controls, tilstand: c.inputs.mode }, data);
    const result = dimensioner(input)!;
    const common = {
      eu: input.eu,
      eo: result.eo!,
      phi: result.phi,
      afrunding: result.afrunding,
      skala: result.skala,
      t_basis_table: input.t_basis_table,
      klasse_for_anbefaling: result.valgt_klasse,
    };
    const overview = productOverview({
      one: beregn_alle_produkter({ ...common, lag_mode: '1_lag' }),
      two: beregn_alle_produkter({ ...common, lag_mode: '2_lag' }),
      unit: c.inputs.unit,
      rounding: data.indstillinger.afrunding,
      trafficEu: input.grundlag?.type === 'trafikklasse' ? input.eu : null,
      runs: input.koersler,
      table: input.t_basis_table,
      rules: input.indstillinger?.yderomraade,
    });
    assert.deepEqual(
      overviewColumns.map((column) => column.label),
      c.headers,
      c.id,
    );
    assert.deepEqual(
      overview.rows.map((row) => ({ selected: row.name === result.geonet_navn, cells: row.cells })),
      c.rows,
      c.id,
    );
    assert.equal(overview.caption, c.caption, c.id);
  }
});
