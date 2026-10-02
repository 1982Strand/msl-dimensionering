import { test } from 'node:test';
import assert from 'node:assert/strict';
import { standard_designdiagrammer } from '../src/engine/editing.ts';
import { rawDiagram } from '../src/engine/table-presentation.ts';
import { rawDiagramModel } from '../src/engine/raw-diagram-svg.ts';
import { renderPersonalDiagramSvg, svgScales, TEMA } from '../src/engine/personal-diagram-svg.ts';

const diagrams = standard_designdiagrammer();
const roles = { Ustabiliseret: 'ustab', '1 lag geonet': 'lag1', '2 lag geonet': 'lag2' };
function checkSpec(spec: NonNullable<ReturnType<typeof rawDiagram>>) {
  const before = structuredClone(spec);
  const model = rawDiagramModel(spec);
  assert.deepEqual(
    model.linjer,
    spec.data.map((trace) => ({
      navn: trace.name,
      rolle: roles[trace.name as keyof typeof roles],
      optimal: false,
      pts: trace.x.map((x, i) => [x, trace.y[i]]),
    })),
  );
  assert.deepEqual(model.x, spec.layout.xaxis.range);
  assert.deepEqual(model.y, spec.layout.yaxis.range);
  assert.equal(model.xTitel, spec.layout.xaxis.title.text);
  assert.equal(model.yTitel, spec.layout.yaxis.title.text);
  assert.deepEqual(model.baand, []);
  assert.deepEqual(model.punkter, []);
  assert.deepEqual(model.lodret, []);
  assert.deepEqual(spec, before, 'Specifikationen må ikke ændres');
  return model;
}

test('Rådiagram SVG: alle seks indbyggede diagrammer er dækket', () => {
  assert.equal(diagrams.length, 6);
});
for (const diagram of diagrams) {
  test(`Rådiagram SVG: præcise spor, punkter og akser for diagram ${diagram.diagram_nr}`, () => {
    checkSpec(rawDiagram(diagram)!);
  });
}

test('Rådiagram SVG: redigeret punkt og tomt spor følger den aktive tabel', () => {
  const diagram = structuredClone(diagrams[0]);
  diagram.rows[0].t_1_lag_cm = 87.3;
  for (const row of diagram.rows) row.t_uarmeret_cm = null;
  const spec = rawDiagram(diagram)!;
  const model = checkSpec(spec);
  assert.equal(
    model.linjer.some((l) => l.navn === 'Ustabiliseret'),
    false,
  );
  const curve = model.linjer.find((l) => l.navn === '1 lag geonet')!;
  assert.equal(curve.rolle, 'lag1', 'Rollen følger navnet, også når et tidligere spor mangler');
  assert.deepEqual(curve.pts[0], [87.3, diagram.rows[0].eu]);
  const original = rawDiagramModel(rawDiagram(diagrams[0])!);
  assert.notDeepEqual(curve.pts, original.linjer.find((l) => l.navn === curve.navn)!.pts);
});

test('Rådiagram SVG: markører bruger punkternes skala/farve og særskilte SVG-id’er', () => {
  const model = rawDiagramModel(rawDiagram(diagrams[0])!);
  const size = { width: 420, height: 290 };
  const options = { ...size, markers: true, idPrefix: 'raw-test', ariaLabel: 'Rådiagram <&"' };
  const svg = renderPersonalDiagramSvg(model, options);
  assert.match(svg, /viewBox="0 0 420 290"/);
  assert.match(svg, /role="img" aria-label="Rådiagram &lt;&amp;&quot;"/);
  assert.match(svg, /id="raw-test-plot"/);
  assert.equal(
    (svg.match(/data-curve-marker=/g) ?? []).length,
    model.linjer.reduce((sum, curve) => sum + curve.pts.length, 0),
  );
  const { sx, sy } = svgScales(model, size);
  model.linjer.forEach((curve, i) =>
    curve.pts.forEach(([x, y], j) =>
      assert.ok(
        svg.includes(
          `<circle data-curve-marker="${i}" data-index="${j}" cx="${+sx(x).toFixed(2)}" cy="${+sy(y).toFixed(2)}" r="2.5" fill="${TEMA.serie[curve.rolle]}"/>`,
        ),
      ),
    ),
  );
  assert.doesNotMatch(svg, /data-band=|data-point=|NaN|undefined|Infinity/);
  assert.doesNotMatch(renderPersonalDiagramSvg(model, { markers: false }), /data-curve-marker=/);
});

test('Rådiagram SVG: tom tabel giver ingen specifikation', () => {
  const diagram = structuredClone(diagrams[0]);
  for (const row of diagram.rows) {
    row.t_uarmeret_cm = null;
    row.t_1_lag_cm = null;
    row.t_2_lag_cm = null;
  }
  assert.equal(rawDiagram(diagram), null);
});

test('Rådiagram SVG: ét nulpunkt bevares uden ugyldige SVG-koordinater', () => {
  const diagram = structuredClone(diagrams[0]);
  diagram.rows = [{ eu: 3, t_uarmeret_cm: 0, t_1_lag_cm: null, t_2_lag_cm: null }];
  const model = checkSpec(rawDiagram(diagram)!);
  assert.deepEqual(model.x, [0, 0]);
  assert.deepEqual(model.linjer[0].pts, [[0, 3]]);
  const svg = renderPersonalDiagramSvg(model, { markers: true, width: 420, height: 290 });
  assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
  assert.equal((svg.match(/data-curve-marker=/g) ?? []).length, 1);
});
