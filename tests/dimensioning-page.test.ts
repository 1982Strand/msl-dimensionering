import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dimensioner } from '../src/engine/dimensionering.ts';
import { beregn_alle_produkter } from '../src/engine/products.ts';
import { dimensioningPage, type PageDisplayNode } from '../src/engine/dimensioning-page.ts';
import { pageCases, pageCaseInput, elementText, isBlock } from './helpers/dimensioning-page.ts';
import { pageCoverage } from './helpers/dimensioning-page-coverage.ts';

// Python html.escape; legacy inline style literals are not escaped by ui.py.
const escape = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');
export function serializePageNode(n: PageDisplayNode): string {
  if (typeof n === 'string') return escape(n);
  if ('text' in n) return n.entity;
  return `<${n.tag}${n.className ? ` class="${escape(n.className)}"` : ''}${Object.entries(
    n.attributes ?? {},
  )
    .map(([key, value]) => ` ${key}="${key === 'style' ? value : escape(value)}"`)
    .join('')}>${n.children.map(serializePageNode).join('')}</${n.tag}>`;
}
/** Godkendt afvigelse B-054: kun Resultats overskrift får nummer 3 som afsnit 1/2. */
function resultHeadingWithNumberB054(original: string): string {
  const oldHeading =
    '<div class="bg-resultat-hoved-a"><div class="bg-resultat-titel">Resultat</div>';
  assert.ok(
    original.startsWith(oldHeading),
    'B-054 kræver originalens præcise Resultat-overskrift',
  );
  return original.replace(
    oldHeading,
    '<div class="bg-trin-hoved"><div class="bg-trin-nr">3</div><div class="bg-trin-titel">Resultat</div>',
  );
}
for (const c of pageCases)
  test(`M9 ${c.id}: hvert element, rækkefølge, fremhævelser og fravær`, () => {
    const input = pageCaseInput(c),
      result = dimensioner(input);
    const common = result
      ? {
          eu: input.eu,
          eo: result.eo!,
          phi: result.phi,
          afrunding: result.afrunding,
          skala: result.skala,
          t_basis_table: input.t_basis_table,
          klasse_for_anbefaling: result.valgt_klasse,
        }
      : null;
    const products = common
      ? {
          one: beregn_alle_produkter({ ...common, lag_mode: '1_lag' }),
          two: beregn_alle_produkter({ ...common, lag_mode: '2_lag' }),
        }
      : { one: [], two: [] };
    const model = dimensioningPage(input, result, products);
    const inventory = pageCoverage(c.page);
    const original = inventory.filter((e) => e.owner === 'M9' && !isBlock(e.node));
    // Array equality also asserts every absent element and original ordering.
    assert.deepEqual(
      model.elements.map((e) => ({
        slot: e.slot,
        type: e.type,
        text: e.content.map(serializePageNode).join(''),
      })),
      original.map((e) => {
        assert.ok(!isBlock(e.node));
        const originalText = elementText(e.node);
        return {
          slot: e.slot,
          type: e.node.type,
          text:
            e.slot === 'resultHeading' ? resultHeadingWithNumberB054(originalText!) : originalText,
        };
      }),
    );
    const expander = inventory.find(
      (e) => isBlock(e.node) && e.label.startsWith('Alle produkter'),
    )?.node;
    assert.deepEqual(
      model.productExpander,
      expander ? { label: expander.label, expanded: expander.expanded } : null,
    );
    assert.ok(inventory.every((e) => !!e.owner));
  });
