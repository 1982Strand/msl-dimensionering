import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { constructionCase } from './construction.test.ts';
import { fordel_soejle, normaliser } from '../src/engine/lagfordeling.ts';
import type { LayerSpec } from '../src/engine/types.ts';

const fixtures = JSON.parse(
  readFileSync(new URL('./cases/construction-cases.json', import.meta.url), 'utf8'),
);
const variant = (id: string, fordeling: string, materialer?: unknown[]) => {
  const c = structuredClone(fixtures.cases.find((x: { id: string }) => x.id === id));
  c.inputs.settings.lagfordeling.fordeling = fordeling;
  if (materialer) c.inputs.materials = materialer;
  return constructionCase(c).kolonner;
};
const lag = (navn: string, tykkelse_mm: number, lagtype: string) => ({
  navn,
  tykkelse_mm,
  pct: null,
  phi: lagtype === 'Bærelag' ? 45 : 35,
  lagtype,
});
// 400 mm stabilgrus over 300 mm bundsikring: øverste lag er tykkere end minimum (250 mm).
const tyk = [lag('Stabilgrus', 400, 'Bærelag'), lag('Bundsikring', 300, 'Bundsikring')];

test('minimum_geonet: øverste lag er minimum i opbygninger med geonet; ustabiliseret som minimum', () => {
  for (const id of ['custom-eu10-bk4-cm', 'custom-eu5-bk4-nx850-cm']) {
    const ny = variant(id, 'minimum_geonet', tyk);
    const min = variant(id, 'minimum', tyk);
    const uarm = ny.find((k) => k.titel.startsWith('Ustabiliseret'))!;
    const uarmMin = min.find((k) => k.titel.startsWith('Ustabiliseret'))!;
    assert.deepEqual(uarm.lag, uarmMin.lag, `${id}: ustabiliseret uændret`);
    const geonet = ny.filter((k) => k.titel.includes('geonet') && k.lag.length);
    assert.ok(geonet.length, `${id}: ingen geonetopbygning`);
    assert.notDeepEqual(geonet[0].lag, min.find((k) => k.titel === geonet[0].titel)!.lag);
    for (const k of geonet) {
      const total = k.lag.reduce((s, l) => s + Number(l[1]), 0);
      assert.equal(k.lag[0][1], Math.min(250, total), `${id} ${k.titel}: øverste lag`);
    }
  }
});

test('minimum_geonet ændrer ikke Standard', () => {
  for (const id of ['standard-eu10-bk4-mm', 'standard-eu5-bk4-nx850-mm', 'standard-eu5-bk4-cm'])
    assert.deepEqual(variant(id, 'minimum_geonet'), variant(id, 'minimum'), id);
});

test('minimum_geonet: fordel_soejle skelner geonet og ustabiliseret, og sammenlægning virker', () => {
  const spec: LayerSpec = {
    lag: [
      { navn: 'Stabilgrus', andel: 400, lagtype: 'Bærelag' },
      { navn: 'Bundsikring', andel: 300, lagtype: 'Bundsikring' },
    ],
    fordeling: 'minimum_geonet',
    min_mm: 250,
    restlag: 'vis',
    restlag_graense_mm: 100,
  };
  const vis = (l: { navn?: string | null; tykkelse_mm: number }[]) =>
    l.map((x) => `${x.navn} ${x.tykkelse_mm}`).join(' + ');
  assert.equal(vis(fordel_soejle(spec, 500, 50, 700, true)), 'Stabilgrus 250 + Bundsikring 250');
  assert.equal(vis(fordel_soejle(spec, 500, 50, null, false)), 'Stabilgrus 300 + Bundsikring 200');
  assert.equal(vis(fordel_soejle(spec, 350, 50, null, false)), 'Stabilgrus 250 + Bundsikring 100');
  assert.equal(vis(fordel_soejle(spec, 300, 50, 700, true)), 'Stabilgrus 250 + Bundsikring 50');
  assert.equal(vis(fordel_soejle(spec, 200, 50, 700, true)), 'Stabilgrus 200');
  const flet = { ...spec, restlag: 'flet' };
  assert.equal(vis(fordel_soejle(flet, 300, 50, 700, true)), 'Stabilgrus 300');
  assert.equal(normaliser({ fordeling: 'minimum_geonet' }).fordeling, 'minimum_geonet');
});
