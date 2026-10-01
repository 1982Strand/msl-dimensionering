import { test, expect } from '@playwright/test';

test('Hjælp: kapitler, formler, figurer, gå-til og gemte åbne kapitler', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#hjaelp');
  await expect(
    page.getByRole('heading', { name: 'Hjælp og dokumentation', exact: true }),
  ).toBeVisible();
  const first = page.getByRole('button', { name: 'Luk kapitel 1: Beregningsmetoden', exact: true });
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Figur 1.1', { exact: true })).toBeVisible();
  await expect(page.getByTestId('help-formula').first()).toBeVisible();
  await expect(page.getByTestId('help-formula').first().locator('sub').first()).toHaveText(
    'ubundet',
  );
  const second = page.getByRole('button', { name: /^Læs kapitel 2:/ });
  await second.click();
  await expect(page.getByRole('button', { name: /^Luk kapitel 2:/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  await page.reload();
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: /^Luk kapitel 2:/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await page.mouse.move(0, 0);
  await page.getByRole('button', { name: 'Eᵤ', exact: true }).hover();
  await expect(page.getByRole('tooltip')).toHaveText(
    'Underbundens E-modul [MN/m²]. Angives i dimensioneringen.',
  );
  await page
    .getByRole('link', { name: 'Gå til Trafikklasse-korrelation', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/#vejdim$/);
  await page.getByRole('link', { name: 'Hjælp og dokumentation', exact: true }).click();
  await expect(first).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: /^Luk kapitel 2:/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  const section = page
    .locator('.help-section')
    .filter({ has: page.getByText('Figur 1.1', { exact: true }) });
  const columns = section.locator(':scope > div');
  const left = await columns.nth(0).boundingBox();
  const right = await columns.nth(1).boundingBox();
  expect(right!.y).toBeGreaterThanOrEqual(left!.y + left!.height);
  await first.click();
  await page.getByRole('button', { name: /^Luk kapitel 2:/ }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: /^Læs kapitel 1:/ })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.getByRole('button', { name: /^Læs kapitel 2:/ })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  expect(errors).toEqual([]);
});
