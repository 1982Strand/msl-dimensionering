import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const reference = JSON.parse(
  readFileSync(new URL('../../reference/phi-summary.json', import.meta.url), 'utf8'),
);
const expected = (id: string) => reference.cases.find((c: { id: string }) => c.id === id).expected;

test('M6 preserves active formulas, manual value, rounding, reload and small-screen layout', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#dimensionering');
  const summary = page.getByRole('complementary', { name: 'φᵥ-korrektion' });
  await expect(summary).toHaveCount(0);
  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  await expect(summary).toBeVisible();
  const verify = async (id: string) => {
    expect(await summary.locator('pre').textContent()).toBe(expected(id).code);
    expect(await summary.locator('.kob-formel').evaluate((e) => e.outerHTML)).toBe(
      expected(id).factor_html,
    );
  };
  await verify('FIG-003-custom-interval');
  await page.getByRole('checkbox', { name: 'Overskriv φᵥ manuelt' }).check();
  await page.locator('#bd_phi_man').fill('40');
  await page.locator('#bd_phi_man').press('Tab');
  await verify('PH1-manual40');
  await page.getByRole('checkbox', { name: 'Overskriv φᵥ manuelt' }).uncheck();
  await page.getByRole('link', { name: 'Indstillinger', exact: true }).click();
  await page.getByRole('radio', { name: 'Nedrunding til hel grad', exact: true }).check();
  await page.getByRole('radio', { name: 'cm', exact: true }).check();
  await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
  await verify('M6-round-down');
  await page.reload();
  await verify('M6-round-down');
  await page.setViewportSize({ width: 600, height: 900 });
  await expect(summary).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('radio', { name: 'Trafikklasse', exact: true }).check();
  await page.getByRole('radio', { name: 'T1', exact: true }).check();
  await expect(summary).toHaveCount(0);
  expect(errors).toEqual([]);
});
