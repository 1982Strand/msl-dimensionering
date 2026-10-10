import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as editing from '../src/engine/editing.ts';

interface Case {
  id: string;
  function: string;
  args: unknown[];
  expected: { value?: unknown; error?: string };
}
const reference = JSON.parse(
  readFileSync(new URL('./cases/editing-cases.json', import.meta.url), 'utf8'),
) as { cases: Case[] };
function decode(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(decode);
  if (v && typeof v === 'object') {
    const object = v as Record<string, unknown>;
    if ('$float' in object)
      return object.$float === 'nan' ? NaN : object.$float === 'inf' ? Infinity : -Infinity;
    return Object.fromEntries(Object.entries(object).map(([k, v]) => [k, decode(v)]));
  }
  return v;
}
for (const c of reference.cases)
  test(`${c.id}: ${c.function}`, () => {
    const name = c.function.replace(/^_/, '') as keyof typeof editing;
    const handler = editing[name];
    assert.equal(typeof handler, 'function', `Missing adapter: ${c.function}`);
    const args = decode(c.args) as unknown[],
      before = structuredClone(args);
    const call = () => Reflect.apply(handler as (...args: unknown[]) => unknown, null, args);
    if (c.expected.error) assert.throws(call, { name: c.expected.error });
    else assert.deepEqual(call(), decode(c.expected.value));
    assert.deepEqual(args, before, 'New helpers must not change caller-owned data');
  });
test('all editing expectations have adapters', () => {
  assert.equal(reference.cases.length, 150);
  for (const c of reference.cases)
    assert.equal(typeof editing[c.function.replace(/^_/, '') as keyof typeof editing], 'function');
});
