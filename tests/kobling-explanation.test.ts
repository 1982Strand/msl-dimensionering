import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dimensioner } from '../src/engine/dimensionering.ts';
import {
  couplingText,
  koblingExplanation,
  type CouplingNode,
} from '../src/engine/kobling-explanation.ts';

const reference = JSON.parse(
  readFileSync(new URL('./cases/kobling-cases.json', import.meta.url), 'utf8'),
);
// Python html.escape used by the original, with no whitespace normalization.
const escape = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');
const serialize = (n: CouplingNode): string =>
  typeof n === 'string'
    ? escape(n)
    : `<${n.tag}${n.className ? ` class="${n.className}"` : ''}>` +
      (n.tag === 'br' ? '' : n.children.map(serialize).join('') + `</${n.tag}>`);
const descendants = (nodes: CouplingNode[], cls: string): CouplingNode[] =>
  nodes.flatMap((n) =>
    typeof n === 'string'
      ? []
      : [...(n.className === cls ? [n] : []), ...descendants(n.children, cls)],
  );

for (const c of reference.cases)
  test(`M1 ${c.id}: exact original text, numbers, markup, units and visibility`, () => {
    const actual = koblingExplanation(c.input, dimensioner(c.input));
    const steps = actual.steps.map(({ body, green, monoNote, ...s }, i) => {
      const original = c.expected.steps[i];
      assert.equal(
        body.map(serialize).join(''),
        original.body_html,
        `${c.id} trin ${s.number}: original HTML text structure`,
      );
      assert.ok(
        c.original_html.some((html: string) => html.includes(original.original_body_html)),
        `${c.id}: complete section contains the captured step`,
      );
      // Verify header emphasis against the complete original, beyond the derived fields.
      const header = c.original_html
        .join('')
        .split(`<div class="kob-nr">${s.number}</div>`)[1]
        .split('<div class="kob-krop">')[0];
      assert.ok(
        header.includes(`<div class="kob-res-tal${green ? ' kob-groen' : ''}">`),
        `${c.id}: result emphasis, step ${s.number}`,
      );
      assert.ok(
        header.includes(`<div class="kob-res-note${monoNote ? ' kob-groen' : ''}">`),
        `${c.id}: result note emphasis, step ${s.number}`,
      );
      return {
        ...s,
        figure: s.figure ? { caption: s.figure.caption, legend: s.figure.legend } : null,
        formulae: descendants(body, 'kob-formel').map((n) => couplingText(n).split('\n')),
        explanations: [...descendants(body, 'kob-brod'), ...descendants(body, 'kob-note')].map(
          couplingText,
        ),
      };
    });
    assert.deepEqual(
      { ...actual, steps },
      {
        ...c.expected,
        steps: c.expected.steps.map(
          ({ body_html, original_body_html, ...s }: Record<string, unknown>) => s,
        ),
      },
      c.id,
    );
  });
