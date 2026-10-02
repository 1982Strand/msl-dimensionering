import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameOrigin, versionStatus } from '../tools/app-genstart.ts';

test('B-073: kun appens egen side må starte en genbygning', () => {
  assert.equal(sameOrigin('http://127.0.0.1:5174', '127.0.0.1:5174'), true);
  assert.equal(sameOrigin('http://evil.example', '127.0.0.1:5174'), false);
  assert.equal(sameOrigin('http://127.0.0.1:5175', '127.0.0.1:5174'), false);
  assert.equal(sameOrigin(undefined, '127.0.0.1:5174'), false);
  assert.equal(sameOrigin('http://127.0.0.1:5174', undefined), false);
});

test('B-073: ny version, når den committede kode ikke er den byggede', () => {
  assert.deepEqual(versionStatus('abc', 'abc'), { version: 'abc', nyVersion: false });
  assert.deepEqual(versionStatus('def', 'abc'), { version: 'abc', nyVersion: true });
  assert.deepEqual(versionStatus('def', ''), { version: '', nyVersion: true });
  // Uden git (fx en kopi uden historik) vises ingen markering.
  assert.deepEqual(versionStatus('', 'abc'), { version: 'abc', nyVersion: false });
});
