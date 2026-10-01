import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dimensioner } from '../src/engine/dimensionering.ts';
import { netDetails, type NetDetailsNode } from '../src/engine/net-details.ts';
import { pageCases, pageCaseInput, elements, elementText } from './helpers/dimensioning-page.ts';

// Python html.escape, preserving all whitespace and the original title newline references.
const escape = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');
function serialize(n: NetDetailsNode | null): string | null {
  if (n === null) return null;
  if (typeof n === 'string') return escape(n);
  const title = n.title ? escape(n.title) : '';
  return (
    `<${n.tag}${n.className ? ` class="${n.className}"` : ''}${
      n.title
        ? ` title="${n.className === 'rt-detaljer-optimal' ? title.replaceAll('\n', '&#10;') : title}"`
        : ''
    }>` +
    n.children.map(serialize).join('') +
    `</${n.tag}>`
  );
}

for (const c of pageCases)
  test(`M4 ${c.id}: exact heading, grid, title tooltips and interval note`, () => {
    const input = pageCaseInput(c);
    const actual = netDetails(input, dimensioner(input));
    const original = elements(c.page);
    const match = (prefix: string) =>
      original.filter((e) => {
        const text = elementText(e);
        return typeof text === 'string' && text.startsWith(prefix);
      });
    const heading = original.filter(
      (e) => typeof e.value === 'string' && e.value.includes('>Detaljer · '),
    );
    const grid = match('<div class="rt-detaljer-grid">');
    const interval = match('<div class="bg-produkt-interval-note">');
    assert.equal(heading.length, actual.heading === null ? 0 : 1);
    assert.equal(grid.length, actual.grid === null ? 0 : 1);
    assert.equal(interval.length, actual.intervalNote === null ? 0 : 1);
    assert.deepEqual(
      actual.heading === null ? null : { type: 'html', value: serialize(actual.heading) },
      heading[0] ?? null,
    );
    assert.deepEqual(
      actual.grid === null
        ? null
        : {
            type: 'markdown',
            body: serialize(actual.grid),
            allow_html: true,
            element_type: 'NATIVE',
          },
      grid[0] ?? null,
    );
    assert.deepEqual(
      actual.intervalNote === null
        ? null
        : {
            type: 'html',
            value: serialize(actual.intervalNote),
          },
      interval[0] ?? null,
    );
  });
