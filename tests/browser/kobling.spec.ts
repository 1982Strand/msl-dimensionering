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
  await expect(
    section.getByRole('img', { name: 'Designdiagrammets kurver', exact: true }),
  ).toBeVisible();
  await expect(section.locator('.coupling-figure')).toHaveCount(1);
  await expect(
    section.getByRole('heading', { name: 'Reduktion med geonet', exact: true }),
  ).toBeVisible();
  await page.getByRole('radio', { name: 'Trafikklasse', exact: true }).check();
  await page.getByRole('radio', { name: 'T4', exact: true }).check();
  await expect(section.locator('.coupling-step')).toHaveCount(6);
  await expect(section.locator('.coupling-figure')).toHaveCount(2);
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
  await expect(section.locator('summary')).toHaveText(
    'Sådan er resultatet beregnet · fra trafikklasse T4 til 700 mm bærelag',
  );
  await section.locator('summary').click();
  await expect(section).not.toHaveAttribute('open');
  await section.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(section).toHaveAttribute('open', '');
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
