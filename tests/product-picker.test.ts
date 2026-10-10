import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { productPicker, filterProductPicker } from '../src/engine/product-picker.ts';
import { geonet_valgliste, dimensioner } from '../src/engine/dimensionering.ts';
import { GEONET_DB } from '../src/engine/data.ts';
import { standard_data_state } from '../src/engine/auto-edit.ts';
import { dimensioningInput } from '../src/engine/dimensioning-form.ts';
import { beregn_alle_produkter } from '../src/engine/products.ts';

const reference = JSON.parse(
  readFileSync(new URL('./cases/dimensioning-ui-cases.json', import.meta.url), 'utf8'),
) as {
  snapshots: { widgets: { key: string; optionValues?: string[]; optionLabels?: string[] }[] }[];
};
const original = reference.snapshots[0].widgets.find((w) => w.key === 'std_geonet')!;
const names = original.optionValues!;
const flatten = (groups: ReturnType<typeof productPicker>) => groups.flatMap((g) => g.items);

test('B-054: samme 20 produkter, seriegrupper og rækkefølge som originalens valgliste', () => {
  const groups = productPicker(geonet_valgliste(names).valg, { selectedClass: 4 });
  assert.deepEqual(
    groups.map((g) => g.series),
    ['Tensar', 'GS-GRID', "E'GRID"],
  );
  assert.deepEqual(
    groups.map((g) => g.items.length),
    [8, 9, 3],
  );
  assert.deepEqual(
    flatten(groups).map((p) => p.name),
    names,
  );
  const subset = names.filter((_, i) => i % 3 === 0);
  assert.deepEqual(
    flatten(productPicker(subset, { selectedClass: 4 })).map((p) => p.name),
    subset,
  );
});

test('B-054: klasser, net-korrektion, Optimal korrektion og Referencenet mod alle 20 originale etiketter', () => {
  const items = flatten(productPicker(names, { selectedClass: 4 }));
  assert.equal(items.length, 20);
  for (const [i, item] of items.entries()) {
    const label = original.optionLabels![i];
    const classes = label.match(/\(Klasse ([\d,-]+)/)![1];
    // B-057: samme tal som originalen, men altid med rigtigt minustegn.
    const correction = label.match(/Net-korrektion: ([+−-]?\d+ %)/)![1].replace('-', '−');
    const optimal = label.match(/opt\. ([+−-]?\d+ %)/)?.[1].replace('-', '−');
    const recommended = GEONET_DB.find((p) => p.navn === item.name)!.klasser!.includes(4);
    assert.equal(item.recommended, recommended, item.name);
    assert.deepEqual(
      item.badges,
      [
        {
          text: `Belastningsklasse ${classes.replaceAll('-', '–')}`,
          tone: recommended ? 'green' : 'yellow',
        },
        { text: `Net-korrektion ${correction}`, tone: 'neutral' },
        ...(optimal ? [{ text: `Optimal korrektion ${optimal}`, tone: 'neutral' }] : []),
        ...(label.includes('· Referencenet') ? [{ text: 'Referencenet', tone: 'neutral' }] : []),
      ],
      item.name,
    );
  }
  assert.equal(items.find((p) => p.name === 'Tensar HX165')!.badges[1].text, 'Net-korrektion −5 %');
  assert.ok(items.every((p) => p.badges.every((b) => !/-\d/.test(b.text))));
  assert.deepEqual(
    items
      .find((p) => p.name === 'Tensar InterAx NX850')!
      .badges.slice(1)
      .map((b) => b.text),
    ['Net-korrektion −15 %', 'Optimal korrektion −30 %'],
  );
  assert.deepEqual(
    items.filter((p) => p.badges.some((b) => b.text === 'Referencenet')).map((p) => p.name),
    ['Tensar TriAx TX160', 'GS-GRID SX160', "E'GRID T6"],
  );
});

test('B-054: trafikklassemærker svarer til originalens Klasse-kolonne ved aktuelle data og Eᵤ', () => {
  const overview = JSON.parse(
    readFileSync(new URL('./cases/product-overview-cases.json', import.meta.url), 'utf8'),
  );
  let count = 0;
  for (const c of overview.cases) {
    const data = {
      ...standard_data_state(),
      materialer: c.inputs.available_materials,
      indstillinger: c.inputs.settings,
    };
    const input = dimensioningInput({ ...c.inputs.controls, tilstand: c.inputs.mode }, data);
    if (input.grundlag?.type !== 'trafikklasse') continue;
    const selectedTraffic = input.grundlag.t_klasse;
    const result = dimensioner(input)!;
    const common = {
      eu: input.eu,
      eo: result.eo!,
      phi: result.phi,
      afrunding: result.afrunding,
      skala: result.skala,
      t_basis_table: input.t_basis_table,
      klasse_for_anbefaling: result.valgt_klasse,
    };
    const products = [
      ...beregn_alle_produkter({ ...common, lag_mode: '1_lag' }),
      ...beregn_alle_produkter({ ...common, lag_mode: '2_lag' }),
    ];
    const valid = geonet_valgliste(
      products.filter((p) => p.fejl === null && p.t_armeret_mm != null).map((p) => p.navn),
    ).valg;
    const items = flatten(
      productPicker(valid, {
        selectedClass: result.valgt_klasse,
        selectedTraffic: input.grundlag.t_klasse,
        trafficEu: input.eu,
        runs: input.koersler,
        table: input.t_basis_table,
        rules: input.indstillinger?.yderomraade,
      }),
    );
    for (const item of items) {
      const row = c.rows.find((r: { cells: string[] }) => r.cells[0] === item.name);
      assert.ok(row);
      assert.equal(
        item.badges[0].text,
        `Trafikklasse ${row.cells[1].replaceAll('-', '–')}`,
        `${c.id}: ${item.name}`,
      );
      const recommended = row.cells[1].split(', ').some((part: string) => {
        const [min, max = min] = part.split('-').map((s) => Number(s.slice(1)));
        const selected = Number(selectedTraffic.slice(1));
        return min <= selected && selected <= max;
      });
      assert.equal(item.badges[0].tone, recommended ? 'green' : 'yellow');
      assert.equal(item.recommended, recommended);
    }
    count++;
  }
  assert.ok(count >= 2);
  const at10 = flatten(
    productPicker(names, { selectedClass: 4, selectedTraffic: 'T4', trafficEu: 10 }),
  );
  assert.deepEqual(at10.find((p) => p.name === 'Tensar TriAx TX160')!.badges[0], {
    text: 'Trafikklasse T2–T6',
    tone: 'green',
  });
  assert.equal(at10.find((p) => p.name === 'GS-GRID B20/20')!.badges[0].tone, 'yellow');
});

test('B-054: søgning på navn, serie og klasse samt anbefalingsfilter bevarer rækkefølgen', () => {
  const groups = productPicker(names, { selectedClass: 4 });
  assert.deepEqual(
    flatten(filterProductPicker(groups, '', false)).map((p) => p.name),
    names,
  );
  assert.deepEqual(
    flatten(filterProductPicker(groups, 'INTERAX nx850', false)).map((p) => p.name),
    ['Tensar InterAx NX850'],
  );
  assert.equal(filterProductPicker(groups, 'GS-GRID', false)[0].items.length, 9);
  assert.deepEqual(
    flatten(filterProductPicker(groups, 'belastningsklasse 3–6', false)).map((p) => p.name),
    ['Tensar TriAx TX160', 'GS-GRID SX160', "E'GRID T6"],
  );
  const recommended = flatten(groups)
    .filter((p) => p.recommended)
    .map((p) => p.name);
  assert.deepEqual(
    flatten(filterProductPicker(groups, '', true)).map((p) => p.name),
    recommended,
  );
  assert.deepEqual(filterProductPicker(groups, 'nx850', true), []);
  const traffic = productPicker(names, { selectedClass: 4, selectedTraffic: 'T4', trafficEu: 10 });
  assert.ok(flatten(filterProductPicker(traffic, 'T4', true)).every((p) => p.recommended));
});
