/** Compatibility at the legacy JSON/editor boundary; no locale-dependent coercion. */
import casefold from './python-casefold.json' with { type: 'json' };
import { isRecord } from './python-numbers.ts';
export function legacyError(name: string, message: string): never {
  const error = new Error(message);
  error.name = name;
  throw error;
}
export function pythonTruthy(v: unknown): boolean {
  if (v == null || v === false || v === 0 || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (isRecord(v)) return Object.keys(v).length > 0;
  return true;
}
export function pythonString(v: unknown): string {
  if (v == null) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return 'nan';
    if (!Number.isFinite(v)) return v < 0 ? '-inf' : 'inf';
  }
  return String(v);
}
export const editorText = (v: unknown) => pythonString(pythonTruthy(v) ? v : '').trim();
export function pythonFloat(v: unknown): number {
  if (typeof v === 'number' || typeof v === 'boolean') return Number(v);
  if (typeof v !== 'string') return legacyError('TypeError', 'Expected a number or numeric string');
  const text = v.trim();
  if (/^[+-]?nan$/i.test(text)) return NaN;
  if (/^[+-]?inf(?:inity)?$/i.test(text)) return text.startsWith('-') ? -Infinity : Infinity;
  // Python permits underscores between digits, but not JS hex, empty strings or decimal commas.
  if (
    !/^[+-]?(?:\d(?:_?\d)*(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?$/.test(
      text,
    )
  )
    return legacyError('ValueError', 'Invalid numeric string');
  return Number(text.replaceAll('_', ''));
}
export function pythonInt(v: number): number {
  if (Number.isNaN(v)) return legacyError('ValueError', 'Cannot convert NaN to integer');
  if (!Number.isFinite(v))
    return legacyError('OverflowError', 'Cannot convert infinity to integer');
  return Math.trunc(v) || 0;
}
export function valueOr<T>(call: () => T, fallback: T): T {
  try {
    return call();
  } catch (error) {
    if (error instanceof Error && ['TypeError', 'ValueError'].includes(error.name)) return fallback;
    throw error;
  }
}
export function pythonCasefold(text: string): string {
  const mapping: Record<string, string> = casefold.mapping;
  return Array.from(text, (char) => mapping[char] ?? char).join('');
}
export function rowRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return legacyError('AttributeError', 'Expected an object with fields');
  return value;
}
export function rowsList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) return Object.keys(value);
  if (typeof value === 'string') return Array.from(value);
  return legacyError('TypeError', 'Expected an iterable');
}
