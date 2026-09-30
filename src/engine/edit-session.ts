/** Session-local history: navigation keeps this instance; a new session starts without history. */
import { apply_auto_edit, standard_data_state } from './auto-edit.ts';
import type { AutoEdit, AutoEditResult, DataSection, DataState } from './auto-edit.ts';
import * as e from './editing.ts';
import { restore_default_edit } from './edit-review.ts';
import type { RestoreRequest } from './edit-review.ts';

interface HistoryEntry {
  section: DataSection;
  before: DataState[DataSection];
  after: DataState[DataSection];
}
export class EditSession {
  #state: DataState;
  #past: HistoryEntry[] = [];
  #future: HistoryEntry[] = [];
  constructor(initial: DataState = standard_data_state()) {
    this.#state = structuredClone(initial);
  }
  snapshot(): DataState {
    return structuredClone(this.#state);
  }
  get canUndo() {
    return this.#past.length > 0;
  }
  get canRedo() {
    return this.#future.length > 0;
  }
  edit(edit: AutoEdit): AutoEditResult {
    const result = apply_auto_edit(this.#state, edit);
    if (result.changed) {
      const section = 'reset' in edit ? edit.reset : edit.section;
      this.#past.push({
        section,
        before: structuredClone(this.#state[section]),
        after: structuredClone(result.state[section]),
      });
      this.#future = [];
    }
    this.#state = structuredClone(result.state);
    return { ...result, state: this.snapshot() };
  }
  restoreDefault(request: RestoreRequest): AutoEditResult {
    const edit = restore_default_edit(this.#state, request);
    return edit ? this.edit(edit) : this.#unchanged();
  }
  #unchanged(): AutoEditResult {
    return { state: this.snapshot(), errors: [], persistence: null, changed: false };
  }
  #restore(entry: HistoryEntry, direction: 'before' | 'after'): AutoEditResult {
    // Restore the validated snapshot exactly. Renormalising could reintroduce deleted rows.
    this.#state = { ...this.#state, [entry.section]: structuredClone(entry[direction]) };
    const operation =
      entry.section === 'vejdim_koersel_raekker'
        ? e.gem_koersel_raekker(this.#state[entry.section])
        : e.gem_materialer(this.#state[entry.section]);
    return {
      state: this.snapshot(),
      errors: [],
      persistence: { section: entry.section, operation },
      changed: true,
    };
  }
  undo(): AutoEditResult {
    const entry = this.#past.pop();
    if (!entry) return this.#unchanged();
    this.#future.push(entry);
    return this.#restore(entry, 'before');
  }
  redo(): AutoEditResult {
    const entry = this.#future.pop();
    if (!entry) return this.#unchanged();
    this.#past.push(entry);
    return this.#restore(entry, 'after');
  }
}
