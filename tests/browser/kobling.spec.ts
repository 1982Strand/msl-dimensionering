import { test, expect } from '@playwright/test';

test('M1: initially closed, four load steps, six traffic steps, rejection and no page errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#dimensionering');
  const section = page.locator('.coupling-explanation');
  await expect(section).toHaveCount(1);
  await expect(
    section.getByRole('button', { name: /Sådan er resultatet beregnet/ }),
  ).toHaveAttribute('aria-expanded', 'false');
  await expect(section.getByRole('button', { name: /Sådan er resultatet beregnet/ })).toHaveText(
    'Sådan er resultatet beregnet · fra belastningsklasse 4 til 650 mm bærelag',
  );
  await section.getByRole('button', { name: /Sådan er resultatet beregnet/ }).click();
  await expect(
    section.getByRole('button', { name: /Sådan er resultatet beregnet/ }),
  ).toHaveAttribute('aria-expanded', 'true');
  await expect(section.locator('.kob-step')).toHaveCount(4);
  await expect(section.locator('.kob-step').last()).toBeVisible();
  await expect(section.locator('.kob-sign')).toHaveCount(1);
  await expect(section.locator('[data-legend]')).toHaveCount(0);
  await expect(
    section.getByRole('img', { name: 'Designdiagrammets kurver', exact: true }),
  ).toBeVisible();
  await expect(section.locator('.kob-figur')).toHaveCount(1);
  await expect(
    section.getByRole('heading', { name: 'Reduktion med geonet', exact: true }),
  ).toBeVisible();
  await page.getByRole('radio', { name: 'Trafikklasse', exact: true }).check();
  await page.getByRole('radio', { name: 'T4', exact: true }).check();
  await expect(section.locator('.kob-step')).toHaveCount(6);
  await expect(section.locator('.kob-step').last()).toBeVisible();
  await expect(section.locator('.kob-sign')).toHaveCount(2);
  await expect(section.locator('.kob-figur')).toHaveCount(2);
  const runs = section.getByRole('img', { name: 'T4s VejDim-kørsler', exact: true });
  const diagram = section.getByRole('img', { name: 'Designdiagrammets kurver', exact: true });
  await expect(runs).toBeVisible();
  await expect(diagram).toBeVisible();
  const runsCanvas = section.getByRole('group', { name: /T4s VejDim-kørsler\. Brug piletasterne/ });
  const diagramCanvas = section.getByRole('group', {
    name: /Designdiagrammets kurver\. Brug piletasterne/,
  });
  // Scope status to each figure: the page has other status fields (e.g. save status).
  await runs.locator('[data-point]').first().hover({ force: true });
  await expect(runsCanvas.getByRole('status')).toContainText('969 mm');
  await expect(runsCanvas.getByRole('status')).toContainText('Eᵤ 10,0 MPa');
  await diagram.locator('[data-point]').last().hover({ force: true });
  await expect(diagramCanvas.getByRole('status')).toContainText('666 mm');
  await expect(diagramCanvas.getByRole('status')).toContainText('1 lag geonet');
  await runs.locator('[data-run]').first().hover({ force: true });
  await expect(runsCanvas.getByRole('status')).toContainText('1.347 mm');
  await expect(runsCanvas.getByRole('status')).toContainText('kørte punkter');
  await runsCanvas.focus();
  await runsCanvas.press('Escape');
  await expect(runsCanvas.getByRole('status')).toHaveCount(0);
  await runsCanvas.press('ArrowUp');
  const firstValue = await runsCanvas.getByRole('status').textContent();
  await runsCanvas.press('ArrowUp');
  await expect(runsCanvas.getByRole('status')).not.toHaveText(firstValue!);
  await runsCanvas.press('ArrowDown');
  await expect(runsCanvas.getByRole('status')).toHaveText(firstValue!);
  await expect(section.getByRole('button', { name: /Sådan er resultatet beregnet/ })).toHaveText(
    'Sådan er resultatet beregnet · fra trafikklasse T4 til 700 mm bærelag',
  );
  await section.getByRole('button', { name: /Sådan er resultatet beregnet/ }).click();
  await expect(
    section.getByRole('button', { name: /Sådan er resultatet beregnet/ }),
  ).toHaveAttribute('aria-expanded', 'false');
  await section.getByRole('button', { name: /Sådan er resultatet beregnet/ }).focus();
  await page.keyboard.press('Enter');
  await expect(
    section.getByRole('button', { name: /Sådan er resultatet beregnet/ }),
  ).toHaveAttribute('aria-expanded', 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  await runs.locator('[data-run]').last().hover({ force: true });
  await expect(runsCanvas.getByRole('status')).toBeVisible();
  const tooltipContained = await runsCanvas.evaluate((canvas) => {
    const figure = canvas.getBoundingClientRect();
    const tip = canvas.querySelector('[role="status"]')!.getBoundingClientRect();
    return (
      tip.left >= figure.left &&
      tip.top >= figure.top &&
      tip.right <= figure.right &&
      tip.bottom <= figure.bottom
    );
  });
  expect(tooltipContained).toBe(true);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('radio', { name: 'T1', exact: true }).check();
  await expect(section).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('B-070: udkastets trin 2/3/5 har MathML-brøker, indeks og fremhævede resultater; gitre ruller på mobil', async ({
  page,
}) => {
  await page.goto('/#dimensionering');
  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  await page.getByRole('radio', { name: 'Trafikklasse', exact: true }).check();
  await page.getByRole('radio', { name: 'T2', exact: true }).check();
  const eu = page.locator('#bd_eu_slider');
  await eu.focus();
  await eu.press('Home');
  for (let value = 1; value < 11; value++) await eu.press('ArrowRight');
  const section = page.locator('.coupling-explanation');
  await section.getByRole('button', { name: /Sådan er resultatet beregnet/ }).click();
  for (const n of [2, 3, 5]) {
    const step = section.getByRole('region', { name: new RegExp(`^Trin ${n}:`) });
    // Sections with aria-label have the implicit region role.
    expect(await step.locator('math mfrac').count()).toBeGreaterThan(0);
    expect(await step.locator('math .res-m').count()).toBeGreaterThan(0);
    const result = step.locator('math .res-m').first();
    expect(
      await result.evaluate((e) => Number(getComputedStyle(e).fontWeight)),
    ).toBeGreaterThanOrEqual(600);
  }
  await expect(section.locator('[data-formula-fallback]')).toHaveCount(0);
  expect(await section.locator('math msub').count()).toBeGreaterThan(0);
  const step4 = section.getByRole('region', { name: /^Trin 4:/ });
  await expect(step4.locator('.formula-grid')).toHaveCount(1);
  await expect(step4.locator('.formula-grid > span')).toHaveCount(12);
  const step6 = section.getByRole('region', { name: /^Trin 6:/ });
  expect(await step6.locator('.formula-sum-row').count()).toBeGreaterThan(0);
  await expect(step6.locator('.kob-slutlinje b').first()).toContainText('mm');
  const first = section.locator('.kob-formel').first();
  await expect(first).toHaveAttribute('tabindex', '0');
  for (const width of [1440, 600, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await first.focus();
    await expect(first).toBeFocused();
    for (const block of await section.locator('.kob-formel').all()) {
      expect(await block.evaluate((e) => getComputedStyle(e).overflowX)).toBe('auto');
    }
  }
});
