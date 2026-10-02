import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { formulaHtmlNodes, formulaLayout, layoutText } from '../../src/ui/formula/layout.ts';
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
    const formulae = summary.locator('.kob-formel');
    await expect(formulae).toHaveCount(2);
    await expect(formulae.nth(0)).toHaveAttribute(
      'data-formula-text',
      layoutText(formulaLayout([expected(id).code])),
    );
    await expect(formulae.nth(1)).toHaveAttribute(
      'data-formula-text',
      layoutText(formulaLayout(formulaHtmlNodes(expected(id).factor_html))),
    );
    await expect(formulae.locator('[data-formula-fallback]')).toHaveCount(0);
    expect(await formulae.nth(0).locator('math mfrac').count()).toBeGreaterThan(0);
    expect(await formulae.nth(1).locator('math msub').count()).toBeGreaterThan(0);
    // Check actual displayed tokens too: the reconstructed-text attribute alone is insufficient.
    const last = formulae.nth(1).locator('.formula-equation').last();
    const expectedResult = expected(id).factor_html.match(
      /= ([+−][\d,]+) = ([+−][\d,]+) %<\/div>$/,
    );
    expect(await last.locator('mn').allTextContents()).toEqual([
      expectedResult[1],
      expectedResult[2],
    ]);
    await expect(last.locator('mtext')).toHaveText('%');
    for (let i = 0; i < 2; i++) await expect(formulae.nth(i)).toHaveAttribute('tabindex', '0');
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
