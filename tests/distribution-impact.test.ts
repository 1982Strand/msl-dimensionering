import { test } from 'node:test';
import assert from 'node:assert/strict';
import { standard_data_state } from '../src/engine/auto-edit.ts';
import { constructionData } from '../src/engine/construction.ts';
import { dimensioner } from '../src/engine/dimensionering.ts';
import { dimensioningInput } from '../src/engine/dimensioning-form.ts';
import { resultProducts } from '../src/engine/dimensioning-page.ts';
import { distributionImpact } from '../src/engine/distribution-impact.ts';
import { settingsPage, outsideDetails } from '../src/engine/settings-presentation.ts';

const values = {
  tilstand: 'Brugerdefineret',
  bd_mat_0: 'Stabilgrus SGII 0-32',
  bd_t_0: 300,
  bd_mat_1: 'Bundsikringssand',
  bd_t_1: 295,
};
const row = (model: NonNullable<ReturnType<typeof distributionImpact>>, label: string) => {
  const found = model.rows.find((item) => item.label === label);
  assert.ok(found, label);
  return found;
};
function configured(choice: string) {
  const data = standard_data_state();
  data.indstillinger.lagfordeling.fordeling = choice;
  return data;
}

test('valgte fordelingsvalg viser konstruktionskolonnernes faktiske lag og totaler', () => {
  const expected: Record<string, Record<string, string[]>> = {
    proportional: {
      'Uden geonet': ['450', '450', '900 mm'],
      '1 lag geonet': ['300', '300', '600 mm'],
      '2 lag geonet': ['Ikke gyldigt for denne kombination'],
    },
    minimum: {
      'Uden geonet': ['450', '450', '900 mm'],
      '1 lag geonet': ['300', '300', '600 mm'],
      '2 lag geonet': ['Ikke gyldigt for denne kombination'],
    },
    fastholdt: {
      'Uden geonet': ['300', '600', '900 mm'],
      '1 lag geonet': ['300', '300', '600 mm'],
    },
    minimum_geonet: {
      'Uden geonet': ['450', '450', '900 mm'],
      '1 lag geonet': ['250', '400', '650 mm'],
    },
  };
  for (const [choice, rows] of Object.entries(expected)) {
    const data = configured(choice);
    const model = distributionImpact(values, data);
    assert.ok(model, choice);
    assert.deepEqual(model.columns, ['Stabilgrus SGII 0-32', 'Bundsikringssand', 'I alt']);
    assert.deepEqual(row(model, 'Indtastet').cells, ['300', '295', '595 mm']);
    for (const [label, cells] of Object.entries(rows))
      assert.deepEqual(row(model, label).cells, cells);

    const input = dimensioningInput(values, data);
    const result = dimensioner(input);
    assert.ok(result);
    const construction = constructionData(
      result,
      resultProducts(input, result),
      data.indstillinger.opbygning,
      data.indstillinger.lagfordeling.netplacering,
    );
    for (const column of construction.kolonner) {
      const actual = row(
        model,
        column.titel.startsWith('Indtastet')
          ? 'Indtastet'
          : column.titel.startsWith('Ustabiliseret')
            ? 'Uden geonet'
            : column.titel,
      );
      if (column.total_mm === null) {
        assert.equal(actual.cells[0], column.tom_tekst);
      } else {
        const materialThicknesses: string[] = model.columns.slice(0, -1).map((name) => {
          const layer = column.lag.find(([layerName]) => layerName === name);
          return layer ? String(layer[1]) : '–';
        });
        assert.deepEqual(actual.cells.slice(0, -1), materialThicknesses);
        assert.equal(actual.cells.at(-1), `${column.total_mm} mm`);
      }
    }
  }
});

test('Standard bruger sessionens Brugerdefineret-værdier og viser note', () => {
  const data = configured('proportional');
  const model = distributionImpact({ ...values, tilstand: 'Standard' }, data);
  assert.ok(model);
  assert.match(
    model.context,
    /^Brugerdefineret · belastningsklasse 4 · Eᵤ = 10 MPa · Tensar TriAx TX160$/,
  );
  assert.deepEqual(model.notes, [
    'Dimensioneringen står i Standard. Eksemplet viser opbygningen fra Brugerdefineret.',
  ]);
  assert.deepEqual(row(model, 'Indtastet').cells, ['300', '295', '595 mm']);
});

test('cm-enhed formatterer lag og totaler som enheden på opbygningen', () => {
  const data = configured('proportional');
  data.indstillinger.opbygning.enhed = 'cm';
  const model = distributionImpact(values, data);
  assert.ok(model);
  assert.deepEqual(row(model, 'Indtastet').cells, ['30', '29,5', '59,5 cm']);
});

test('gentaget materialenavn bruger fordelte lag sekventielt', () => {
  const data = configured('proportional');
  const model = distributionImpact(
    { ...values, bd_mat_1: 'Stabilgrus SGII 0-32', bd_t_1: 300 },
    data,
  );
  assert.ok(model);
  assert.deepEqual(model.columns, ['Stabilgrus SGII 0-32', 'Stabilgrus SGII 0-32', 'I alt']);
  assert.deepEqual(row(model, 'Indtastet').cells, ['300', '300', '600 mm']);
  assert.deepEqual(row(model, 'Uden geonet').cells, ['450', '400', '850 mm']);
});

test('mangler resultat eller materialelag giver ingen boks', () => {
  const noResult = standard_data_state();
  noResult.designdiagrammer = [];
  assert.equal(distributionImpact(values, noResult), null);
  assert.equal(distributionImpact({ ...values, bd_antal_lag: 0 }, standard_data_state()), null);
});

test('settingsPage uden distributionsmodel bevarer eksisterende indhold', () => {
  const data = standard_data_state();
  const page = settingsPage(
    data.indstillinger,
    outsideDetails(data.vejdim_koersel_raekker, null, data.indstillinger.yderomraade),
  );
  const section = page.sections[2];
  assert.equal(section.content[1].kind, 'field');
  assert.equal(section.content[2].kind, 'caption');
});
