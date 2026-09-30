import { test, expect } from '@playwright/test';

test('M1: initially closed, four load steps, six traffic steps, rejection and no page errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#dimensionering');
  const section = page.locator('details.coupling-explanation');
  await expect(section).toHaveCount(1);
  await expect(section).not.toHaveAttribute('open');
  await expect(section.locator('summary')).toHaveText(
    'Sådan er resultatet beregnet · fra belastningsklasse 4 til 650 mm bærelag',
  );
  await section.locator('summary').click();
  await expect(section).toHaveAttribute('open', '');
  await expect(section.locator('.coupling-step')).toHaveCount(4);
  await expect(section.getByText('Figur følger', { exact: true })).toHaveCount(1);
  await expect(
    section.getByRole('heading', { name: 'Reduktion med geonet', exact: true }),
  ).toBeVisible();
  await page.getByRole('radio', { name: 'Trafikklasse', exact: true }).check();
  await page.getByRole('radio', { name: 'T4', exact: true }).check();
  await expect(section.locator('.coupling-step')).toHaveCount(6);
  await expect(section.getByText('Figur følger', { exact: true })).toHaveCount(2);
  await expect(section.locator('summary')).toHaveText(
    'Sådan er resultatet beregnet · fra trafikklasse T4 til 700 mm bærelag',
  );
  await section.locator('summary').click();
  await expect(section).not.toHaveAttribute('open');
  await section.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(section).toHaveAttribute('open', '');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('radio', { name: 'T1', exact: true }).check();
  await expect(section).toHaveCount(0);
  expect(errors).toEqual([]);
});
