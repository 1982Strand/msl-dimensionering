/** npm run kartotek -- <fil> — sender medarbejderlisten som hemmelighed til GitHub. */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseEmployeeList } from './employee-list.ts';
import type { Employee } from '../src/report/company-profile.ts';

export const MAX_SECRET_BYTES = 48 * 1024;

// Grænsen gælder den liste, der sendes; en eksporteret profil med logo må gerne være større.
export async function readEmployeeSecret(file: string): Promise<Employee[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'));
  } catch {
    throw new Error('Kartoteket er ikke gyldig JSON.');
  }
  const employees = parseEmployeeList(parsed);
  if (Buffer.byteLength(JSON.stringify(employees)) > MAX_SECRET_BYTES)
    throw new Error('Kartoteket er over GitHubs grænse på 48 KB.');
  return employees;
}

export async function sendEmployeeSecret(
  file: string,
  run: (command: string, args: string[], input: string) => { status: number | null },
): Promise<number> {
  const employees = await readEmployeeSecret(file);
  const result = run(
    'gh',
    ['secret', 'set', 'MEDARBEJDERE_JSON', '--repo', '1982Strand/msl-dimensionering'],
    JSON.stringify(employees),
  );
  if (result.status !== 0) throw new Error('GitHub-hemmeligheden kunne ikke gemmes med gh.');
  return employees.length;
}

async function main() {
  const file = process.argv[2];
  if (!file || process.argv.length !== 3) throw new Error('Brug: npm run kartotek -- <fil>.');
  const count = await sendEmployeeSecret(file, (command, args, input) => {
    const result = spawnSync(command, args, {
      input,
      encoding: 'utf8',
      // gh's fejlbeskeder vises; listen går kun via stdin og udskrives aldrig.
      stdio: ['pipe', 'ignore', 'inherit'],
    });
    return { status: result.status };
  });
  console.log(`${count} medarbejdere gemt som GitHub-hemmelighed MEDARBEJDERE_JSON.`);
  console.log(
    'Listen kommer med ved næste udrulning, fx med gh workflow run engine.yml --ref main.',
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
