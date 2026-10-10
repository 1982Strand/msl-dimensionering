import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { unpackPdfMotor } from '../src/report/pdf-motor.ts';
import { packPdfMotor, compilerWasm } from '../tools/pak-pdf-motor.ts';

test('byggetrinnet erstatter motoren med byte-identisk gzip', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'msl-pdf-motor-'));
  try {
    const assets = join(directory, 'assets');
    await mkdir(assets);
    const original = await readFile(compilerWasm);
    const wasmPath = join(assets, 'typst_ts_web_compiler_bg-test.wasm');
    await writeFile(wasmPath, original);
    await packPdfMotor(directory);
    assert.deepEqual(await readdir(assets), ['typst_ts_web_compiler_bg-test.wasm.gz']);
    const restored = await unpackPdfMotor(new Response(await readFile(`${wasmPath}.gz`)));
    const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha256(restored), sha256(original));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('udpakning virker også efter HTTP-udpakning og afviser HTTP-fejl, HTML og beskadiget gzip', async () => {
  const wasm = Uint8Array.from([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]);
  assert.deepEqual(await unpackPdfMotor(new Response(wasm)), wasm);
  assert.deepEqual(await unpackPdfMotor(new Response(gzipSync(wasm))), wasm);
  await assert.rejects(unpackPdfMotor(new Response('', { status: 403 })), /HTTP 403/);
  await assert.rejects(unpackPdfMotor(new Response('<html>Login</html>')), /gyldig WASM/);
  const truncated = gzipSync(wasm).subarray(0, 12);
  await assert.rejects(unpackPdfMotor(new Response(truncated)), /gzip-fil kunne ikke pakkes ud/);
});
