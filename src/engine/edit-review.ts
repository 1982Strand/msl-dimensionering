/** R-002/R-003: compare with built-in defaults; never change calculation values for display. */
import { standard_data_state } from './auto-edit.ts';
import type { AutoEdit, DataState } from './auto-edit.ts';
import { equalData } from './editing.ts';
import { pythonRound } from './python-numbers.ts';

export type TableSelection =
  | { section: 'materialer' | 'vejdim_koersel_raekker' }
  | { section: 'designdiagrammer'; diagram_nr: number };
export interface ReviewedRow {
  index: number | null;
  key: string;
  kind: 'unchanged' | 'changed' | 'added' | 'removed';
  current: Record<string, unknown> | null;
  standard: Record<string, unknown> | null;
  changedFields: string[];
}
function rows(state: DataState, table: TableSelection): Record<string, unknown>[] {
  if (table.section === 'designdiagrammer') {
    const diagram = state.designdiagrammer.find((d) => d.diagram_nr === table.diagram_nr);
    if (!diagram) throw new RangeError('Unknown diagram');
    return diagram.rows.map((r) => ({ ...r }));
  }
  return state[table.section].map((r) => ({ ...r }));
}
const keyOf = (table: TableSelection, row: Record<string, unknown>) =>
  table.section === 'materialer'
    ? String(row.navn)
    : table.section === 'designdiagrammer'
      ? String(row.eu)
      : JSON.stringify([row.T, row.eu]);
function sameField(table: TableSelection, a: unknown, b: unknown): boolean {
  return table.section === 'designdiagrammer' && typeof a === 'number' && typeof b === 'number'
    ? pythonRound(a, 6) === pythonRound(b, 6)
    : equalData(a, b);
}
export function review_table(
  state: DataState,
  table: TableSelection,
  onlyChanged = false,
): ReviewedRow[] {
  const active = rows(state, table),
    standard = rows(standard_data_state(), table);
  const source = new Map(standard.map((r) => [keyOf(table, r), r])),
    seen = new Set<string>();
  const out: ReviewedRow[] = active.map((r, index) => {
    const key = keyOf(table, r),
      original = source.get(key) ?? null;
    seen.add(key);
    const fields = [...new Set([...Object.keys(r), ...Object.keys(original ?? {})])];
    const changedFields = fields.filter((k) => !original || !sameField(table, r[k], original[k]));
    return {
      index,
      key,
      kind: !original ? 'added' : changedFields.length ? 'changed' : 'unchanged',
      current: structuredClone(r),
      standard: structuredClone(original),
      changedFields,
    };
  });
  for (const [key, r] of source)
    if (!seen.has(key))
      out.push({
        index: null,
        key,
        kind: 'removed',
        current: null,
        standard: structuredClone(r),
        changedFields: Object.keys(r),
      });
  return onlyChanged ? out.filter((r) => r.kind !== 'unchanged') : out;
}
export type RestoreRequest = {
  table: TableSelection;
  key: string;
  index: number | null;
  field?: string;
};
export function restore_default_edit(state: DataState, request: RestoreRequest): AutoEdit | null {
  const review = review_table(state, request.table).find(
    (r) => r.key === request.key && r.index === request.index,
  );
  if (!review?.standard) return null; // Custom rows have no implicit default and must not be deleted.
  if (request.field && !Object.hasOwn(review.standard, request.field)) return null;
  const replacement = structuredClone(review.standard),
    next = rows(state, request.table);
  if (review.index === null) {
    if (request.field) return null; // Restoring a missing row requires all its fields.
    next.push(replacement);
  } else if (request.field)
    next[review.index] = { ...next[review.index], [request.field]: replacement[request.field] };
  else next[review.index] = replacement;
  if (request.table.section === 'designdiagrammer') {
    const nr = request.table.diagram_nr;
    return {
      section: 'designdiagrammer',
      value: state.designdiagrammer.map((d) => (d.diagram_nr === nr ? { ...d, rows: next } : d)),
    };
  }
  return { section: request.table.section, value: next };
}
