import { chooseProduct } from './helpers/choose-product.ts';
import { test, expect } from '@playwright/test';

test('M3/B-066: coloured status Hover Cards, FIG-003 recommendation and execution requirements', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#dimensionering');
  // B-067: originalens tegn ⚠/ⓘ står som farvede ikoner; teksten er ellers modellens.
  await expect(page.locator('.bg-resultat-status')).toHaveText('1 anbefaling');
  await expect(page.locator('.bg-resultat-status')).toBeVisible();
  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  await page.locator('#bd_eu_slider').focus();
  await page.locator('#bd_eu_slider').press('Home');
  for (let i = 1; i < 5; i++) await page.locator('#bd_eu_slider').press('ArrowRight');
  await chooseProduct(page, 'bd', 'Tensar InterAx NX850');

  const status = page.locator('.bg-resultat-status');
  await expect(status).toHaveText('1 kontrolpunkt1 anbefaling');
  const warningTrigger = status.locator('[aria-label="Kontrolpunkter"]');
  const infoTrigger = status.locator('[aria-label="Anbefalinger"]');
  const warningIcon = warningTrigger.locator('svg.lucide-triangle-alert');
  const infoIcon = infoTrigger.locator('svg.lucide-info');
  await expect(warningIcon).toHaveAttribute('aria-hidden', 'true');
  await expect(warningIcon).toHaveCSS('color', 'rgb(130, 99, 32)');
  await expect(infoIcon).toHaveAttribute('aria-hidden', 'true');
  await expect(infoIcon).toHaveCSS('color', 'rgb(37, 88, 74)');
  const warningCard = page.locator('.hint-content-warning');
  const infoCard = page.locator('.hint-content-info');
  const warningText =
    "Produktet 'Tensar InterAx NX850' er anbefalet til belastningsklasse 5-6, men der er valgt belastningsklasse 4.";
  const infoText =
    'Mindst mulige bærelagstykkelse med 1 lag geonet er 700 mm, og under optimale forhold helt ned til 600 mm (Tensar InterAx NX850). Ved opbygninger over 500 mm kan der med fordel anvendes 2 lag net for yderligere reduktion — her: 650 mm, og under optimale forhold 550 mm (Tensar InterAx NX850).';
  await expect(warningTrigger).toHaveAttribute('tabindex', '0');
  await expect(infoTrigger).toHaveAttribute('tabindex', '0');
  await expect(status.locator('[title]')).toHaveCount(0);
  await warningTrigger.hover();
  await expect(warningCard).toBeVisible();
  await expect(warningCard).toHaveText(warningText);
  await expect(warningCard).toHaveCSS('background-color', 'rgb(255, 246, 223)');
  await expect(infoCard).toHaveCount(0);
  await page.mouse.move(0, 0);
  await expect(warningCard).toHaveCount(0);
  await infoTrigger.hover();
  await expect(infoCard).toBeVisible();
  await expect(infoCard).toHaveText(infoText);
  await expect(infoCard).toHaveCSS('background-color', 'rgb(237, 243, 239)');
  await expect(warningCard).toHaveCount(0);
  // Beskederne må ikke have egne Hover Card-udløsere eller native title-hjælp.
  await expect(
    infoCard.locator('[data-slot="hover-card-trigger"], [tabindex], [title]'),
  ).toHaveCount(0);
  await page.mouse.move(0, 0);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  // The slot is immediately after the cards and before the product list.
  expect(
    await page
      .locator('.dim-results')
      .evaluate((el) => Boolean(el.nextElementSibling?.querySelector('.bg-resultat-status'))),
  ).toBeTruthy();
  await expect(page.getByRole('button', { name: /^Kontrolpunkter og anbefalinger/ })).toHaveCount(
    0,
  );
  const requirements = page.getByRole('button', { name: 'Udførelseskrav', exact: true });
  await expect(requirements).toHaveAttribute('aria-expanded', 'false');
  // Tab fra kontrolpunktet skal nå anbefalingen og åbne dens kort.
  await warningTrigger.focus();
  await expect(warningCard).toHaveText(warningText);
  await page.keyboard.press('Tab');
  await expect(infoTrigger).toBeFocused();
  await expect(infoCard).toHaveText(infoText);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await requirements.click();
  await expect(requirements).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.result-checks')).toContainText(
    'Direkte kørsel på udlagt geonet er ikke tilladt',
  );
  await expect(page.locator('.result-checks')).toContainText(
    'Minimum overlæg ved samlinger: 300 mm (Eᵤ ≥ 5 MPa)',
  );
  await requirements.click();
  await expect(requirements).toHaveAttribute('aria-expanded', 'false');
  // FIG-003-DAEKLAG har to anbefalinger; begge skal stå i samme grønne kort.
  await page.getByRole('link', { name: 'Indstillinger', exact: true }).click();
  await page.getByRole('radio', { name: 'Ved nettets mindste dæklag', exact: true }).check();
  await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
  await expect(status).toHaveText('1 kontrolpunkt2 anbefalinger');
  await infoTrigger.hover();
  await expect(infoCard.locator('.result-status-hint > div')).toHaveText([
    'Tensar InterAx NX850: Afstanden mellem geonetlagene er 450 mm. Anbefalingen for bedst effekt er højst 400 mm for Tensar ved 2 lag geonet.',
    infoText,
  ]);
  await expect(page.getByRole('tooltip')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('M3/B-066: no checks or recommendations removes status and caption, keeps requirements', async ({
  page,
}) => {
  // LT-1: originalens gyldige kombination uden kontrolpunkter eller anbefalinger.
  await page.goto('/#indstillinger');
  await page
    .getByRole('radio', {
      name: "Lagene gøres mindst så tykke som VD's mindste lagtykkelse",
      exact: true,
    })
    .check();
  await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  await page.locator('#bd_eu_slider').focus();
  await page.locator('#bd_eu_slider').press('Home');
  for (let i = 1; i < 15; i++) await page.locator('#bd_eu_slider').press('ArrowRight');
  await expect(page.locator('#bd_eu_slider')).toHaveAttribute('aria-valuenow', '15');
  await page.getByRole('radio', { name: '3', exact: true }).check();
  await chooseProduct(page, 'bd', 'Tensar TriAx TX160');
  await expect(page.locator('.dim-results')).toBeVisible();
  await expect(page.locator('.bg-resultat-status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Kontrolpunkter og anbefalinger/ })).toHaveCount(
    0,
  );
  await expect(page.getByText('Ingen kontrolpunkter for den valgte Eᵤ og belastning.')).toHaveCount(
    0,
  );
  const requirements = page.getByRole('button', { name: 'Udførelseskrav', exact: true });
  await expect(requirements).toHaveAttribute('aria-expanded', 'false');
  await requirements.click();
  await expect(page.locator('.result-checks')).toContainText(
    'Direkte kørsel på udlagt geonet er ikke tilladt',
  );
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
  await expect(page.getByRole('button', { name: /^Kontrolpunkter og anbefalinger/ })).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: 'Udførelseskrav', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
