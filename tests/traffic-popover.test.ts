import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trafficPopover, type TrafficPopover } from '../src/engine/traffic-popover.ts';
import { pageCases, pageCase, pageCaseInput, findBlock } from './helpers/dimensioning-page.ts';

// Recreate only Streamlit's transport wrapper. Text and dataframe content are unchanged.
function capturedTree(model: TrafficPopover) {
  return {
    block: 'popover',
    allow_empty: true,
    popover: { label: model.label, type: 'secondary', open: model.open },
    width_config: { use_stretch: true },
    children: model.children.map((child) => {
      if (child.type === 'dataframe') {
        const { activeRow, activeColumn, styles, ...dataframe } = child;
        return dataframe;
      }
      return { ...child, element_type: child.type === 'caption' ? 'CAPTION' : 'NATIVE' };
    }),
  };
}

for (const c of pageCases) {
  test(`M8 ${c.id}: complete original popup subtree or absent load-class popup`, () => {
    const expected = findBlock(c.page, 'popover', 'Se korrelationstabel');
    const actual = trafficPopover(pageCaseInput(c));
    if (!expected) assert.equal(actual, null);
    else {
      assert.ok(actual);
      assert.deepEqual(capturedTree(actual), expected);
    }
  });
}

test('M8 active VejDim SG row updates correlation and note; product interval has no effect', () => {
  const input = pageCaseInput(pageCase('TR-1'));
  const original = trafficPopover(input)!;
  const edited = trafficPopover(pageCaseInput(pageCase('TR-1-SG')))!;
  assert.equal(original.children[1].rows[3][3], '108');
  assert.equal(edited.children[1].rows[3][3], '126');
  assert.notEqual(edited.children[2].body, original.children[2].body);
  assert.deepEqual(trafficPopover({ ...input, geonet_navn: 'Tensar InterAx NX850' }), original);
});

test('M8 original Styler rules (not recorded in dataframe reference)', () => {
  const direct = trafficPopover(pageCaseInput(pageCase('TR-1')))!.children[1];
  assert.equal(direct.activeRow, 3);
  assert.equal(direct.activeColumn, 3);
  assert.deepEqual(direct.styles[3], ['row', 'row', 'row', 'cell', 'row', 'row', 'row', 'row']);
  assert.equal(direct.styles[1][0], 'boundary');
  assert.equal(direct.styles[0][0], 'plain'); // rejected zone has no * or †
  const interpolated = trafficPopover(pageCaseInput(pageCase('TR-2')))!.children[1];
  assert.equal(interpolated.activeColumn, null);
  assert.deepEqual(interpolated.styles[3], Array(8).fill('row'));
  const outside = trafficPopover(pageCaseInput(pageCase('OUT-2')))!.children[1];
  assert.deepEqual(outside.styles[0], ['row', 'row', 'row', 'cell', 'row', 'row', 'row', 'row']);
  // Selected row overwrites boundary italics/opacity, as in pandas Styler.
  assert.equal(outside.styles[1][0], 'boundary');
});
