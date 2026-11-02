import { test, expect } from '@playwright/test';

// Den interne udgaves profilvisning afprøves i udgave-intern.spec.ts.
test('profilvisning følger udgaven og henter ingen loginoplysninger', async ({ page }) => {
  const authRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/.auth/')) authRequests.push(request.url());
  });
  await page.goto('/#rapport');
  await page.getByRole('tab', { name: 'Firmaprofil', exact: true }).click();
  await expect(page.getByTestId('profile-save-state')).toHaveAttribute('data-state', 'saved');

  const slogan = page.getByLabel('Slogan under logoet', { exact: true });
  await expect(slogan).toBeEnabled();
  await slogan.fill('Eget slogan');
  await slogan.press('Tab');
  await expect(page.getByTestId('profile-save-state')).toHaveAttribute('data-state', 'saved');
  await page.reload();
  await expect(slogan).toHaveValue('Eget slogan');
  await expect(page.getByRole('button', { name: 'Eksportér profil' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Tilføj medarbejder|Tilføj person/ }).first(),
  ).toBeEnabled();
  expect(authRequests).toEqual([]);
});
