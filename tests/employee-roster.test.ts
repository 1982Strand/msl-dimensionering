import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import {
  defaultProfileState,
  exportCompanyProfile,
  readEmbeddedEmployees,
  validateEmployees,
} from '../src/report/company-profile.ts';
import { readEmployeeList, buildEdition } from '../tools/build-udgave.ts';

const fixture = new URL('./fixtures/medarbejdere-syntetisk.json', import.meta.url);
const employees = JSON.parse(await readFile(fixture, 'utf8'));

test('appen læser og kontrollerer indbygget kartotek og bruger tom liste ved fejl eller fravær', () => {
  assert.deepEqual(readEmbeddedEmployees(JSON.stringify(employees)), employees);
  assert.deepEqual(readEmbeddedEmployees(undefined), []);
  assert.deepEqual(readEmbeddedEmployees('{'), []);
  assert.deepEqual(readEmbeddedEmployees(JSON.stringify([{ navn: 'Ugyldig' }])), []);
});

test('bygningen læser ren liste og eksporteret firmaprofil fra filer', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'msl-byggekartotek-'));
  try {
    const list = join(directory, 'liste.json');
    const profile = join(directory, 'profil.json');
    await writeFile(list, JSON.stringify(employees));
    // Samme fil som »Eksportér profil«: medarbejderne ligger i profile.medarbejdere.
    const state = defaultProfileState();
    state.profile.medarbejdere = employees;
    const logo = {
      mime: 'image/jpeg' as const,
      bytes: new Uint8Array(
        readFileSync(new URL('../public/report/logo/byggros_logo.jpeg', import.meta.url)),
      ),
    };
    await writeFile(profile, exportCompanyProfile(state, logo));
    assert.deepEqual(await readEmployeeList({ file: list }), employees);
    assert.deepEqual(await readEmployeeList({ file: profile }), employees);
    assert.deepEqual(await readEmployeeList({ environment: JSON.stringify(employees) }), employees);
    assert.deepEqual(
      await readEmployeeList({ environment: JSON.stringify({ medarbejdere: employees }) }),
      employees,
    );
    assert.deepEqual(await readEmployeeList({}), undefined);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('bygningen afviser ugyldigt kartotek uden at vise indholdet', async () => {
  const privateText = 'hemmelig-opdigtet-person';
  assert.equal(validateEmployees([{ navn: privateText }]) !== null, true);
  await assert.rejects(
    readEmployeeList({ environment: JSON.stringify([{ navn: privateText }]) }),
    (error: Error) => {
      assert.match(error.message, /Kartoteket er ugyldigt/);
      assert.doesNotMatch(error.message, new RegExp(privateText));
      return true;
    },
  );
  const directory = await mkdtemp(join(tmpdir(), 'msl-byggekartotek-'));
  try {
    const invalid = join(directory, 'ugyldig.json');
    await writeFile(invalid, JSON.stringify([{ navn: privateText }]));
    await assert.rejects(readEmployeeList({ file: invalid }), /Kartoteket er ugyldigt/);
    await writeFile(invalid, '{');
    await assert.rejects(readEmployeeList({ file: invalid }), /ikke gyldig JSON/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('offentlig bygning afviser fil til kartotek', async () => {
  await assert.rejects(
    buildEdition('offentlig', { file: 'kartotek.json' }),
    /kan ikke bygges med et kartotek/,
  );
});
