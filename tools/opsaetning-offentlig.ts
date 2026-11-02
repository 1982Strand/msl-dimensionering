import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { oversigtOpsaetning, validerOpsaetning } from '../src/ui/udgave-opsaetning.ts';

export function forberedOpsaetning(raw: string): { json: string; oversigt: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Filen er ikke gyldig JSON.');
  }
  const checked = validerOpsaetning(parsed);
  if (!checked.ok) throw new Error(checked.fejl);
  return {
    json: `${JSON.stringify(checked.value, null, 2)}\n`,
    oversigt: oversigtOpsaetning(checked.value),
  };
}

export async function installerOpsaetning(
  file: string,
  target = 'src/ui/opsaetning-offentlig.json',
) {
  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch {
    throw new Error('Opsætningsfilen kunne ikke læses.');
  }
  const prepared = forberedOpsaetning(raw);
  try {
    await writeFile(target, prepared.json, 'utf8');
  } catch {
    throw new Error('Opsætningen kunne ikke skrives til projektfilen.');
  }
  return prepared.oversigt;
}

async function main() {
  const file = process.argv[2];
  if (!file || process.argv.length > 3) throw new Error('Brug: npm run opsaetning -- <fil>.');
  console.log(await installerOpsaetning(file));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Opsætningen kunne ikke indlæses.');
    process.exitCode = 1;
  }
}
