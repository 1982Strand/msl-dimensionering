import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dimensioner, type DimensioningInput } from '../src/engine/dimensionering.ts';
import { beregn_alle_produkter } from '../src/engine/products.ts';
import { constructionData } from '../src/engine/construction.ts';
import { constructionSvg } from '../src/engine/construction-svg.ts';

const fixtures = JSON.parse(
  readFileSync(new URL('../reference/construction-cases.json', import.meta.url), 'utf8'),
);
export function constructionCase(c: (typeof fixtures.cases)[number]) {
  const input: DimensioningInput = {
    tilstand: c.inputs.mode,
    eu: c.inputs.eu,
    grundlag: { type: 'belastningsklasse', klasse: c.inputs.class },
    geonet_navn: c.inputs.selected_product,
    materialer: c.inputs.materials,
    indstillinger: c.inputs.settings,
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
  return constructionData(
    result,
    products,
    c.inputs.settings.opbygning,
    c.inputs.settings.lagfordeling.netplacering,
  );
}
test('construction inputs exactly match six original ui.snit calls including layers, positions, optimal notes and statuses', () => {
  for (const c of fixtures.cases) {
    const { kolonner, ...options } = constructionCase(c);
    assert.deepEqual(kolonner, c.ui_snit.columns, c.id);
    assert.deepEqual(options, c.ui_snit.kwargs, c.id);
  }
});
test('shared SVG preserves scale, omits invalid construction, respects display switches and escapes user material names', () => {
  const data = constructionCase(fixtures.cases[0]);
  data.kolonner[0].lag[0][0] = '<script>alert("material")</script>';
  const svg = constructionSvg(data);
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&lt;script&gt;'));
  const invalid = svg.split('data-column="2"')[1].split('</g>')[0];
  assert.ok(!invalid.includes('data-kind="subgrade"'));
  assert.ok(!invalid.includes('data-kind="geonet"'));
  data.vis_maal_streg = false;
  data.vis_maal_tal = false;
  data.vis_signatur = false;
  data.geonet_paaskrift = false;
  const hidden = constructionSvg(data);
  assert.ok(!hidden.includes('data-kind="dimension-line"'));
  assert.ok(!hidden.includes('data-kind="dimension-value"'));
  assert.ok(!hidden.includes('data-kind="legend"'));
  assert.ok(hidden.includes('data-kind="geonet"'));
});
test('B-074: skærmens bredere blokke holder materialenavnet på én linje; rapportens mål er uændrede', () => {
  const names = new Set<string>();
  for (const c of fixtures.cases) {
    const data = constructionCase(c);
    const report = constructionSvg(data, 'x');
    const screen = constructionSvg(data, 'x', { blokbredde: 148, navnebredde: 20 });
    // Rapportens standard: blok 124 og målestreg 88 fra midten (R6 låst med SHA-256).
    assert.ok(!report.includes('width="148"'), c.id);
    for (const column of data.kolonner)
      for (const [name] of column.lag) {
        if (!name.includes('Stabilgrus SGII 0-32')) continue;
        names.add(name);
        // Hele navnet står i én tspan på skærmen, men brydes i rapporten.
        assert.ok(screen.includes(`>${name} </tspan>`), `${c.id}: skærm`);
        assert.ok(!report.includes(`>${name} </tspan>`), `${c.id}: rapport`);
      }
    if (data.kolonner.some((col) => col.total_mm)) assert.ok(screen.includes('width="148"'), c.id);
  }
  assert.ok(names.size > 0, 'ingen case med Stabilgrus SGII 0-32');
});
