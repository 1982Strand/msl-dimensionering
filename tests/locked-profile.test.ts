import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultProfileState, lockedProfileState } from '../src/report/company-profile.ts';

test('B-076: låst profil er standardprofilen med brugerens eget kartotek; den gemte profil røres ikke', () => {
  const stored = defaultProfileState();
  stored.profile.slogan = 'Eget slogan';
  stored.profile.farve = '#123456';
  stored.profile.medarbejdere = [
    { navn: 'Kollega Eksempel', initialer: 'KE', mail: 'ke@example.com', telefon: '12345678' },
  ];
  stored.logo = { mime: 'image/png', bytes: new Uint8Array([1, 2, 3]) };
  const before = structuredClone(stored);

  const locked = lockedProfileState(stored);
  const standard = defaultProfileState();
  assert.deepEqual(locked.profile, {
    ...standard.profile,
    medarbejdere: stored.profile.medarbejdere,
  });
  assert.equal(locked.logo, null);
  // Kartoteket er en kopi; den gemte tilstand er uændret.
  assert.notEqual(locked.profile.medarbejdere, stored.profile.medarbejdere);
  assert.deepEqual(stored, before);
});
