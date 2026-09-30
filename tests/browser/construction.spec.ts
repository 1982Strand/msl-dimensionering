import { test, expect, type Page } from '@playwright/test';
async function nx850(page: Page, prefix: string) {
  const field = page.locator(`#${prefix}_geonet`);
  await field.selectOption({
    label: await field.locator('option').filter({ hasText: 'Tensar InterAx NX850' }).innerText(),
  });
}
async function eu(page: Page, prefix: string) {
  const field = page.locator(`#${prefix}_eu_slider`);
  await field.focus();
  await field.press('Home');
  for (let i = 1; i < 5; i++) await field.press('ArrowRight');
}
test('construction figures preserve original sections, shared scale, placement settings and units', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#dimensionering');
  const figure = page.locator('.construction-card'),
    svg = figure.locator('svg');
  await expect(svg.locator('[data-column]')).toHaveCount(3);
  await expect(svg.locator('[data-column="2"] [data-kind="material"]')).toHaveCount(0);
  await expect(svg.locator('[data-column="2"]')).toContainText(
    'Ikke gyldigt for denne kombination',
  );
  await figure.screenshot({ path: info.outputPath('standard-default.png') });
  await eu(page, 'std');
  await nx850(page, 'std');
  await expect(svg.locator('[data-column="1"]')).toHaveAttribute('data-total-mm', '750');
  await expect(svg.locator('[data-column="2"] [data-elevation-mm]').first()).toHaveAttribute(
    'data-elevation-mm',
    '400',
  );
  await expect(figure).not.toContainText('Afstanden mellem geonetlagene er 450 mm');
  const heights = await svg
    .locator('[data-column]')
    .evaluateAll((columns) =>
      columns.map((c) =>
        Array.from(c.querySelectorAll('rect[data-thickness-mm]')).reduce(
          (sum, r) => sum + Number(r.getAttribute('height')),
          0,
        ),
      ),
    );
  expect(heights[1] / heights[0]).toBeCloseTo(750 / 1200, 10);
  await expect(svg.locator('[data-kind="optimal"]')).toHaveCount(2);
  await figure.screenshot({ path: info.outputPath('standard-interval.png') });
  await page.getByRole('link', { name: 'Indstillinger', exact: true }).click();
  await page.getByRole('radio', { name: 'Ved nettets mindste dæklag', exact: true }).check();
  await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
  await expect(svg.locator('[data-column="2"] [data-elevation-mm]').first()).toHaveAttribute(
    'data-elevation-mm',
    '450',
  );
  await expect(figure).toContainText('Afstanden mellem geonetlagene er 450 mm');
  await page.getByRole('link', { name: 'Indstillinger', exact: true }).click();
  await page
    .getByRole('radio', { name: 'Ved laggrænsen mellem det øverste og det næste lag', exact: true })
    .check();
  await page.getByRole('radio', { name: 'cm', exact: true }).check();
  await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
  await expect(svg.locator('[data-column="1"] [data-kind="dimension-value"]')).toHaveText('75 cm');
  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  await eu(page, 'bd');
  await nx850(page, 'bd');
  await expect(svg.locator('[data-column]')).toHaveCount(4);
  await expect(svg.locator('[data-column="0"]')).toHaveAttribute('data-total-mm', '700');
  await expect(svg.locator('[data-kind="reference"]')).toHaveCount(4);
  await expect(svg.locator('[data-column="2"]')).toContainText('0 cm i overskud');
  await figure.screenshot({ path: info.outputPath('custom-interval-cm.png') });
  await page.getByRole('link', { name: 'Indstillinger', exact: true }).click();
  for (const label of [
    'Skriv geonettets navn ud for geonetlinjerne',
    'Vis målsætningsstreg ved den samlede tykkelse',
    'Vis den samlede tykkelse som mål',
    'Vis signaturforklaring under figuren',
  ])
    await page.getByRole('checkbox', { name: label, exact: true }).uncheck();
  await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
  await expect(
    svg.locator(
      '[data-kind="dimension-line"], [data-kind="dimension-value"], [data-kind="legend"]',
    ),
  ).toHaveCount(0);
  await page.reload();
  await expect(svg.locator('[data-kind="dimension-value"]')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  const scroller = figure.locator('.construction-scroll');
  expect(await scroller.evaluate((el) => el.scrollWidth > el.clientWidth)).toBeTruthy();
  await scroller.evaluate((el) => (el.scrollLeft = el.scrollWidth));
  await figure.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('construction-mobile.png') });
  expect(errors).toEqual([]);
});
