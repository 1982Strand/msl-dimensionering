import { validateEmployees, type Employee } from '../src/report/company-profile.ts';

type Fields = Record<string, unknown>;
const isObject = (value: unknown): value is Fields =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Godtager en ren liste eller en eksporteret firmaprofil (»Eksportér profil«), hvor
 * medarbejderne ligger i profile.medarbejdere. */
export function parseEmployeeList(value: unknown): Employee[] {
  const source = isObject(value) && isObject(value.profile) ? value.profile : value;
  const employees = isObject(source) ? source.medarbejdere : source;
  const error = validateEmployees(employees);
  if (error) throw new Error(`Kartoteket er ugyldigt: ${error}`);
  return employees as Employee[];
}
