import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  settingsPage,
  settingsApplies,
  outsideDetails,
  type SettingsPageItem,
} from '../src/engine/settings-presentation.ts';
import { standard_data_state } from '../src/engine/auto-edit.ts';
import { standard_indstillinger } from '../src/engine/editing.ts';
import { elementText, isBlock, type PageNode } from './helpers/dimensioning-page.ts';

const reference: { cases: { id: string; input: { indstillinger: unknown }; page: PageNode[] }[] } =
  JSON.parse(readFileSync(new URL('./cases/settings-page-cases.json', import.meta.url), 'utf8'));
type Event = { type: string; text: string };
const event = (type: string, text: string): Event => ({ type, text });
const htmlText = (s: string) =>
  s
    .replace(/<[^>]*>/g, '')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'");

/** Keep column boundaries as well as fields: a caption cannot migrate to another
 * choice, column or section and still pass an array comparison.
 */
function originalContent(nodes: PageNode[]): Event[] {
  return nodes.flatMap((node) => {
    if (isBlock(node)) {
      if (node.block === 'column')
        return [event('column', ''), ...originalContent(node.children), event('/column', '')];
      if (node.block === 'expander')
        return [
          event('expander', String(node.label)),
          ...originalContent(node.children),
          event('/expander', ''),
        ];
      return originalContent(node.children);
    }
    if (node.type === 'dataframe') return [event('table', '')];
    if (node.key) return [event('field', String(node.key))];
    return [
      event(node.type, node.type === 'html' ? htmlText(elementText(node)!) : elementText(node)!),
    ];
  });
}
function modelContent(items: SettingsPageItem[]): Event[] {
  return items.flatMap((item) => {
    switch (item.kind) {
      case 'columns':
        return item.columns.flatMap((column) => [
          event('column', ''),
          ...modelContent(column),
          event('/column', ''),
        ]);
      case 'field':
        return [event('field', item.field.key)];
      case 'prose':
        return [event('markdown', item.text)];
      case 'caption':
        return [event('caption', item.text)];
      case 'info':
      case 'warning':
        return [event('html', item.text)];
      case 'minimumTable':
        return [event('table', ''), event('field', 'ind_lf_nulstil')];
      case 'example':
        return [
          event('expander', item.label),
          event('markdown', item.text),
          event('/expander', ''),
        ];
      case 'roundingImpact':
      case 'distributionImpact':
        return [event('table', '')];
      case 'deviations':
        return [
          event('expander', item.label),
          event('caption', item.text),
          event('table', ''),
          event('/expander', ''),
        ];
    }
  });
}

for (const c of reference.cases) {
  test(`${c.id}: alle opsummeringer, markeringer og tekster med afsnit, valg og kolonner`, () => {
    const state = standard_data_state();
    const settings = c.input.indstillinger as ReturnType<typeof standard_indstillinger>;
    const model = settingsPage(
      settings,
      outsideDetails(state.vejdim_koersel_raekker, null, settings.yderomraade),
    );
    const sections = c.page.filter(
      (node) =>
        isBlock(node) &&
        node.children.some(
          (child) =>
            !isBlock(child) && elementText(child)?.startsWith('<div class="bg-trin-hoved">'),
        ),
    );
    assert.equal(sections.length, 8);
    assert.equal(model.sections.length, sections.length);
    sections.forEach((node, i) => {
      assert.ok(isBlock(node));
      const actual = model.sections[i];
      const expectedHeading = elementText(node.children[0] as { type: string });
      const heading = expectedHeading!.match(
        /^<div class="bg-trin-hoved"><div class="bg-trin-nr">(.*?)<\/div><div class="bg-trin-titel">(.*?)<\/div><div class="bg-trin-opsum">(.*?)<\/div><\/div>$/,
      )!;
      assert.ok(heading);
      assert.deepEqual(
        [String(actual.number), actual.title, actual.summary],
        heading.slice(1).map(htmlText),
      );
      assert.deepEqual(
        modelContent(actual.content),
        originalContent(node.children.slice(1)),
        `${c.id}, afsnit ${i + 1}`,
      );
    });
  });
}

test('Gælder-helperen bevarer også ingen tilstand og klassisk Standard alene', () => {
  assert.equal(settingsApplies({}), 'Gælder: ingen tilstand');
  assert.equal(
    settingsApplies({ standard: true, klassisk: true }),
    'Gælder: ingen tilstand · gælder ikke Standard, da klassisk standardberegning er valgt i afsnit 6',
  );
});
