import { test, expect, type Page } from '@playwright/test';

async function setEu(page: Page, value: number) {
  const slider = page.locator('#std_eu_slider');
  await slider.focus();
  await slider.press('Home');
  for (let n = 1; n < value; n++) await slider.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuenow', String(value));
}

test('B-063/B-064: afsnit 1 står stille, beskeden som ikon med Hover Card, klasseboks i fast størrelse, korrelationstabel uden vandret rulning', async ({
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
  // B-064: beskeden vises som ikon ved klassevalget; teksten i Hover Card'et er den samme.
  await setEu(page, 29);
  const icon = page.getByRole('button', {
    name: 'Advarsel om dimensioneringsgrundlaget',
    exact: true,
  });
  await expect(icon).toHaveAttribute('aria-describedby', 'dim-basis-message');
  await icon.hover();
  const hover = page.locator('.hint-content-warning');
  await expect(hover).toBeVisible();
  await expect(hover).toHaveText((await message.textContent())!);
  await page.mouse.move(0, 0);
  await expect(hover).toHaveCount(0);
  // Klasseboksen har samme størrelse i alle trafikklasser.
  const sizes = new Set<string>();
  for (const t of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6']) {
    await page.getByRole('radio', { name: t, exact: true }).check();
    const b = (await page.locator('[data-m9-slot="keyFigures"] .bg-noegletal').boundingBox())!;
    sizes.add(`${Math.round(b.width)}x${Math.round(b.height)}`);
  }
  // Bredden er fast overalt. B-064's faste højde er afstemt efter Segoe UI (Windows, B-060); på
  // Linux (GitHub-kontrollen) bruges en anden skrift, og højden kan vokse.
  expect(new Set([...sizes].map((s) => s.split('x')[0])).size).toBe(1);
  if (process.platform === 'win32') expect([...sizes]).toHaveLength(1);
  await page.getByRole('radio', { name: 'T4', exact: true }).check();
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

test('B-081: Eᵤ og Cv vises stort over slideren med yderværdier under den', async ({ page }) => {
  await page.goto('/#dimensionering');
  const field = (id: string) => page.locator('.dim-slider').filter({ has: page.locator(`#${id}`) });
  const eu = field('std_eu_slider');
  const readout = eu.locator('output[for="std_eu_slider"]');
  await expect(eu.locator('.dim-slider-caption')).toHaveText('Underbundens E-modul');
  await expect(readout).toHaveText('Eᵤ = 10 MPa');
  await expect(eu.locator('.dim-slider-ends span')).toHaveText(['1', '45 MPa']);
  await expect(page.getByRole('slider', { name: 'Underbundens E-modul', exact: true })).toHaveId(
    'std_eu_slider',
  );
  await setEu(page, 29);
  await expect(readout).toHaveText('Eᵤ = 29 MPa');
  expect(
    await readout.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBeGreaterThanOrEqual(24);

  await page.getByRole('radio', { name: 'Cv — vingestyrke', exact: true }).check();
  const cv = field('std_cv_slider');
  await expect(cv.locator('.dim-slider-caption')).toHaveText('Underbundens vingestyrke');
  await expect(cv.locator('output[for="std_cv_slider"]')).toHaveText('Cv = 60 kN/m²');
  await expect(cv.locator('.dim-slider-ends span')).toHaveText(['0', '180 kN/m²']);
  await page.locator('#std_cv_slider').focus();
  await page.locator('#std_cv_slider').press('ArrowRight');
  await expect(cv.locator('output[for="std_cv_slider"]')).toHaveText('Cv = 65 kN/m²');
});
