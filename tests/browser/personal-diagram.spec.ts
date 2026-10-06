import { test, expect } from '@playwright/test';

test('M5 preserves hover, marker choices across reload, rapid updates and visible axes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#dimensionering');
  const chart = page.getByRole('img', { name: 'Personligt designdiagram' });
  const canvas = page.getByRole('group', { name: /Designdiagram\. Brug piletasterne/ });
  // Kun diagrammets egen forklaringsboks; siden har andre statusfelter (fx gemmestatus).
  const tip = canvas.getByRole('status');
  await expect(chart.locator('[data-curve]').first()).toBeVisible();
  await chart.locator('[data-point]').first().hover({ force: true });
  await expect(tip).toContainText('1 lag geonet');
  await expect(tip).toContainText('62 cm');
  await expect(tip).toContainText('Eᵤ 10,0 MPa');
  await canvas.focus();
  await canvas.press('Escape');
  await expect(tip).toHaveCount(0);
  await canvas.press('ArrowUp');
  const first = await tip.textContent();
  await canvas.press('ArrowUp');
  await expect(tip).not.toHaveText(first!);
  await canvas.press('ArrowRight');
  await expect(tip).toContainText('1 lag geonet');
  await canvas.press('ArrowLeft');
  await expect(tip).toContainText('Ustabiliseret');
  await canvas.press('ArrowDown');
  await expect(tip).toHaveText(first!);
  await canvas.press('Escape');
  await expect(tip).toHaveCount(0);
  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  const input = page.getByRole('checkbox', { name: 'Vis indtastet opbygning' });
  const endpoints = page.getByRole('checkbox', { name: 'Vis endepunkter for 1 og 2 lag geonet' });
  await endpoints.uncheck();
  await input.uncheck();
  const markers = () => chart.locator('[data-point]').count();
  await expect.poll(markers).toBe(0);
  await page.reload();
  await expect(endpoints).not.toBeChecked();
  await expect(input).not.toBeChecked();
  await expect(chart.locator('[data-curve]').first()).toBeVisible();
  await input.check();
  await input.uncheck();
  await input.check();
  await expect.poll(markers).toBe(1);
  await expect(chart.locator('[data-legend]')).toContainText('Indtastet opbygning (70 cm)');
  await endpoints.check();
  await expect.poll(markers).toBeGreaterThan(1);
  await page.setViewportSize({ width: 600, height: 900 });
  await expect(chart.locator('[data-axis-title="x"]')).toBeVisible();
  await expect(chart.locator('[data-axis-title="x"]')).toHaveText('Bærelagstykkelse [cm]');
  const visible = await chart.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const axis = node.querySelector('[data-axis-title="x"]')!.getBoundingClientRect();
    return axis.bottom <= box.bottom && axis.top >= box.top;
  });
  expect(visible).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
