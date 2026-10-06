import { test, expect, type Page } from '@playwright/test';

// B-076/B-080: i den delte udgave (Azure) oplyser /.auth/me brugerens roller. Lokalt findes adressen
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
  // Fanen hedder »Medarbejdere«, når profilen er skjult (B-080).
  await page.getByRole('tab', { name: /^(Firmaprofil|Medarbejdere)$/ }).click();
  await expect(page.getByTestId('profile-save-state')).toHaveAttribute('data-state', 'saved');
}

test('B-076/B-080: firmaprofilen er skjult for medarbejdere og åben for admin; kartoteket er altid åbent', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const slogan = page.getByLabel('Slogan under logoet', { exact: true });

  // Admin ændrer sloganet; det gemmes i browseren.
  await openProfile(page, ['admin']);
  await expect(page.getByRole('tab', { name: 'Firmaprofil', exact: true })).toBeVisible();
  await expect(slogan).toBeEnabled();
  await slogan.fill('Eget slogan');
  await slogan.press('Tab');
  await expect(page.getByTestId('profile-save-state')).toHaveAttribute('data-state', 'saved');

  // Medarbejder: kun kartoteket vises; logo, identitet, tekster og profilhandlinger findes ikke.
  await openProfile(page, ['medarbejder']);
  await expect(page.getByRole('tab', { name: 'Medarbejdere', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Firmaprofil', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('profile-save-state')).toHaveText('Kartotek gemt i denne browser');
  await expect(slogan).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Aktuelt firmalogo' })).toHaveCount(0);
  for (const name of [
    'Vælg logo …',
    'Nulstil firmaprofil til standard',
    'Eksportér profil',
    'Importér profil …',
  ])
    await expect(page.getByRole('button', { name })).toHaveCount(0);
  // Kun ét kort (kartoteket, nummer 1) i stedet for otte.
  const cards = page.locator('.company-profile-grid h2');
  await expect(cards).toHaveCount(1);
  await expect(cards).toHaveText(/^1\s*Medarbejdere$/);
  await expect(page.getByText('Rapporterne bruger firmaets standardprofil.')).toBeVisible();
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
