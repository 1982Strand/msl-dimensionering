import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dimensioner } from '../src/engine/dimensionering.ts';
import { resultChecks, type CheckNode, type CheckElement } from '../src/engine/result-checks.ts';
import {
  pageCases,
  pageCaseInput,
  findBlock,
  elements,
  elementText,
} from './helpers/dimensioning-page.ts';

const escape = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');
// ui.besked interpolates message text directly, whereas status attributes use
// Python html.escape(quote=True). Preserve both conventions byte for byte.
// React renders all strings as text; this serializer is only a reference adapter.
function serialize(node: CheckNode): string {
  if (typeof node === 'string') return node;
  const attrs =
    (node.className ? ` class="${node.className}"` : '') +
    (node.style ? ` style="${node.style}"` : '') +
    (node.title ? ` title="${escape(node.title)}"` : '') +
    (node.ariaLabel ? ` aria-label="${escape(node.ariaLabel)}"` : '');
  return `<${node.tag}${attrs}>${node.children.map(serialize).join('')}</${node.tag}>`;
}
const element = (e: CheckElement) =>
  e.type === 'html' ? { type: e.type, value: e.nodes.map(serialize).join('') } : e;
for (const c of pageCases)
  test(`M3/M7 ${c.id}: complete expanders and status match original exactly`, () => {
    const input = pageCaseInput(c);
    const actual = resultChecks(input, dimensioner(input), c.input.enhed);
    const original = [
      findBlock(c.page, 'expander', 'Kontrolpunkter og anbefalinger'),
      findBlock(c.page, 'expander', 'Udførelseskrav'),
    ].filter((b) => b !== undefined);
    assert.deepEqual(
      actual.expanders.map((e) => ({ ...e, children: e.children.map(element) })),
      original,
    );
    const originalStatus = elements(c.page).filter((e) => {
      const text = elementText(e);
      return typeof text === 'string' && text.startsWith('<div class="bg-resultat-status">');
    });
    assert.deepEqual(actual.status ? [element(actual.status)] : [], originalStatus);
    assert.deepEqual(
      actual.outsideMessages,
      [],
      `${c.id}: no additional result warning in these cases`,
    );
    if (c.id === 'OUT-1')
      assert.deepEqual(actual, { expanders: [], status: null, outsideMessages: [] });
  });
