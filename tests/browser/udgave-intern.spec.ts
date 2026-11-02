import { test, expect } from '@playwright/test';

test('intern udgave: ingen firmaprofilfaner eller profilfunktioner, og intet login', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { profileKeys: [] as string[], profileDatabaseOpened: false };
    (window as unknown as { __profilStorage: typeof state }).__profilStorage = state;
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (this === localStorage && key === 'msl.company-profile.v1') state.profileKeys.push('get');
      return getItem.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage && key === 'msl.company-profile.v1') state.profileKeys.push('set');
      return setItem.call(this, key, value);
    };
    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = ((name: string | IDBDatabase, version?: number) => {
      if (name === 'msl-company-profile') state.profileDatabaseOpened = true;
      return open(name as string, version);
    }) as typeof indexedDB.open;
  });
  const authRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/.auth/')) authRequests.push(request.url());
  });
  await page.goto('/#rapport');

  await expect(page.getByRole('radio', { name: 'Dansk', exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Svensk', exact: true })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByText('Firmaprofil', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Medarbejdere', { exact: true })).toHaveCount(0);
  await expect(page.locator('.company-profile-grid')).toHaveCount(0);
  await expect(page.getByLabel('Slogan under logoet', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Aktuelt firmalogo' })).toHaveCount(0);
  for (const name of [
    'Vælg logo …',
    'Nulstil firmaprofil til standard',
    'Eksportér profil',
    'Importér profil …',
  ])
    await expect(page.getByRole('button', { name })).toHaveCount(0);
  await expect(page.getByLabel('Rapporttitel', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Vælg fra kartotek …').first()).toBeVisible();
  const storage = await page.evaluate(
    () =>
      (
        window as unknown as {
          __profilStorage: { profileKeys: string[]; profileDatabaseOpened: boolean };
        }
      ).__profilStorage,
  );
  expect(storage).toEqual({ profileKeys: [], profileDatabaseOpened: false });
  expect(authRequests).toEqual([]);
});

test('intern udgave: testkartoteket udfylder felter, der fortsat kan redigeres', async ({
  page,
}) => {
  await page.goto('/#rapport');
  const selector = page.getByLabel('Vælg fra kartotek …').first();
  await expect(selector).toBeVisible();
  await selector.click();
  await expect(page.getByRole('option', { name: 'BP – Bertil Prøve', exact: true })).toBeVisible();
  await page.getByRole('option', { name: 'AE – Ada Eksempel', exact: true }).click();
  await expect(page.getByLabel('Sagsbehandler', { exact: true })).toHaveValue('Ada Eksempel');
  await expect(page.getByLabel('Sagsbehandler-initialer', { exact: true })).toHaveValue('AE');
  await expect(page.getByLabel('Sagsbehandler-mail', { exact: true })).toHaveValue(
    'ada@example.com',
  );
  await page.getByLabel('Sagsbehandler', { exact: true }).fill('Egen tekst');
  await expect(page.getByLabel('Sagsbehandler', { exact: true })).toHaveValue('Egen tekst');
  await page.reload();
  await expect(page.getByLabel('Sagsbehandler', { exact: true })).toHaveValue('Egen tekst');
});
