import { test, expect, type Page } from '@playwright/test';

// B-076: i den delte udgave (Azure) oplyser /.auth/me brugerens roller. Lokalt findes adressen
// ikke, og alt er åbent. Her efterlignes Azures svar.
const me = (roles: string[]) => ({
  clientPrincipal: {
    identityProvider: 'aad',
    userId: 'x',
    userDetails: 'kollega@example.com',
    userRoles: ['anonymous', 'authenticated', ...roles],
  },
});
async function openProfile(page: Page, roles: string[] | null) {
  await page.unrouteAll();
  if (roles) await page.route('**/.auth/me', (route) => route.fulfill({ json: me(roles) }));
  // Ny indlæsning, så rollerne hentes igen (samme #-adresse genindlæser ikke siden).
  await page.goto('about:blank');
  await page.goto('/#rapport');
  await page.getByRole('tab', { name: 'Firmaprofil' }).click();
  await expect(page.getByTestId('profile-save-state')).toHaveAttribute('data-state', 'saved');
}

test('B-076: firmaprofilen er låst for medarbejdere og åben for admin; kartoteket er altid åbent', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const slogan = page.getByLabel('Slogan under logoet', { exact: true });

  // Admin ændrer sloganet; det gemmes i browseren.
  await openProfile(page, ['admin']);
  await expect(slogan).toBeEnabled();
  const standard = await slogan.inputValue();
  await slogan.fill('Eget slogan');
  await slogan.press('Tab');
  await expect(page.getByTestId('profile-save-state')).toHaveAttribute('data-state', 'saved');

  // Medarbejder: standardprofilen vises låst; import/eksport/nulstilling findes ikke.
  await openProfile(page, ['medarbejder']);
  await expect(slogan).toBeDisabled();
  await expect(slogan).toHaveValue(standard);
  await expect(page.getByRole('button', { name: 'Vælg logo …' })).toBeDisabled();
  for (const name of ['Nulstil firmaprofil til standard', 'Eksportér profil', 'Importér profil …'])
    await expect(page.getByRole('button', { name })).toHaveCount(0);
  await expect(page.getByText('Firmaprofilen kan kun ændres af en administrator')).toBeVisible();
  // Kartoteket kan stadig redigeres.
  const add = page.getByRole('button', { name: /Tilføj medarbejder|Tilføj person/ });
  await expect(add.first()).toBeEnabled();

  // Admin igen: den gemte profil er urørt.
  await openProfile(page, ['admin']);
  await expect(slogan).toHaveValue('Eget slogan');
  await expect(page.getByRole('button', { name: 'Eksportér profil' })).toBeVisible();

  // Lokalt (ingen /.auth/me): alt er åbent som hidtil.
  await openProfile(page, null);
  await expect(slogan).toBeEnabled();
  await expect(slogan).toHaveValue('Eget slogan');
  expect(errors).toEqual([]);
});
