import { validateEmployees, type Employee } from '../src/report/company-profile.ts';

export function parseEmployeeList(value: unknown): Employee[] {
  const employees =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>).medarbejdere
      : value;
  const error = validateEmployees(employees);
  if (error) throw new Error(`Kartoteket er ugyldigt: ${error}`);
  return employees as Employee[];
}
