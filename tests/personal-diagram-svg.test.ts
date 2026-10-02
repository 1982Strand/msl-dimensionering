import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  byg_designdiagram,
  type PersonalDiagramInput,
  type PersonalDiagramSpec,
} from '../src/engine/personal-diagram.ts';
import {
  diagramModel,
  renderPersonalDiagramSvg,
  svgScales,
  forklaring,
  TEMA,
} from '../src/engine/personal-diagram-svg.ts';
import { personalDiagramSvg } from '../src/ui/personal-diagram-export.ts';

const captured: {
  cases: {
    id: string;
    kwargs: PersonalDiagramInput;
    expected?: PersonalDiagramSpec;
    expected_error?: string;
  }[];
} = JSON.parse(
  readFileSync(new URL('../reference/personal-diagram-cases.json', import.meta.url), 'utf8'),
);
const figures: { figures: { id: string; charts: PersonalDiagramSpec[] }[] } = JSON.parse(
  readFileSync(new URL('../reference/figures.json', import.meta.url), 'utf8'),
);
const cases = [
  ...captured.cases,
  ...figures.figures.map((f) => ({ id: `figures.json/${f.id}`, expected: f.charts[1] })),
];
const pairs = (t: Record<string, unknown>) =>
  (t.x as number[]).map((x, i) => [x, (t.y as number[])[i]]);
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );

for (const c of cases) {
  test(`M5 SVG: alle data og signaturposter bevares i ${c.id}`, () => {
    if ('expected_error' in c && c.expected_error) {
      // Den 11. optagelse er en fejlcase uden SVG-specifikation.
      assert.throws(() => byg_designdiagram(c.kwargs), { message: c.expected_error });
      return;
    }
    const spec = c.expected!;
    const m = diagramModel(spec);
    const lines = spec.data.filter((t) => t.mode === 'lines');
    const bands = spec.data.filter((t) => t.fill === 'toself');
    const points = spec.data.filter((t) => t.mode === 'markers');
    assert.deepEqual(
      m.linjer.map((l) => ({ navn: l.navn, pts: l.pts })),
      lines.map((t) => ({ navn: t.name, pts: pairs(t) })),
    );
    assert.deepEqual(
      m.baand.map((b) => b.pts),
      bands.map(pairs),
    );
    assert.deepEqual(
      m.punkter.map((p) => ({
        navn: p.navn,
        x: p.x,
        y: p.y,
        hul: p.hul,
        iForklaring: p.iForklaring,
      })),
      points.flatMap((t) =>
        pairs(t).map(([x, y]) => ({
          navn: t.name,
          x,
          y,
          hul: (t.marker as { color: string }).color === 'rgba(0,0,0,0)',
          iForklaring: t.showlegend === true,
        })),
      ),
    );
    const xaxis = spec.layout.xaxis as { range: number[]; title: { text: string } };
    const yaxis = spec.layout.yaxis as { range: number[]; title: { text: string } };
    assert.deepEqual(m.x, xaxis.range);
    assert.deepEqual(m.y, yaxis.range);
    assert.equal(m.xTitel, xaxis.title.text);
    assert.equal(m.yTitel, yaxis.title.text);
    const shapes = (spec.layout.shapes ?? []) as {
      type: string;
      x0: number;
      y0: number;
      y1: number;
    }[];
    assert.deepEqual(
      m.lodret,
      shapes.filter((s) => s.type === 'line').map((s) => ({ x: s.x0, y0: s.y0, y1: s.y1 })),
    );
    const legend = [...lines, ...points.filter((t) => t.showlegend === true)].map((t) => t.name);
    assert.deepEqual(
      forklaring(m).map((e) => e.navn),
      legend,
    );
    const svg = renderPersonalDiagramSvg(m);
    assert.equal(svg, renderPersonalDiagramSvg(diagramModel(spec)));
    assert.equal(svg, personalDiagramSvg(spec));
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
    assert.equal((svg.match(/data-curve=/g) ?? []).length, lines.length);
    assert.equal((svg.match(/data-band=/g) ?? []).length, bands.length);
    assert.equal((svg.match(/data-point=/g) ?? []).length, m.punkter.length);
    assert.ok(svg.includes(`>${esc(xaxis.title.text)}</text>`));
    assert.ok(svg.includes(`>${esc(yaxis.title.text)}</text>`));
    const legendSvg = svg.slice(svg.indexOf('<g data-legend='));
    assert.deepEqual(
      [...legendSvg.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((t) => t[1]),
      legend.map((t) => esc(String(t))),
    );
    for (const l of m.linjer) assert.ok(svg.includes(`stroke="${TEMA.serie[l.rolle]}"`));
    for (const b of m.baand)
      assert.ok(svg.includes(`fill="${TEMA.serie[b.rolle]}" fill-opacity="0.1"`));
    if (m.linjer.some((l) => l.optimal)) assert.ok(svg.includes('stroke-dasharray="0.1 4.5"'));
    if (m.lodret.length) assert.ok(svg.includes('stroke-dasharray="4 3"'));
  });
}

const base = captured.cases[0].expected!;

// Beregnet fra den uændrede renderer på codex/raadiagram-svg FØR SVG-udkastet.
// Faste forventninger: rendererens output sammenlignes aldrig kun med sig selv.
const originalHashes: Record<string, string> = {
  'FIG-001-standard-default': '8794161b1aa61234c786c4bc1ecba335434df39ab3c8e1f5d19d786f1c5283fe',
  'FIG-002-standard-interval': 'ceeb79cae148e9ad7d633b98cb86059e5f32f6edbc277d4a138b6d8d1b5eb45d',
  'FIG-003-custom-interval': '6f4b9c557167dd2d5dbc63d99e7e6a49dcd8b56e8d2a9029df7299d809c480bd',
  'FIG-004-custom-cm': '6f4b9c557167dd2d5dbc63d99e7e6a49dcd8b56e8d2a9029df7299d809c480bd',
  'M5-custom-hidden-points': '1e22501a4aabe436b8572b467d6e8bac6ae788154b9d622b0b0ee2a65219a598',
  'M5-custom-manual-phi40': '4e0de461491eb8e174e9f1b0b7faa2420df3644dbd6c5ef190fa1e8c727748fd',
  'M5-custom-traffic-t4-eu7': '634f05096bcdd9c53cd2669fa0cf157fc2538b07c1c6b948bbe75d88b05b90b7',
  'M5-standard-traffic-t4-eu10': 'f5dc3c672005dd342c0cb1c7636d2f6d52f2aa26f36e0faf1a9e21186d976b75',
  'M5-scaled-boundary': '1acffd14bd4519b6de53e4fa251c5ec9ff16eb529a40bfe343bf77a1cd26cb6a',
  'M5-per-curve-phi': '747a67ce36eefe2be16c04712a19718ecbcf94a5bbb35b225aa75553da314258',
};
for (const [id, hash] of Object.entries(originalHashes)) {
  test(`M5 SVG: byte-identisk standardoutput i ${id}`, () => {
    const spec = captured.cases.find((c) => c.id === id)!.expected!;
    const svg = renderPersonalDiagramSvg(diagramModel(spec));
    assert.equal(createHash('sha256').update(svg).digest('hex'), hash);
    assert.match(svg, /role="img" aria-label="Personligt designdiagram"/);
    assert.doesNotMatch(svg, /data-curve-marker=/);
  });
}
test('M5 SVG: ukendte navne, aksetekst og skrift escapes og får neutral farve', () => {
  const spec = structuredClone(base),
    special = '<&"';
  spec.data[0].name = special;
  (spec.layout.xaxis as { title: { text: string } }).title.text = special;
  (spec.layout.yaxis as { title: { text: string } }).title.text = special;
  const m = diagramModel(spec),
    svg = renderPersonalDiagramSvg(m, { fontFamily: special });
  assert.equal(m.linjer[0].rolle, 'neutral');
  assert.match(svg, /data-name="&lt;&amp;&quot;"/);
  assert.match(svg, /font-family="&lt;&amp;&quot;"/);
  assert.equal((svg.match(/>&lt;&amp;&quot;<\/text>/g) ?? []).length, 3);
  assert.ok(svg.includes(`data-name="&lt;&amp;&quot;" d=`));
  assert.ok(svg.includes(`stroke="${TEMA.serie.neutral}"`));
  assert.ok(!svg.includes(special));
});

test('M5 SVG: ikke-endelige koordinater filtreres i kurver, bånd, punkter og lodrette linjer', () => {
  const spec = structuredClone(base);
  spec.data = [
    {
      mode: 'lines',
      name: 'Ukendt',
      x: [1, NaN, 3, Infinity, 5],
      y: [1, 2, Infinity, 4, 5],
      line: { color: '#123456' },
    },
    { fill: 'toself', x: [1, 2, NaN], y: [1, 2, 3], fillcolor: '#123456' },
    { mode: 'markers', name: 'Ukendt punkt', x: [1, 2, 3], y: [1, -Infinity, 3], showlegend: true },
    { mode: 'lines', name: 'Tom kurve' },
    { fill: 'toself', x: [NaN], y: [NaN] },
  ];
  spec.layout.shapes = [{ type: 'line', x0: NaN, y0: 0, y1: 1 }];
  const m = diagramModel(spec);
  assert.deepEqual(m.linjer[0].pts, [
    [1, 1],
    [5, 5],
  ]);
  assert.deepEqual(m.linjer[1].pts, []);
  assert.deepEqual(m.baand[0].pts, [
    [1, 1],
    [2, 2],
  ]);
  assert.deepEqual(m.baand[1].pts, []);
  assert.deepEqual(
    m.punkter.map((p) => [p.x, p.y]),
    [
      [1, 1],
      [3, 3],
    ],
  );
  assert.equal(m.punkter[0].rolle, 'neutral');
  assert.equal(m.baand[0].rolle, 'neutral');
  assert.deepEqual(m.lodret, []);
  assert.doesNotMatch(renderPersonalDiagramSvg(m), /NaN|undefined|Infinity/);
});

test('M5 SVG: mål, skrift, skala og decimalkomma gælder også rapporteksporten', () => {
  const spec = structuredClone(base);
  (spec.layout.yaxis as { range: number[] }).range = [0, 1];
  const m = diagramModel(spec),
    size = { width: 900, height: 550 };
  const scales = svgScales(m, size);
  assert.equal(scales.sx(m.x[0]), 58);
  assert.equal(scales.sx(m.x[1]), 882);
  assert.equal(scales.sy(m.y[0]), 504);
  assert.equal(scales.sy(m.y[1]), 18);
  assert.equal(scales.iy(scales.sy(0.5)), 0.5);
  const options = { ...size, fontFamily: 'Carlito' };
  const svg = renderPersonalDiagramSvg(m, options);
  assert.equal(svg, personalDiagramSvg(spec, options));
  assert.match(svg, /viewBox="0 0 900 550"/);
  assert.match(svg, /font-family="Carlito"/);
  assert.match(svg, />0,2<\/text>/);
  assert.doesNotMatch(svg, />0\.2<\/text>/);
  assert.throws(() => svgScales(m, { width: NaN, height: 400 }));
});

test('M5 SVG: tomme traces er sikre, ugyldige akseintervaller afvises', () => {
  const spec = structuredClone(base);
  spec.data = [];
  assert.doesNotMatch(renderPersonalDiagramSvg(diagramModel(spec)), /NaN|undefined|Infinity/);
  (spec.layout.xaxis as { range: number[] }).range = [1, 1];
  assert.throws(() => diagramModel(spec), /akseinterval/);
});
