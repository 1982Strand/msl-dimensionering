import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dimensioner } from '../src/engine/dimensionering.ts';
import { laengde } from '../src/engine/enhed.ts';
import {
  pageCases,
  pageCaseInput,
  elements,
  elementText,
  findBlock,
} from './helpers/dimensioning-page.ts';

// Kontrol af selve hjælperen: casens input giver motorens resultat, og resultatet står på
// originalens side. Delene M3, M4, M7, M8 og M9 sammenligner deres egne afsnit.
for (const c of pageCases)
  test(`Sidereference ${c.id}: input svarer til originalens viste resultat`, () => {
    const result = dimensioner(pageCaseInput(c));
    const text = elements(c.page)
      .map(elementText)
      .filter((s): s is string => typeof s === 'string')
      .join('\n');
    if (c.id === 'OUT-1') {
      assert.equal(result, null);
      assert.equal(findBlock(c.page, 'expander', 'Kontrolpunkter'), undefined);
      return;
    }
    assert.ok(result, `${c.id}: motoren giver et resultat`);
    const t1 = (result.res_1 as { t_armeret_mm?: number | null }).t_armeret_mm ?? null;
    assert.ok(
      text.includes(laengde(t1, c.input.enhed)),
      `${c.id}: 1 lag ${laengde(t1, c.input.enhed)} står på originalens side`,
    );
    assert.ok(findBlock(c.page, 'expander', 'Kontrolpunkter og anbefalinger'));
    assert.ok(findBlock(c.page, 'expander', 'Udførelseskrav'));
    assert.equal(
      findBlock(c.page, 'popover', 'Se korrelationstabel') !== undefined,
      c.input.grundlag === 'Trafikklasse',
    );
  });
