import { test, expect } from '@playwright/test';

// B-084: appen skriver MPa, hvor originalen skrev MN/m² (1 MPa = 1 MN/m²).
test('B-084: siderne skriver MPa og ikke MN/m²', async ({ page }) => {
  await page.goto('/#dimensionering');
  await expect(page.getByRole('img', { name: 'Personligt designdiagram' })).toContainText(
    'Bundmodul Eᵤ [MPa]',
  );
  await expect(page.locator('main')).not.toContainText('MN/m²');

  await page.goto('/#diagrammer');
  await expect(page.locator('.raw-chart svg')).toContainText('Bundmodul Eᵤ [MPa]');
  await expect(page.locator('main')).not.toContainText('MN/m²');

  await page.goto('/#vejdim');
  await expect(page.locator('main')).toContainText(/ved Eᵤ = \d+ MPa/);
  await expect(page.locator('main')).not.toContainText('MN/m²');

  await page.goto('/#hjaelp');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('MN/m²');
});
