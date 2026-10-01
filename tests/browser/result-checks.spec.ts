import { test, expect } from '@playwright/test';

test('M3: status, closed expanders, FIG-003 recommendation and execution requirements', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#dimensionering');
  await expect(page.locator('.bg-resultat-status')).toHaveText('ⓘ 1 anbefaling');
  await expect(page.locator('.bg-resultat-status')).toBeVisible();
  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  await page.locator('#bd_eu_slider').focus();
  await page.locator('#bd_eu_slider').press('Home');
  for (let i = 1; i < 5; i++) await page.locator('#bd_eu_slider').press('ArrowRight');
  const productLabel = await page
    .locator('#bd_geonet option')
    .filter({ hasText: 'Tensar InterAx NX850' })
    .innerText();
  await page.locator('#bd_geonet').selectOption({ label: productLabel });

  const status = page.locator('.bg-resultat-status');
  await expect(status).toHaveText('⚠ 1 kontrolpunktⓘ 1 anbefaling');
  await expect(status.locator('[aria-label="Kontrolpunkter"]')).toHaveAttribute(
    'title',
    "Der er 1 kontrolpunkt. Fold 'Kontrolpunkter og anbefalinger' ud længere nede på siden for at se detaljerne.",
  );
  // The slot is immediately after the cards and before the product list.
  expect(
    await page
      .locator('.dim-results')
      .evaluate((el) => Boolean(el.nextElementSibling?.querySelector('.bg-resultat-status'))),
  ).toBeTruthy();
  const checks = page.getByRole('button', {
    name: 'Kontrolpunkter og anbefalinger · 1 kontrolpunkt · 1 anbefaling',
    exact: true,
  });
  const requirements = page.getByRole('button', { name: 'Udførelseskrav', exact: true });
  await expect(checks).toHaveAttribute('aria-expanded', 'false');
  await expect(requirements).toHaveAttribute('aria-expanded', 'false');
  await checks.click();
  await expect(checks).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.result-check-info')).toHaveText(
    'Mindst mulige bærelagstykkelse med 1 lag geonet er 700 mm, og under optimale forhold helt ned til 600 mm (Tensar InterAx NX850). Ved opbygninger over 500 mm kan der med fordel anvendes 2 lag net for yderligere reduktion — her: 650 mm, og under optimale forhold 550 mm (Tensar InterAx NX850).',
  );
  await expect(page.locator('.result-check-warning')).toHaveText(
    "Produktet 'Tensar InterAx NX850' er anbefalet til belastningsklasse 5-6, men der er valgt belastningsklasse 4.",
  );
  await requirements.click();
  await expect(requirements).toHaveAttribute('aria-expanded', 'true');
  await expect(checks).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.result-checks')).toContainText(
    'Direkte kørsel på udlagt geonet er ikke tilladt',
  );
  await expect(page.locator('.result-checks')).toContainText(
    'Minimum overlæg ved samlinger: 300 mm (Eᵤ ≥ 5 MPa)',
  );
  await checks.click();
  await expect(checks).toHaveAttribute('aria-expanded', 'false');
  expect(errors).toEqual([]);
});

test('M3: rejected OUT-1 has neither status nor information expanders', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#dimensionering');
  await page.getByRole('radio', { name: 'Trafikklasse', exact: true }).check();
  await page.getByRole('radio', { name: 'T1', exact: true }).check();
  await expect(page.getByText(/Beregningen afvises efter Indstillinger/)).toBeVisible();
  await expect(page.locator('.bg-resultat-status')).toHaveCount(0);
  await expect(page.locator('.result-checks')).toHaveCount(0);
  expect(errors).toEqual([]);
});
