import { test, expect } from '@playwright/test';

// Køres mod dist-offentlig (VITE_UDGAVE=offentlig), se playwright.config.ts.
test('offentlig udgave: appen åbner på Dimensionering', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Dimensionering', exact: true, level: 1 }),
  ).toBeVisible();
});
