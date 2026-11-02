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

test('GitHub-kommandoen afviser lister over 48 KB og ugyldige data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'msl-kartotek-'));
  const person = (i: number) => ({
    navn: 'Person ' + i,
    initialer: 'P' + i,
    mail: 'person' + i + '@example.com',
    telefon: '0000' + i,
  });
  try {
    const large = join(directory, 'stor.json');
    const many = Array.from({ length: 1000 }, (_, i) => person(i));
    assert.ok(Buffer.byteLength(JSON.stringify(many)) > MAX_SECRET_BYTES);
    await writeFile(large, JSON.stringify(many));
    await assert.rejects(readEmployeeSecret(large), /48 KB/);
    // En eksporteret profil med stort logo godtages, når selve listen er lille.
    const profile = join(directory, 'profil.json');
    await writeFile(
      profile,
      JSON.stringify({ logo: 'x'.repeat(MAX_SECRET_BYTES * 2), medarbejdere: [person(1)] }),
    );
    assert.deepEqual(await readEmployeeSecret(profile), [person(1)]);
    const invalid = join(directory, 'ugyldig.json');
    await writeFile(invalid, JSON.stringify([{ navn: 'Ugyldig' }]));
    await assert.rejects(readEmployeeSecret(invalid), /Kartoteket er ugyldigt/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
