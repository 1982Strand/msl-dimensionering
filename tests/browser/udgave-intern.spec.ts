import { test, expect } from '@playwright/test';

// Køres mod dist-intern (VITE_UDGAVE=intern), se playwright.config.ts.
test('intern udgave: firmaprofilen er skjult, og der hentes ingen loginoplysninger', async ({
  page,
}) => {
  const authRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/.auth/')) authRequests.push(request.url());
  });
  await page.goto('/#rapport');
  await page.getByRole('tab', { name: 'Medarbejdere', exact: true }).click();
  await expect(page.getByTestId('profile-save-state')).toHaveAttribute('data-state', 'saved');

  await expect(page.getByRole('tab', { name: 'Firmaprofil', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Slogan under logoet', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Aktuelt firmalogo' })).toHaveCount(0);
  for (const name of [
    'Vælg logo …',
    'Nulstil firmaprofil til standard',
    'Eksportér profil',
    'Importér profil …',
  ])
    await expect(page.getByRole('button', { name })).toHaveCount(0);
  await expect(page.locator('.company-profile-grid h2')).toHaveCount(1);
  await expect(page.getByText('Rapporterne bruger firmaets standardprofil.')).toBeVisible();
  expect(authRequests).toEqual([]);
});
