import { test, expect, type Page } from '@playwright/test';

async function setEu(page: Page, value: number) {
  const slider = page.locator('#std_eu_slider');
  await slider.focus();
  await slider.press('Home');
  for (let n = 1; n < value; n++) await slider.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuenow', String(value));
}

test('B-063: afsnit 1 står stille ved trafikklassebesked, klasseboks uden ombrydning, korrelationstabel uden vandret rulning', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#dimensionering');
  await page.getByRole('radio', { name: 'Trafikklasse', exact: true }).check();
  const card = page.locator('.dim-step1');
  const message = page.locator('[data-m9-slot="basisMessage"]');
  const heights = new Set<number>();
  // T4: uden besked ved Eᵤ 10 og 3 (gyldig, jf. korrelationstabellen); afvist over ved 29 og 45.
  for (const [eu, shown] of [
    [10, false],
    [29, true],
    [3, false],
    [45, true],
  ] as const) {
    await setEu(page, eu);
    await expect(message).toHaveCount(shown ? 1 : 0);
    heights.add(Math.round((await card.boundingBox())!.height));
  }
  expect([...heights]).toHaveLength(1);
  // Klasseboksens etiketter og værdier står på én linje.
  const cellHeights = await page
    .locator('[data-m9-slot="keyFigures"] .bg-noegletal td')
    .evaluateAll((cells) => cells.map((c) => c.getBoundingClientRect().height));
  expect(cellHeights.length).toBeGreaterThan(0);
  for (const h of cellHeights) expect(h).toBeLessThan(30);

  await page.getByRole('button', { name: 'Se korrelationstabel', exact: true }).click();
  const scroll = page.locator('.traffic-correlation-scroll');
  await expect(scroll).toBeVisible();
  const { scrollWidth, clientWidth } = await scroll.evaluate((e) => ({
    scrollWidth: e.scrollWidth,
    clientWidth: e.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await expect(page.getByRole('cell', { name: 'under (−43,8 %)', exact: true })).toBeVisible();
});
