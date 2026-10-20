/** One JSON document for this browser. No named profiles, account or server dependency. */
import type { DataState } from './auto-edit.ts';
import { standard_data_state } from './auto-edit.ts';
import { isRecord } from './python-numbers.ts';
import * as e from './editing.ts';

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export interface SavedSession {
  data: DataState;
  // User-entered form values can be wired here as the React forms are migrated.
  // Calculated results, PDF files and undo history do not belong in this object.
  values: Record<string, JsonValue>;
}
export interface BrowserStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export const SESSION_STORAGE_KEY = 'msl-dimensionering.session.v1';
export const fresh_saved_session = (): SavedSession => ({
  data: standard_data_state(),
  values: {},
});
function assertJson(value: unknown): void {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    value.forEach(assertJson);
    return;
  }
  if (isRecord(value) && Object.getPrototypeOf(value) === Object.prototype) {
    Object.values(value).forEach(assertJson);
    return;
  }
  throw new TypeError('Data indeholder en værdi, som ikke kan gemmes som JSON.');
}
/** Every saved key must round-trip unchanged; keys missing from an older snapshot may be added. */
function savedSubset(saved: unknown, normalised: unknown): boolean {
  if (isRecord(saved) && isRecord(normalised))
    return Object.keys(saved).every(
      (k) => Object.hasOwn(normalised, k) && savedSubset(saved[k], normalised[k]),
    );
  return e.equalData(saved, normalised);
}
function decodeData(value: unknown): DataState {
  if (
    !isRecord(value) ||
    !['materialer', 'designdiagrammer', 'vejdim_koersel_raekker', 'indstillinger'].every((k) =>
      Object.hasOwn(value, k),
    )
  )
    throw new TypeError('De gemte grunddata er ufuldstændige.');
  const materials = e.normaliser_materialer(value.materialer);
  const [diagrams, errors] = e.normaliser_designdiagrammer(value.designdiagrammer);
  if (!materials.length || e.duplikerede_materialenavne(materials).length || errors.length)
    throw new TypeError('De gemte grunddata er ugyldige.');
  const data: DataState = {
    materialer: materials,
    designdiagrammer: diagrams,
    vejdim_koersel_raekker: e.normaliser_koersel_raekker(value.vejdim_koersel_raekker),
    indstillinger: e.normaliser_indstillinger(value.indstillinger),
  };
  // Versioned app snapshots must round-trip exactly. Legacy JSON loaders remain separate.
  // In particular, do not backfill an intentionally empty material field during reload.
  // Settings added in a later version are filled with their defaults (docs/BESLUTNINGER.md, 20. oktober 2026).
  const { indstillinger, ...rest } = data,
    { indstillinger: savedSettings, ...savedRest } = value;
  if (!e.equalData(rest, savedRest) || !savedSubset(savedSettings, indstillinger))
    throw new TypeError('De gemte data svarer ikke til det understøttede format.');
  return data;
}
function validateSession(value: unknown): SavedSession {
  assertJson(value);
  if (!isRecord(value) || !isRecord(value.values))
    throw new TypeError('Den gemte session er ugyldig.');
  return {
    data: decodeData(value.data),
    values: structuredClone(value.values) as Record<string, JsonValue>,
  };
}
export type LoadResult =
  | { kind: 'empty' | 'loaded'; session: SavedSession }
  | { kind: 'invalid' | 'unavailable'; message: string };
export type SaveResult = { ok: true } | { ok: false; message: string };
export class LocalSessionStore {
  #storage: BrowserStorage;
  constructor(storage: BrowserStorage) {
    this.#storage = storage;
  }
  load(): LoadResult {
    let text: string | null;
    try {
      text = this.#storage.getItem(SESSION_STORAGE_KEY);
    } catch {
      return { kind: 'unavailable', message: 'Browserens gemte data kunne ikke læses.' };
    }
    if (text === null) return { kind: 'empty', session: fresh_saved_session() };
    try {
      const envelope: unknown = JSON.parse(text);
      if (!isRecord(envelope) || envelope.schema !== 1)
        throw new TypeError('Ukendt formatversion.');
      return { kind: 'loaded', session: validateSession(envelope.session) };
    } catch {
      return {
        kind: 'invalid',
        message: 'De gemte data kunne ikke indlæses. De er ikke overskrevet.',
      };
    }
  }
  save(session: SavedSession): SaveResult {
    try {
      const validated = validateSession(session);
      this.#storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ schema: 1, session: validated }));
      return { ok: true };
    } catch {
      return { ok: false, message: 'Ændringerne kunne ikke gemmes i browseren.' };
    }
  }
}
