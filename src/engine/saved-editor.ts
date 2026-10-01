/** Connect approved edit/undo/redo operations to automatic browser persistence. */
import { EditSession } from './edit-session.ts';
import type { AutoEdit, AutoEditResult } from './auto-edit.ts';
import type { RestoreRequest } from './edit-review.ts';
import { LocalSessionStore } from './session-storage.ts';
import type { BrowserStorage, SavedSession, SaveResult, JsonValue } from './session-storage.ts';

export class SavedEditor {
  #history: EditSession;
  #store: LocalSessionStore;
  #values: SavedSession['values'];
  constructor(store: LocalSessionStore, session: SavedSession) {
    this.#store = store;
    this.#history = new EditSession(session.data);
    this.#values = structuredClone(session.values);
  }
  snapshot(): SavedSession {
    return { data: this.#history.snapshot(), values: structuredClone(this.#values) };
  }
  get canUndo() {
    return this.#history.canUndo;
  }
  get canRedo() {
    return this.#history.canRedo;
  }
  #persist(result: AutoEditResult): AutoEditResult & { saved: SaveResult | null } {
    return { ...result, saved: result.persistence ? this.#store.save(this.snapshot()) : null };
  }
  edit(edit: AutoEdit) {
    return this.#persist(this.#history.edit(edit));
  }
  restoreDefault(request: RestoreRequest) {
    return this.#persist(this.#history.restoreDefault(request));
  }
  undo() {
    return this.#persist(this.#history.undo());
  }
  redo() {
    return this.#persist(this.#history.redo());
  }
  setValues(values: Record<string, JsonValue>): SaveResult {
    this.#values = structuredClone(values);
    return this.#store.save(this.snapshot());
  }
  retrySave(): SaveResult {
    return this.#store.save(this.snapshot());
  }
}
export function open_saved_editor(storage: BrowserStorage) {
  const store = new LocalSessionStore(storage),
    loaded = store.load();
  if (!('session' in loaded)) return loaded;
  return {
    kind: 'ready' as const,
    isNew: loaded.kind === 'empty',
    editor: new SavedEditor(store, loaded.session),
  };
}
