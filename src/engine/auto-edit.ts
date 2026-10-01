/** B-017: direct table editing. Valid edits immediately replace the active data.
 * A storage adapter executes the returned operation; this module chooses no storage location.
 */
import * as e from './editing.ts';
import type { SaveOperation } from './editing.ts';

export interface DataState {
  materialer: e.EditableMaterial[];
  designdiagrammer: e.DesignDiagram[];
  vejdim_koersel_raekker: e.RunRow[];
  indstillinger: ReturnType<typeof e.standard_indstillinger>;
}
export type DataSection = keyof DataState;
export type AutoEdit =
  | { section: DataSection; value: unknown }
  | { reset: Exclude<DataSection, 'indstillinger'>; diagram_nr?: number };
export interface AutoEditResult {
  state: DataState;
  errors: string[];
  persistence: { section: DataSection; operation: SaveOperation } | null;
  changed: boolean;
}
export function standard_data_state(): DataState {
  return {
    materialer: e.standard_materialer(),
    designdiagrammer: e.standard_designdiagrammer(),
    vejdim_koersel_raekker: e.standard_koersel_raekker(),
    indstillinger: e.standard_indstillinger(),
  };
}
export function aktivt_beregningsgrundlag(state: DataState) {
  return {
    t_basis_table: e.generer_t_basis_table_fra_diagrammer(state.designdiagrammer),
    koersler: e.koersler_fra_raekker(state.vejdim_koersel_raekker),
    indstillinger: structuredClone(state.indstillinger),
  };
}
export function apply_auto_edit(state: DataState, edit: AutoEdit): AutoEditResult {
  const unchanged = (errors: string[] = []): AutoEditResult => ({
    state,
    errors,
    persistence: null,
    changed: false,
  });
  const section = 'reset' in edit ? edit.reset : edit.section;
  let next: DataState, operation: SaveOperation;
  if ('reset' in edit) {
    const defaults = standard_data_state();
    if (section === 'designdiagrammer' && edit.diagram_nr !== undefined) {
      const replacement = defaults.designdiagrammer.find((d) => d.diagram_nr === edit.diagram_nr);
      if (!replacement) throw new RangeError('Unknown diagram number');
      next = {
        ...state,
        designdiagrammer: state.designdiagrammer.map((d) =>
          d.diagram_nr === edit.diagram_nr ? replacement : d,
        ),
      };
      operation = e.gem_designdiagrammer(next.designdiagrammer);
    } else {
      next = { ...state, [section]: defaults[section] };
      operation = { kind: 'delete' };
    }
    // Preserve explicit reset actions even if data already equals the defaults.
    return {
      state: next,
      errors: [],
      persistence: { section, operation },
      changed: !e.equalData(state[section], next[section]),
    };
  }
  switch (section) {
    case 'materialer': {
      const materials = e.normaliser_materialer(edit.value);
      if (!materials.length)
        return unchanged(['Materialelisten skal indeholde mindst ét materiale.']);
      const duplicates = e.duplikerede_materialenavne(materials);
      if (duplicates.length)
        return unchanged([
          'Materialenavne skal være unikke. Ret duplikater: ' + duplicates.join(', '),
        ]);
      next = { ...state, materialer: materials };
      operation = e.gem_materialer(materials);
      break;
    }
    case 'designdiagrammer': {
      const [diagrams, errors] = e.normaliser_designdiagrammer(edit.value);
      if (errors.length)
        return unchanged(['Diagramdata er ikke gemt, fordi der er fejl: ' + errors.join(' ')]);
      next = { ...state, designdiagrammer: diagrams };
      operation = e.gem_designdiagrammer(diagrams);
      break;
    }
    case 'vejdim_koersel_raekker': {
      const runs = e.normaliser_koersel_raekker(edit.value);
      next = { ...state, vejdim_koersel_raekker: runs };
      operation = e.gem_koersel_raekker(runs);
      break;
    }
    case 'indstillinger': {
      const settings = e.normaliser_indstillinger(edit.value);
      next = { ...state, indstillinger: settings };
      operation = e.gem_indstillinger(settings);
      break;
    }
  }
  if (e.equalData(state[section], next[section])) return unchanged();
  return { state: next, errors: [], persistence: { section, operation }, changed: true };
}
