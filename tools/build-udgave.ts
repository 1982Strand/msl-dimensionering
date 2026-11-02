/** node tools/build-udgave.ts <intern|offentlig> [--kartotek <fil>]. */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import type { Employee } from '../src/report/company-profile.ts';
import { packPdfMotor } from './pak-pdf-motor.ts';
import { parseEmployeeList } from './employee-list.ts';
import { INDBYGGET_OPSAETNING, validerOpsaetning } from '../src/ui/udgave-opsaetning.ts';

export async function readEmployeeList(options: {
  file?: string;
  environment?: string;
}): Promise<Employee[] | undefined> {
  let raw: string | undefined;
  if (options.file) raw = await readFile(options.file, 'utf8');
  else raw = options.environment;
  if (raw === undefined || raw.trim() === '') return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Kartoteket er ikke gyldig JSON.');
  }
  return parseEmployeeList(parsed);
}

export async function buildEdition(
  edition: 'intern' | 'offentlig',
  options: { file?: string; environment?: string } = {},
): Promise<number> {
  if (edition === 'offentlig' && options.file)
    throw new Error('Den offentlige udgave kan ikke bygges med et kartotek.');
  if (edition === 'offentlig') {
    const checked = validerOpsaetning(INDBYGGET_OPSAETNING);
    if (!checked.ok) throw new Error(checked.fejl);
  }
  const employees = edition === 'intern' ? await readEmployeeList(options) : undefined;

  process.env.VITE_UDGAVE = edition;
  delete process.env.VITE_MEDARBEJDERE;
  if (edition === 'intern' && employees !== undefined) {
    process.env.VITE_MEDARBEJDERE = JSON.stringify(employees);
    console.log(`Indbygget kartotek: ${employees.length} medarbejdere.`);
  } else if (edition === 'intern') {
    console.log('Indbygget kartotek: 0 medarbejdere.');
  }
  const outDir = resolve(`dist-${edition}`);
  await build({ build: { outDir, emptyOutDir: true } });
  await packPdfMotor(outDir);
  return employees?.length ?? 0;
}

async function main() {
  const edition = process.argv[2];
  if (edition !== 'intern' && edition !== 'offentlig')
    throw new Error('Angiv udgaven: intern eller offentlig.');
  const args = process.argv.slice(3);
  let file: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--kartotek' && args[i + 1] && !file) file = args[++i];
    else throw new Error('Brug: node tools/build-udgave.ts <intern|offentlig> [--kartotek <fil>].');
  }
  await buildEdition(edition, { file, environment: process.env.MEDARBEJDERE_JSON });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
