import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LocalSessionStore,
  SESSION_STORAGE_KEY,
  fresh_saved_session,
} from '../src/engine/session-storage.ts';
import type { BrowserStorage } from '../src/engine/session-storage.ts';
import { open_saved_editor } from '../src/engine/saved-editor.ts';

class MemoryStorage implements BrowserStorage {
  items = new Map<string, string>();
  writes = 0;
  failRead = false;
  failWrite = false;
  getItem(key: string) {
    if (this.failRead) throw new Error('blocked');
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrite) throw new Error('quota');
    this.items.set(key, value);
    this.writes++;
  }
}
function ready(storage: BrowserStorage) {
  const result = open_saved_editor(storage);
  assert.equal(result.kind, 'ready');
  if (result.kind !== 'ready') throw new Error('Expected ready');
  return result;
}
test('first start uses unchanged defaults without writing a profile', () => {
  const storage = new MemoryStorage(),
    result = ready(storage);
  assert.equal(result.isNew, true);
  assert.deepEqual(result.editor.snapshot(), fresh_saved_session());
  assert.equal(storage.writes, 0);
});
test('automatic material save survives reopening; undo history is session-local', () => {
  const storage = new MemoryStorage(),
    editor = ready(storage).editor,
    m = editor.snapshot().data.materialer;
  m[0].phi = 39;
  assert.deepEqual(editor.edit({ section: 'materialer', value: m }).saved, { ok: true });
  const reopened = ready(storage);
  assert.equal(reopened.isNew, false);
  assert.deepEqual(reopened.editor.snapshot(), editor.snapshot());
  assert.equal(reopened.editor.canUndo, false);
  assert.equal(storage.items.size, 1);
  assert.ok(storage.items.has(SESSION_STORAGE_KEY));
});
test('every data section and nested user-entered values round-trip exactly', () => {
  const storage = new MemoryStorage(),
    editor = ready(storage).editor;
  const d = editor.snapshot().data.designdiagrammer;
  d[3].rows.find((r) => r.eu === 10)!.t_1_lag_cm = null;
  assert.deepEqual(editor.edit({ section: 'designdiagrammer', value: d }).saved, { ok: true });
  const runs = editor.snapshot().data.vejdim_koersel_raekker;
  runs[0].t_SG_mm = 420;
  assert.deepEqual(editor.edit({ section: 'vejdim_koersel_raekker', value: runs }).saved, {
    ok: true,
  });
  const settings = editor.snapshot().data.indstillinger;
  settings.afrunding.trin_mm = 10;
  assert.deepEqual(editor.edit({ section: 'indstillinger', value: settings }).saved, { ok: true });
  assert.deepEqual(
    editor.setValues({
      eu: 0,
      report: { title: 'Prøve æøå', note: 'Linje 1\n  Linje 2', enabled: false },
      layers: [null, 0, ''],
    }),
    { ok: true },
  );
  assert.deepEqual(ready(storage).editor.snapshot(), editor.snapshot());
});
test('explicit empty material field and removed rows are not backfilled on reopening', () => {
  const storage = new MemoryStorage(),
    editor = ready(storage).editor,
    m = editor.snapshot().data.materialer;
  m[0].krav_maskestoerrelse_mm = null;
  m.pop();
  const result = editor.edit({ section: 'materialer', value: m });
  assert.deepEqual(result.saved, { ok: true });
  const d = editor.snapshot().data.designdiagrammer;
  d[3].rows = d[3].rows.filter((r) => r.eu !== 10);
  assert.deepEqual(editor.edit({ section: 'designdiagrammer', value: d }).saved, { ok: true });
  assert.deepEqual(ready(storage).editor.snapshot(), editor.snapshot());
});
test('undo, redo and restore-default each persist the resulting data automatically', () => {
  const storage = new MemoryStorage(),
    editor = ready(storage).editor,
    m = editor.snapshot().data.materialer;
  m[0].phi = 39;
  editor.edit({ section: 'materialer', value: m });
  assert.deepEqual(editor.undo().saved, { ok: true });
  assert.equal(ready(storage).editor.snapshot().data.materialer[0].phi, 37);
  assert.deepEqual(editor.redo().saved, { ok: true });
  assert.equal(ready(storage).editor.snapshot().data.materialer[0].phi, 39);
  assert.deepEqual(
    editor.restoreDefault({
      table: { section: 'materialer' },
      key: m[0].navn,
      index: 0,
      field: 'phi',
    }).saved,
    { ok: true },
  );
  assert.equal(ready(storage).editor.snapshot().data.materialer[0].phi, 37);
  assert.equal(storage.writes, 4);
});
test('resetting one section preserves saved values and other edited sections', () => {
  const storage = new MemoryStorage(),
    editor = ready(storage).editor,
    m = editor.snapshot().data.materialer;
  m[0].phi = 39;
  editor.edit({ section: 'materialer', value: m });
  editor.setValues({ eu: 15 });
  const runs = editor.snapshot().data.vejdim_koersel_raekker;
  runs[0].t_SG_mm = 420;
  editor.edit({ section: 'vejdim_koersel_raekker', value: runs });
  assert.deepEqual(editor.edit({ reset: 'vejdim_koersel_raekker' }).saved, { ok: true });
  const reopened = ready(storage).editor.snapshot();
  assert.equal(reopened.data.materialer[0].phi, 39);
  assert.equal(reopened.values.eu, 15);
  assert.deepEqual(
    reopened.data.vejdim_koersel_raekker,
    fresh_saved_session().data.vejdim_koersel_raekker,
  );
});
test('invalid edits leave persisted data and active values intact', () => {
  const storage = new MemoryStorage(),
    editor = ready(storage).editor;
  editor.setValues({ eu: 10 });
  const before = storage.getItem(SESSION_STORAGE_KEY),
    result = editor.edit({ section: 'materialer', value: [] });
  assert.equal(result.saved, null);
  assert.equal(storage.getItem(SESSION_STORAGE_KEY), before);
  assert.deepEqual(editor.snapshot(), ready(storage).editor.snapshot());
  assert.equal(storage.writes, 1);
});
for (const raw of [
  'not json',
  JSON.stringify({ schema: 2, session: fresh_saved_session() }),
  JSON.stringify({ schema: 1, session: { data: {}, values: {} } }),
]) {
  test('unreadable or unsupported saved data is not silently replaced: ' + raw.slice(0, 40), () => {
    const storage = new MemoryStorage();
    storage.items.set(SESSION_STORAGE_KEY, raw);
    assert.equal(open_saved_editor(storage).kind, 'invalid');
    assert.equal(storage.getItem(SESSION_STORAGE_KEY), raw);
    assert.equal(storage.writes, 0);
  });
}
function storedWith(change: (indstillinger: Record<string, Record<string, unknown>>) => void) {
  const storage = new MemoryStorage(),
    session = fresh_saved_session();
  session.data.indstillinger.afrunding.trin_mm = 10;
  session.data.indstillinger.lagfordeling.fordeling = 'proportional';
  const raw = structuredClone(session) as unknown as {
    data: { indstillinger: Record<string, Record<string, unknown>> };
  };
  change(raw.data.indstillinger);
  const text = JSON.stringify({ schema: 1, session: raw });
  storage.items.set(SESSION_STORAGE_KEY, text);
  return { storage, session, text };
}
for (const [name, change] of [
  ['minimumsklasse', (s) => delete s.lagfordeling.minimumsklasse],
  ['phi_afrunding', (s) => delete s.afrunding.phi_afrunding],
  ['minimum_mm["6"]', (s) => delete (s.lagfordeling.minimum_mm as Record<string, unknown>)['6']],
  ['yderomraade', (s) => delete s.yderomraade],
] as [string, (s: Record<string, Record<string, unknown>>) => void][])
  test('older snapshot without the setting ' + name + ' loads with the default added', () => {
    const { storage, session, text } = storedWith(change),
      opened = ready(storage);
    assert.deepEqual(opened.editor.snapshot(), session);
    assert.equal(opened.isNew, false);
    assert.equal(storage.getItem(SESSION_STORAGE_KEY), text);
    assert.equal(storage.writes, 0);
  });
for (const [name, change] of [
  ['an invalid value', (s) => (s.afrunding.trin_mm = 7)],
  ['an unknown key', (s) => (s.lagfordeling.ukendt = true)],
  ['a wrong type', (s) => (s.lagfordeling.minimum_mm = [200])],
] as [string, (s: Record<string, Record<string, unknown>>) => void][])
  test('saved settings with ' + name + ' are still rejected without overwriting', () => {
    const { storage, text } = storedWith(change);
    assert.equal(open_saved_editor(storage).kind, 'invalid');
    assert.equal(storage.getItem(SESSION_STORAGE_KEY), text);
    assert.equal(storage.writes, 0);
  });
test('missing fields in other sections are still not backfilled', () => {
  const storage = new MemoryStorage(),
    raw = structuredClone(fresh_saved_session()) as unknown as {
      data: { materialer: Record<string, unknown>[] };
    };
  delete raw.data.materialer[0].krav_maskestoerrelse_mm;
  storage.items.set(SESSION_STORAGE_KEY, JSON.stringify({ schema: 1, session: raw }));
  assert.equal(open_saved_editor(storage).kind, 'invalid');
});
test('blocked reading returns a visible failure instead of fresh defaults', () => {
  const storage = new MemoryStorage();
  storage.failRead = true;
  assert.equal(open_saved_editor(storage).kind, 'unavailable');
  assert.equal(storage.writes, 0);
});
test('failed save retains active changes, preserves old stored data, and can retry', () => {
  const storage = new MemoryStorage(),
    editor = ready(storage).editor;
  editor.setValues({ eu: 10 });
  const before = storage.getItem(SESSION_STORAGE_KEY);
  storage.failWrite = true;
  const m = editor.snapshot().data.materialer;
  m[0].phi = 39;
  const result = editor.edit({ section: 'materialer', value: m });
  assert.equal(result.saved?.ok, false);
  assert.equal(editor.snapshot().data.materialer[0].phi, 39);
  assert.equal(storage.getItem(SESSION_STORAGE_KEY), before);
  storage.failWrite = false;
  assert.deepEqual(editor.retrySave(), { ok: true });
  assert.deepEqual(ready(storage).editor.snapshot(), editor.snapshot());
});
test('non-finite values cannot be silently turned into null by JSON serialization', () => {
  const storage = new MemoryStorage(),
    store = new LocalSessionStore(storage),
    session = fresh_saved_session();
  session.values.eu = NaN;
  assert.equal(store.save(session).ok, false);
  assert.equal(storage.writes, 0);
});
test('snapshots and caller-owned input cannot mutate saved values', () => {
  const storage = new MemoryStorage(),
    editor = ready(storage).editor,
    values = { report: { title: 'Oprindelig' } };
  editor.setValues(values);
  values.report.title = 'Muteret';
  const snapshot = editor.snapshot();
  snapshot.values.report = null;
  assert.deepEqual(editor.snapshot().values, { report: { title: 'Oprindelig' } });
  assert.deepEqual(ready(storage).editor.snapshot(), editor.snapshot());
});
