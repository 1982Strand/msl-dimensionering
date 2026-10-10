import { test, expect } from '@playwright/test';

const shared = process.env.TEST_SHARED === '1';

test('profilvisning følger udgaven og henter ingen loginoplysninger', async ({ page }) => {
  const authRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/.auth/')) authRequests.push(request.url());
  });
  await page.goto('/#rapport');
  await page.getByRole('tab', { name: /^(Firmaprofil|Medarbejdere)$/ }).click();
  await expect(page.getByTestId('profile-save-state')).toHaveAttribute('data-state', 'saved');

  if (shared) {
    await expect(page.getByRole('tab', { name: 'Medarbejdere', exact: true })).toBeVisible();
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
  } else {
    const slogan = page.getByLabel('Slogan under logoet', { exact: true });
    await expect(slogan).toBeEnabled();
    await slogan.fill('Eget slogan');
    await slogan.press('Tab');
    await expect(page.getByTestId('profile-save-state')).toHaveAttribute('data-state', 'saved');
    await page.reload();
    await expect(slogan).toHaveValue('Eget slogan');
    await expect(page.getByRole('button', { name: 'Eksportér profil' })).toBeVisible();
  }
  await expect(
    page.getByRole('button', { name: /Tilføj medarbejder|Tilføj person/ }).first(),
  ).toBeEnabled();
  expect(authRequests).toEqual([]);
});
