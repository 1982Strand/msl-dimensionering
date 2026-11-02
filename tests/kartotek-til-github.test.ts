import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readEmployeeSecret,
  sendEmployeeSecret,
  MAX_SECRET_BYTES,
} from '../tools/kartotek-til-github.ts';

const employees = [
  { navn: 'Ada Eksempel', initialer: 'AE', mail: 'ada@example.com', telefon: '00000001' },
];

test('GitHub-kommandoen sender kompakt JSON på stdin uden at returnere indholdet', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'msl-kartotek-'));
  try {
    const file = join(directory, 'liste.json');
    await writeFile(file, JSON.stringify(employees));
    let captured: { command: string; args: string[]; input: string } | undefined;
    const count = await sendEmployeeSecret(file, (command, args, input) => {
      captured = { command, args, input };
      return { status: 0 };
    });
    assert.equal(count, 1);
    assert.deepEqual(captured, {
      command: 'gh',
      args: ['secret', 'set', 'MEDARBEJDERE_JSON', '--repo', '1982Strand/msl-dimensionering'],
      input: JSON.stringify(employees),
    });
    assert.equal(JSON.stringify(count).includes('Ada Eksempel'), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('GitHub-kommandoen afviser filer over 48 KB og ugyldige data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'msl-kartotek-'));
  try {
    const large = join(directory, 'stor.json');
    await writeFile(large, ' '.repeat(MAX_SECRET_BYTES + 1));
    await assert.rejects(readEmployeeSecret(large), /48 KB/);
    const invalid = join(directory, 'ugyldig.json');
    await writeFile(invalid, JSON.stringify([{ navn: 'Ugyldig' }]));
    await assert.rejects(readEmployeeSecret(invalid), /Kartoteket er ugyldigt/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
