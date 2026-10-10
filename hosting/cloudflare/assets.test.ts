import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkDistSizes, MAX_FILE_BYTES } from './check-assets.ts';

test('filgrænsen omfatter undermapper og tillader præcis 25 MiB', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'msl-hosting-'));
  try {
    const assets = join(directory, 'assets');
    await mkdir(assets);
    const path = join(assets, 'anden-fil.bin');
    await writeFile(path, Buffer.alloc(MAX_FILE_BYTES));
    await checkDistSizes(directory);
    await writeFile(path, Buffer.alloc(MAX_FILE_BYTES + 1));
    await assert.rejects(checkDistSizes(directory), /anden-fil\.bin.*25 MiB/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
