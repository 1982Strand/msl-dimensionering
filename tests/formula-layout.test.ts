import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dimensioner, type DimensioningInput } from '../src/engine/dimensionering.ts';
import {
  couplingText,
  koblingExplanation,
  type CouplingNode,
} from '../src/engine/kobling-explanation.ts';
import { phiSummary } from '../src/engine/phi-summary.ts';
import { GEONET_DB } from '../src/engine/data.ts';
import { pageCases, pageCaseInput } from './helpers/dimensioning-page.ts';
import { eoSteps } from '../src/engine/table-explanation.ts';
import { koersler_fra_raekker } from '../src/engine/editing.ts';
import { standard_data_state } from '../src/engine/auto-edit.ts';
import { correlationExampleLines } from '../src/ui/correlation-example-lines.ts';
import { factorPhiNodes, ROUNDING_NOTE, weightedPhiNodes } from '../src/ui/formula/phi-lines.ts';
import {
  couplingFormulaNodes,
  REDUCTION_NOTE,
  REDUCTION_NOTE_SHORT,
} from '../src/ui/formula/coupling-lines.ts';
import {
  expression,
  formulaHtmlNodes,
  formulaLayout,
  layoutText,
  mathText,
  splitRelation,
  textInline,
  type FormulaLayout,
  type Glyph,
  type MathItem,
} from '../src/ui/formula/layout.ts';

const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const kob = read('./cases/kobling-cases.json');
const phi = read('./cases/phi-summary.json');
const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
function blocks(nodes: CouplingNode[]): Exclude<CouplingNode, string>[] {
  return nodes.flatMap((n) =>
    typeof n === 'string' ? [] : n.className === 'kob-formel' ? [n] : blocks(n.children),
  );
}
function sourceStyle(nodes: CouplingNode[], style: 'bold' | 'weak', active = false): string {
  return nodes
    .map((n) =>
      typeof n === 'string'
        ? active
          ? n
          : ''
        : sourceStyle(
            n.children,
            style,
            active || (style === 'bold' ? n.tag === 'b' : n.className === 'kob-svag'),
          ),
    )
    .join('');
}
function modelStyle(layout: FormulaLayout, style: 'bold' | 'weak'): string {
  const inline = (s: Glyph[]) =>
    s
      .filter((c) => c[style])
      .map((c) => c.text)
      .join('');
  const math = (s: MathItem[]): string =>
    s
      .map((c) =>
        c.kind === 'fraction'
          ? math(c.numerator) + math(c.denominator)
          : c[style]
            ? c.kind === 'index'
              ? c.base + c.suffix
              : c.text
            : '',
      )
      .join('');
  return layout.lines
    .map((line) => {
      switch (line.kind) {
        case 'blank':
          return '';
        case 'text':
          return inline(line.content);
        case 'equation':
          return inline(line.label) + math(line.items) + inline(line.note);
        case 'grid':
          return line.rows
            .map((r) =>
              r.map((c) => (c.kind === 'text' ? inline(c.content) : math(c.items))).join(''),
            )
            .join('');
        case 'sum':
          return line.rows
            .map((r) => [r.sign, r.label, r.value, r.note].map(inline).join(''))
            .join('');
      }
    })
    .join('');
}
const intentionalText = new Set([
  'traffic-description',
  'load-description',
  'application',
  'direct-run',
  'curve-heading',
  'interpolation-heading',
  'load-heading',
]);
function verify(nodes: CouplingNode[], id: string) {
  const layout = formulaLayout(nodes);
  assert.equal(normalize(layoutText(layout)), normalize(nodes.map(couplingText).join('')), id);
  // Grid padding has no ink/style; compare every non-whitespace glyph's emphasis.
  for (const style of ['bold', 'weak'] as const)
    assert.equal(
      modelStyle(layout, style).replace(/\s/g, ''),
      sourceStyle(nodes, style).replace(/\s/g, ''),
      `${id}: ${style}`,
    );
  const fallback = layout.lines
    .filter((line) => line.kind === 'text' && line.fallback)
    .map((line) => layoutText({ lines: [line] }));
  assert.deepEqual(fallback, [], `${id}: ukendte fallbacklinjer`);
  for (const line of layout.lines)
    if (line.kind === 'text')
      assert.ok(intentionalText.has(line.template), `${id}: ny tekstskabelon ${line.template}`);
  return layout;
}
function verifyInput(input: DimensioningInput, id: string) {
  const result = dimensioner(input);
  const explanation = koblingExplanation(input, result);
  const all = explanation.steps.flatMap((step) =>
    blocks(step.body).map((block, i) => {
      // B-074: den viste blok har kortere reduktionsnote; ellers samme indhold som motoren.
      const shown = couplingFormulaNodes(block.children);
      const source = block.children.map(couplingText).join('');
      const layout = verify(shown, `${id}, trin ${step.number}, blok ${i}, vist`);
      assert.equal(
        normalize(layoutText(layout)),
        normalize(source.replace(`(${REDUCTION_NOTE})`, `(${REDUCTION_NOTE_SHORT})`)),
      );
      if (source.includes('Vægtet friktionsvinkel:')) {
        const first = layout.lines.find(
          (line) =>
            line.kind === 'equation' &&
            line.label.map((c) => c.text).join('') === 'Vægtet friktionsvinkel:',
        );
        assert.ok(first && first.kind === 'equation', `${id}: vægtet linje`);
        // Hele regnestykket på én linje: ingen fortsættelseslinje lige efter.
        const next = layout.lines[layout.lines.indexOf(first) + 1];
        assert.ok(
          !(
            next?.kind === 'equation' &&
            !next.label.length &&
            mathText(next.items).startsWith('=')
          ),
          `${id}: vægtet friktionsvinkel på én linje`,
        );
      }
      return verify(block.children, `${id}, trin ${step.number}, blok ${i}`);
    }),
  );
  const summary = phiSummary(input);
  if (summary.visible) {
    verify([summary.code!], `${id}: M6-vægtet`);
    const nodes = formulaHtmlNodes(summary.factor_html!);
    assert.equal(
      nodes.map(couplingText).join(''),
      summary
        .factor_html!.replace(/^<div class="kob-formel">|<\/div>$/g, '')
        .replaceAll('<sub>', '')
        .replaceAll('</sub>', ''),
      `${id}: HTML-dekoder`,
    );
    verify(nodes, `${id}: M6-faktor`);
    // B-072: vægtet friktionsvinkel på én linje uden noten om nærmeste hele grad; faktoren på to
    // linjer. Indholdet er ellers motorens, og »=« starter fortsættelseslinjen.
    const weighted = verify(weightedPhiNodes(summary.code!), `${id}: M6-vægtet, én linje`);
    assert.equal(weighted.lines.length, 1, `${id}: vægtet på én linje`);
    assert.equal(
      normalize(layoutText(weighted)),
      normalize(summary.code!.replace(ROUNDING_NOTE, '')),
      `${id}: vægtet tekst`,
    );
    const factor = verify(factorPhiNodes(nodes), `${id}: M6-faktor, to linjer`);
    assert.deepEqual(
      factor.lines.map((line) => line.kind),
      ['equation', 'equation'],
      `${id}: faktor på to linjer`,
    );
    assert.equal(normalize(layoutText(factor)), normalize(nodes.map(couplingText).join('')));
    const [first, second] = factor.lines.map((line) =>
      line.kind === 'equation' ? splitRelation(line.items) : [[], []],
    );
    assert.equal(mathText(first[0]), 'kφ', `${id}: venstre side`);
    assert.equal(second[0].length, 0, `${id}: fortsættelse uden venstre side`);
    assert.ok(mathText(second[1]).startsWith('='), `${id}: fortsættelse starter med =`);
  }
  return { result, explanation, all };
}

test('B-070: alle otte M1-referencer og alle sidecases bevarer tekst og fremhævninger; ingen ukendt fallback', () => {
  assert.equal(kob.cases.length, 8);
  for (const c of kob.cases) verifyInput(c.input, c.id);
  for (const c of pageCases) verifyInput(pageCaseInput(c), c.id);
});
test('B-070: alle elleve M6-referencer og fire hjælpercases bevarer formlerne', () => {
  assert.equal(phi.cases.length, 11);
  for (const c of phi.cases) {
    const v = c.inputs;
    verifyInput(
      {
        tilstand: v.mode,
        eu: v.eu,
        grundlag:
          v.basis === 'Trafikklasse'
            ? { type: 'trafikklasse', t_klasse: v.traffic }
            : { type: 'belastningsklasse', klasse: 4 },
        materialer: v.materials,
        phi_manuel: v.phi_manual,
        indstillinger: v.settings,
      },
      c.id,
    );
  }
  for (const c of phi.helper_cases)
    verifyInput(
      {
        tilstand: 'Brugerdefineret',
        eu: 10,
        grundlag: { type: 'belastningsklasse', klasse: 4 },
        materialer: c.materials,
      },
      c.id,
    );
});

test('B-070: genereret klasse/Eᵤ/tilstand/produkt/enhed/afrundingsdækning uden tab eller ukendt fallback', () => {
  const base: DimensioningInput = structuredClone(
    kob.cases.find((c: { id: string }) => c.id === 'FIG-004').input,
  );
  const seen = new Set<string>();
  let count = 0;
  let formulas = 0;
  // Alle produkter, herunder punktprodukter, interval/optimal og begge lag. Hver klasse
  // kombineres med kørt og mellemliggende Eᵤ; afviste kombinationer tælles særskilt.
  for (const traffic of [false, true])
    for (let klass = 1; klass <= 6; klass++)
      for (const eu of [3, 4, 5, 7, 10, 11, 15, 20, 25, 30, 40])
        for (const tilstand of ['Standard', 'Brugerdefineret'] as const)
          for (const product of GEONET_DB.filter((p) => p.navn !== 'Anden armering (manuel)'))
            for (const rounding of ['ingen', 'ned', 'naermeste']) {
              const input: DimensioningInput = {
                ...base,
                tilstand,
                eu,
                geonet_navn: product.navn,
                grundlag: traffic
                  ? { type: 'trafikklasse', t_klasse: `T${klass}` }
                  : { type: 'belastningsklasse', klasse: klass },
                materialer: tilstand === 'Standard' ? [] : base.materialer,
                indstillinger: {
                  ...base.indstillinger,
                  afrunding: { trin_mm: 50, phi_afrunding: rounding },
                  ...{ opbygning: { enhed: rounding === 'ned' ? 'cm' : 'mm' } },
                },
              };
              const id = `${traffic ? 'T' : 'K'}${klass}/${eu}/${tilstand}/${product.navn}/${rounding}`;
              const { explanation, result, all } = verifyInput(input, id);
              count++;
              formulas += all.length;
              if (explanation.steps.length) seen.add(`${traffic ? 'T' : 'K'}${klass}`);
              for (const step of explanation.steps) {
                if (step.title === 'VejDims ubundne krav')
                  seen.add(
                    blocks(step.body).some((b) => couplingText(b).startsWith('f ='))
                      ? 'interpolated'
                      : 'direct',
                  );
                for (const b of blocks(step.body)) {
                  const s = couplingText(b);
                  if (s.includes('Afrundet:')) seen.add('rounded-phi');
                  if (s.includes('φᵥ = Σ(pᵢ')) seen.add('percentage');
                }
              }
              if (result && 't_armeret_mm' in result.res_2 && result.res_2.t_armeret_mm != null)
                seen.add('2-lag');
              if (result?.t_1_lag_best_mm != null || result?.t_2_lag_best_mm != null)
                seen.add('optimal');
            }
  for (const c of phi.helper_cases) {
    const input = { ...base, materialer: c.materials };
    const { explanation } = verifyInput(input, c.id);
    if (explanation.steps.some((s) => blocks(s.body).some((b) => couplingText(b).includes('Σ(pᵢ'))))
      seen.add('percentage');
  }
  for (const s of [
    'K1',
    'K2',
    'K3',
    'K4',
    'K5',
    'K6',
    'T1',
    'T2',
    'T3',
    'T4',
    'T5',
    'T6',
    'direct',
    'interpolated',
    '2-lag',
    'optimal',
    'rounded-phi',
    'percentage',
  ])
    assert.ok(seen.has(s), `manglende aktiv dækning: ${s}`);
  assert.equal(count, 15_840);
  assert.ok(formulas > 40_000);
});

function itemsOf(layout: FormulaLayout): MathItem[] {
  return layout.lines.flatMap((line) =>
    line.kind === 'equation'
      ? line.items
      : line.kind === 'grid'
        ? line.rows.flatMap((r) => r.flatMap((c) => (c.kind === 'math' ? c.items : [])))
        : [],
  );
}
const recursiveItems = (items: MathItem[]): MathItem[] =>
  items.flatMap((t) =>
    t.kind === 'fraction'
      ? [t, ...recursiveItems(t.numerator), ...recursiveItems(t.denominator)]
      : [t],
  );
test('B-070: godkendt T2/Eᵤ 11-udkast, trin 2/4/5/6 har brøker, indeks, gitter, fed og sumtabel', () => {
  // Checked-in synthetic input makes the test independent of ignored .local files.
  const input: DimensioningInput = {
    tilstand: 'Brugerdefineret',
    eu: 11,
    grundlag: { type: 'trafikklasse', t_klasse: 'T2' },
    geonet_navn: 'Tensar HX5.5',
    materialer: [
      { navn: 'Stabilgrus SGII 0-32', phi: 40, tykkelse_mm: 300, lagtype: 'Bærelag' },
      { navn: 'Bundsikringssand', phi: 37, tykkelse_mm: 400, lagtype: 'Bundsikring' },
    ],
    indstillinger: {
      afrunding: { trin_mm: 50, phi_afrunding: 'ingen' },
      lagfordeling: { phi_regel: 'indtastet' },
    },
  };
  const { explanation } = verifyInput(input, 'udkast B');
  const step = (n: number) =>
    formulaLayout(blocks(explanation.steps.find((s) => s.number === n)!.body)[0].children);
  const localPath = new URL('../.local/kob-steps.json', import.meta.url);
  if (existsSync(localPath)) {
    for (const local of read('../.local/kob-steps.json')) {
      const actual = explanation.steps.find((s) => s.number === Number(local.nr))!;
      assert.deepEqual(
        blocks(actual.body).map((b) => normalize(couplingText(b))),
        local.formler.map((html: string) =>
          normalize(formulaHtmlNodes(html).map(couplingText).join('')),
        ),
        `lokalt udkast, trin ${local.nr}`,
      );
    }
  }
  assert.deepEqual(
    step(2).lines.map((l) => l.kind),
    ['equation', 'equation'],
  );
  assert.equal(recursiveItems(itemsOf(step(2))).filter((t) => t.kind === 'fraction').length, 2);
  assert.ok(
    recursiveItems(itemsOf(step(2))).some((t) => t.kind === 'operator' && t.text === '/'),
    'ln-slash forbliver inline',
  );
  const grid = step(4).lines.find((l) => l.kind === 'grid');
  assert.ok(grid?.kind === 'grid');
  assert.deepEqual(
    grid.rows.map((r) => r.length),
    [4, 4, 4],
  );
  assert.equal(recursiveItems(itemsOf(step(4))).filter((t) => t.kind === 'index').length, 5);
  // B-074: den vægtede friktionsvinkel står på én linje; derefter korrektionsfaktoren.
  assert.deepEqual(
    step(5).lines.map((l) => l.kind),
    ['equation', 'equation'],
  );
  assert.equal(recursiveItems(itemsOf(step(5))).filter((t) => t.kind === 'fraction').length, 3);
  assert.ok(
    recursiveItems(itemsOf(step(5))).some(
      (t) => t.kind === 'index' && t.base === 'k' && t.index === 'φ',
    ),
  );
  const sum = step(6).lines[0];
  assert.ok(sum.kind === 'sum');
  assert.equal(sum.rows.length, 7);
  assert.deepEqual(
    sum.rows.map((r) => r.sign.map((c) => c.text).join('')),
    ['', '−', '+', '−', '−', '+', ''],
  );
  assert.equal(sum.rows.at(-1)!.final, true);
  assert.equal(
    normalize(
      sum.rows
        .at(-1)!
        .value.map((c) => c.text)
        .join(''),
    ),
    '550 mm',
  );
  assert.ok(sum.rows.at(-1)!.value.every((c) => c.bold));
});

test('B-070: brøkregel, fortegn, indekser og uændrede ukendte linjer', () => {
  for (const s of [
    'f = (738,4 − 650) / (750 − 650) = 0,884',
    'f = ((1 + 2)) / (3) = −1,234',
    'Eₒ,ækv = Eᵤ + t_lav + t_høj + φᵥ + tᵢ + pᵢ + φᵢ + NÆ10',
    'kφ = −0,02 × (φᵥ − 37°) = +0,0000 = −2,57 %',
  ]) {
    const nodes: CouplingNode[] = s.startsWith('kφ')
      ? ['k', { tag: 'sub', children: ['φ'] }, s.slice(2)]
      : [s];
    const layout = formulaLayout(nodes);
    assert.equal(normalize(layoutText(layout)), normalize(s));
    assert.equal(layout.lines[0].kind, 'equation');
  }
  const fraction = expression(textInline('(1 + 2) / (3)'))![0];
  assert.ok(fraction.kind === 'fraction');
  assert.equal(fraction.numeratorParens, true);
  assert.equal(fraction.denominatorParens, true);
  assert.equal(mathText([fraction]), '(1 + 2) / (3)');
  assert.equal(
    expression(textInline('ln(11 / 10)'))!.filter((t) => t.kind === 'fraction').length,
    0,
  );
  assert.equal(expression(textInline('1/2'))!.filter((t) => t.kind === 'fraction').length, 0);
  assert.ok(
    expression(textInline('−0,02'))!.some((t) => t.kind === 'number' && t.text === '−0,02'),
  );
  for (const s of [
    'Ny tekst: <script>alert(1)</script>',
    'f = ln(11 / 10',
    'f = ukendt(1) / 2',
    't = NaN mm',
    'φᵥ = ∞',
    't = 1 mm ekstra tekst',
  ]) {
    const nodes: CouplingNode[] = [
      s,
      { tag: 'b', children: [' resultat'] },
      { tag: 'span', className: 'kob-svag', children: [' (note)'] },
    ];
    const layout = formulaLayout(nodes);
    assert.equal(layoutText(layout), nodes.map(couplingText).join(''));
    assert.ok(layout.lines[0].kind === 'text' && layout.lines[0].fallback);
    assert.equal(modelStyle(layout, 'bold'), ' resultat');
    assert.equal(modelStyle(layout, 'weak'), ' (note)');
  }
  for (const html of [
    '<img src=x onerror=alert(1)>',
    '<div class="kob-formel">k<script>x</script></div>',
    '<div class="kob-formel"><sub>φ</b></div>',
  ])
    assert.deepEqual(formulaHtmlNodes(html), [html]);
  const splitStyles: CouplingNode[] = ['t = 12', { tag: 'b', children: ['3'] }, ' mm'];
  const split = formulaLayout(splitStyles);
  assert.ok(split.lines[0].kind === 'text' && split.lines[0].fallback);
  assert.equal(layoutText(split), 't = 123 mm');
  assert.equal(modelStyle(split, 'bold'), '3');
});

test('B-070: regneeksemplet under Trafikklasse-korrelation, T1–T6 × Eᵤ 3–40, uden tab eller fallback', () => {
  const runs = koersler_fra_raekker(standard_data_state().vejdim_koersel_raekker);
  let cases = 0;
  for (const t of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'])
    for (let eu = 3; eu <= 40; eu++) {
      const steps = eoSteps(t, eu, runs);
      if (!steps || steps.trin2.eo_aekv === undefined) continue;
      correlationExampleLines(steps).forEach((block, i) => {
        const layout = verify([block], `regneeksempel ${t} Eᵤ ${eu}, blok ${i}`);
        // Hver linje er en ligning; trin 3's f-led står som brøk.
        assert.ok(
          layout.lines.every((line) => line.kind === 'equation'),
          `${t} Eᵤ ${eu}, blok ${i}`,
        );
        if (i === 2) {
          const first = layout.lines[0];
          assert.ok(first.kind === 'equation' && first.items.some((x) => x.kind === 'fraction'));
        }
      });
      cases++;
    }
  assert.ok(cases > 100, `kun ${cases} cases`);
});
