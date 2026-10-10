import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { outsideDetails } from '../src/engine/settings-presentation.ts';
import { standard_data_state } from '../src/engine/auto-edit.ts';
const source = JSON.parse(
  readFileSync(new URL('./cases/settings-effects-cases.json', import.meta.url), 'utf8'),
);
test('settings scope captions and deviation table match original default and changed rules', () => {
  for (const snapshot of source.snapshots) {
    const result = outsideDetails(
      standard_data_state().vejdim_koersel_raekker,
      null,
      snapshot.settings.yderomraade,
    );
    assert.deepEqual(result.captions, snapshot.outerRangeCaptions.slice(0, 4), snapshot.id);
    assert.deepEqual(result.cells, snapshot.outerRangeTables[0], snapshot.id);
  }
});
