import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function checkDistSizes(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await checkDistSizes(path);
    else if ((await stat(path)).size > MAX_FILE_BYTES)
      throw new Error(`${path}: overskrider hostinggrænsen på 25 MiB pr. fil.`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await checkDistSizes(resolve(process.argv[2] ?? 'dist'));
