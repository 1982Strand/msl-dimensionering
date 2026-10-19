import { test } from 'node:test';
import assert from 'node:assert/strict';
import { klasse_for_eo, normaliser } from '../src/engine/lagfordeling.ts';

test('klasse_for_eo: højeste er standard og uændret', () => {
  for (const [eo, klasse] of [
    [20, 1],
    [30, 1],
    [31, 2],
    [95.3, 5],
    [120, 5],
    [150, 6],
    [200, 6],
  ] as const) {
    assert.equal(klasse_for_eo(eo), klasse, `Eo ${eo}`);
    assert.equal(klasse_for_eo(eo, 'hoejeste'), klasse, `Eo ${eo}`);
  }
});

test('klasse_for_eo: laveste vælger klassen under mellem to klasser', () => {
  for (const [eo, klasse] of [
    [20, 1],
    [30, 1],
    [31, 1],
    [45, 2],
    [95.3, 4],
    [120, 5],
    [121, 5],
    [150, 6],
    [200, 6],
  ] as const)
    assert.equal(klasse_for_eo(eo, 'laveste'), klasse, `Eo ${eo}`);
  assert.equal(klasse_for_eo(null, 'laveste'), null);
});

test('normaliser: minimumsklasse har standard og afviser ukendte værdier', () => {
  assert.equal(normaliser(null).minimumsklasse, 'hoejeste');
  assert.equal(normaliser({ minimumsklasse: 'laveste' }).minimumsklasse, 'laveste');
  assert.equal(normaliser({ minimumsklasse: 'x' }).minimumsklasse, 'hoejeste');
});

test('opsummeringen i afsnit 3 viser kun valget ved laveste', async () => {
  const { settingsPage, outsideDetails } = await import('../src/engine/settings-presentation.ts');
  const { standard_data_state } = await import('../src/engine/auto-edit.ts');
  const { standard_indstillinger } = await import('../src/engine/editing.ts');
  const base = standard_indstillinger();
  const summary = (lf: object) =>
    settingsPage(
      { ...base, lagfordeling: { ...base.lagfordeling, ...lf } } as never,
      outsideDetails(standard_data_state().vejdim_koersel_raekker, null, base.yderomraade),
    ).sections[2].summary;
  assert.ok(!summary({}).includes('laveste klasse'));
  assert.ok(summary({ minimumsklasse: 'laveste' }).includes('minimum for laveste klasse'));
});
