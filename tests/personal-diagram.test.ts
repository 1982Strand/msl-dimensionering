import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mpa } from './enhed-mpa.ts';
import { byg_designdiagram, personalDiagramInput } from '../src/engine/personal-diagram.ts';
import { dimensioner, type DimensioningInput } from '../src/engine/dimensionering.ts';
import { beregn_alle_produkter } from '../src/engine/products.ts';
const captured = mpa(
  JSON.parse(readFileSync(new URL('./cases/personal-diagram-cases.json', import.meta.url), 'utf8')),
);
const original = mpa(
  JSON.parse(readFileSync(new URL('./cases/figures.json', import.meta.url), 'utf8')),
);

test('M5: complete Plotly specifications match eleven original cases without tolerance', () => {
  for (const c of captured.cases) {
    if (c.expected_error) {
      assert.throws(() => byg_designdiagram(c.kwargs), { message: c.expected_error });
    } else assert.deepEqual(byg_designdiagram(c.kwargs), c.expected, c.id);
  }
});
test('M5: selected-product adapter preserves original calls and four unchanged figures.json specifications', () => {
  for (const c of captured.cases.filter((c: { inputs?: unknown }) => c.inputs)) {
    const v = c.inputs;
    const input: DimensioningInput = {
      tilstand: v.mode,
      eu: v.eu,
      grundlag:
        v.basis === 'Trafikklasse'
          ? { type: 'trafikklasse', t_klasse: v.traffic }
          : { type: 'belastningsklasse', klasse: v.class },
      geonet_navn: v.selected_product,
      materialer: v.materials,
      indstillinger: v.settings,
      phi_manuel: v.phi_manual,
    };
    const result = dimensioner(input)!;
    const common = {
      eu: result.eu,
      eo: result.eo,
      phi: result.phi,
      afrunding: result.afrunding,
      skala: result.skala,
      klasse_for_anbefaling: result.valgt_klasse,
    };
    const products = {
      one: beregn_alle_produkter({ ...common, lag_mode: '1_lag' }),
      two: beregn_alle_produkter({ ...common, lag_mode: '2_lag' }),
    };
    const args = personalDiagramInput(result, products, undefined, v.show_input, v.show_endpoints);
    // Python leaves default optional best/skala/phi fields out of direct cases only.
    assert.deepEqual(args, c.kwargs, `${c.id}: exact UI arguments`);
    const figure = byg_designdiagram(args);
    assert.deepEqual(figure, c.expected, c.id);
    const frozen = original.figures.find((f: { id: string }) => f.id === c.id);
    if (frozen) assert.deepEqual(figure, frozen.charts[1], `${c.id}: unchanged figures.json`);
  }
});
