import { test, expect } from '@playwright/test';

test('M5 preserves hover, marker choices across reload, rapid updates and visible axes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#dimensionering');
  const chart = page.getByRole('img', { name: 'Personligt designdiagram' });
  await expect(chart.locator('.main-svg').first()).toBeVisible();
  await chart.locator('.scatterlayer .points .point').first().hover({ force: true });
  await expect(chart.locator('.hoverlayer')).toContainText('1 lag geonet');
  await expect(chart.locator('.hoverlayer')).toContainText('62 cm');
  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  const input = page.getByRole('checkbox', { name: 'Vis indtastet opbygning' });
  const endpoints = page.getByRole('checkbox', { name: 'Vis endepunkter for 1 og 2 lag geonet' });
  await endpoints.uncheck();
  await input.uncheck();
  const markers = () => chart.locator('.scatterlayer .points .point').count();
  await expect.poll(markers).toBe(0);
  await page.reload();
  await expect(endpoints).not.toBeChecked();
  await expect(input).not.toBeChecked();
  await expect(chart.locator('.main-svg').first()).toBeVisible();
  await input.check();
  await input.uncheck();
  await input.check();
  await expect.poll(markers).toBe(1);
  await expect(chart.locator('.legend')).toContainText('Indtastet opbygning (70 cm)');
  await endpoints.check();
  await expect.poll(markers).toBeGreaterThan(1);
  await page.setViewportSize({ width: 600, height: 900 });
  await expect(chart.locator('.xtitle')).toHaveText('Bærelagstykkelse [cm]');
  const visible = await chart.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const axis = node.querySelector('.xtitle')!.getBoundingClientRect();
    return axis.bottom <= box.bottom && axis.top >= box.top;
  });
  expect(visible).toBe(true);
  expect(errors).toEqual([]);
});
