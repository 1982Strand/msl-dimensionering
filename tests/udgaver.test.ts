import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACCESS, udgaveFra } from '../src/ui/udgaver.ts';

test('udgaven vælges ved bygningen; ukendte værdier giver den lokale udgave', () => {
  assert.equal(udgaveFra(undefined), 'lokal');
  assert.equal(udgaveFra(''), 'lokal');
  assert.equal(udgaveFra('delt'), 'lokal');
  assert.equal(udgaveFra('intern'), 'intern');
  assert.equal(udgaveFra('offentlig'), 'offentlig');
});

test('udgavetabellen svarer til beslutningen 2. november 2026', () => {
  assert.deepEqual(ACCESS, {
    lokal: {
      udgave: 'lokal',
      rapport: true,
      firmaprofil: true,
      kartotek: 'eget',
      redigerOpslag: true,
      redigerMaterialer: true,
      indstillinger: 'alle',
      diagramfiler: true,
    },
    intern: {
      udgave: 'intern',
      rapport: true,
      firmaprofil: false,
      kartotek: 'indbygget',
      redigerOpslag: true,
      redigerMaterialer: true,
      indstillinger: 'alle',
      diagramfiler: true,
    },
    offentlig: {
      udgave: 'offentlig',
      rapport: false,
      firmaprofil: false,
      kartotek: 'intet',
      redigerOpslag: false,
      redigerMaterialer: true,
      indstillinger: 'visning',
      diagramfiler: false,
    },
  });
});
