/** Efter Vite: pak den uændrede compiler, fjern originalen, og kontrollér ALLE filer. */
import { readFile, writeFile, readdir, stat, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { unpackPdfMotor } from '../src/report/pdf-motor.ts';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const compilerWasm = new URL(
  '../node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm',
  import.meta.url,
);
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

async function filesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? filesIn(path) : [path];
      }),
    )
  ).flat();
}

export async function checkDistSizes(directory: string): Promise<void> {
  for (const path of await filesIn(directory)) {
    const { size } = await stat(path);
    if (size > MAX_FILE_BYTES)
      throw new Error(`${path}: ${size} bytes overskrider grænsen på 25 MiB pr. fil.`);
  }
}

export async function packPdfMotor(directory: string): Promise<void> {
  const files = await filesIn(directory);
  const motors = files.filter((path) => /typst_ts_web_compiler_bg-[^/\\]+\.wasm$/.test(path));
  if (motors.length !== 1)
    throw new Error(`Forventede én Vite-bygget PDF-motor; fandt ${motors.length}.`);
  const original = await readFile(compilerWasm);
  const built = await readFile(motors[0]);
  if (hash(built) !== hash(original)) throw new Error('Den byggede PDF-motor afviger fra pakken.');
  const compressed = gzipSync(built, { level: 9 });
  const packedPath = `${motors[0]}.gz`;
  await writeFile(packedPath, compressed);
  // Kontrollér den faktisk skrevne fil med samme udpakning som i browseren.
  const restored = await unpackPdfMotor(new Response(await readFile(packedPath)));
  if (hash(restored) !== hash(original))
    throw new Error('Den udpakkede PDF-motor afviger fra pakken.');
  await unlink(motors[0]);
  await checkDistSizes(directory);
  console.log(
    `PDF-motor: ${(built.length / 1024 ** 2).toFixed(2)} → ${(compressed.length / 1024 ** 2).toFixed(2)} MiB (gzip); SHA-256 identisk. Alle filer er højst 25 MiB.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await packPdfMotor(resolve(process.argv[2] ?? 'dist'));
