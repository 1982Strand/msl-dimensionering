import { chooseOption } from './helpers/choose-option.ts';
import { chooseProduct } from './helpers/choose-product.ts';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { laengde } from '../../src/engine/enhed.ts';
import { pythonFixed } from '../../src/engine/python-numbers.ts';
const original = JSON.parse(
  readFileSync(new URL('../../reference/ui-flows.json', import.meta.url), 'utf8'),
);
const snapshot = (id: string) =>
  original.snapshots.find((s: { id: string }) => s.id === id).dimensioning;
async function results(page: Page, id: string) {
  const dim = snapshot(id);
  const cards = page.locator('.dim-results > div');
  const alternatives = [dim.res_1, dim.res_2]
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !r.fejl && r.t_armeret_mm != null);
  await expect(cards).toHaveCount(1 + alternatives.length);
  await expect(cards.nth(0).locator('strong')).toHaveText(
    laengde(
      dim.res_1.t_uarmeret_phi_kor_mm ?? dim.res_2.t_uarmeret_phi_kor_mm ?? dim.t_uarmeret_mm,
    ),
  );
  for (const [index, { r, i }] of alternatives.entries()) {
    await expect(cards.nth(index + 1).getByRole('heading')).toHaveText(`${i + 1} lag geonet`);
    await expect(cards.nth(index + 1).locator('strong')).toHaveText(laengde(r.t_armeret_mm));
    if (r.reduktion_pct != null)
      await expect(cards.nth(index + 1)).toContainText(
        `${pythonFixed(r.reduktion_pct * 100, 0).replace('.', ',')} %`,
      );
  }
  for (const [i, r] of [dim.res_1, dim.res_2].entries())
    if (r.fejl || r.t_armeret_mm == null)
      await expect(
        cards.getByRole('heading', { name: `${i + 1} lag geonet`, exact: true }),
      ).toHaveCount(0);
}
async function range(page: Page, id: string, value: number, min = 1, step = 1) {
  const control = page.locator(`#${id}`);
  await control.focus();
  await control.press('Home');
  for (let n = min; n < value; n += step) await control.press('ArrowRight');
}
async function number(page: Page, id: string, value: string) {
  await page.locator(`#${id}`).fill(value);
  await page.locator(`#${id}`).press('Tab');
}

test('Standard default, product interval, approved retained selection and traffic rejection', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#dimensionering');
  await results(page, 'UI-001');
  await range(page, 'std_eu_slider', 5);
  await chooseProduct(page, 'std', 'Tensar InterAx NX850');
  await results(page, 'UI-003');
  await page.getByRole('link', { name: 'Materialer', exact: true }).click();
  await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
  await results(page, 'UI-003'); // B-023 approves fixing the original UI-005 product reset.
  await page.reload();
  await results(page, 'UI-003');
  await page.getByRole('radio', { name: 'Trafikklasse', exact: true }).check();
  await page.getByRole('radio', { name: 'T1', exact: true }).check();
  await range(page, 'std_eu_slider', 3);
  await expect(page.locator('.dim-results')).toHaveCount(0);
  await expect(page.getByText(/Beregningen afvises efter Indstillinger/)).toBeVisible();
  await page.getByRole('radio', { name: 'Cv — vingestyrke', exact: true }).check();
  await expect(page.locator('#std_cv_slider')).toHaveAttribute('aria-valuemax', '180');
  await expect(page.getByText('Cv = 60 kN/m² → Eᵤ = 10 MPa')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Custom original layers, manual material and phi, scoped reset and responsive layout', async ({
  page,
}, info) => {
  await page.goto('/#dimensionering');
  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  await results(page, 'UI-009');
  await expect(page.locator('#bd_t_0')).toHaveValue('300');
  await expect(page.locator('#bd_t_1')).toHaveValue('400');
  await number(page, 'bd_antal_lag', '2.5');
  await expect(page.locator('#bd_antal_lag')).toHaveAttribute('aria-invalid', 'true');
  await number(page, 'bd_antal_lag', '3');
  await chooseOption(page, page.locator('#bd_mat_2'), 'Manuel indtastning');
  await results(page, 'UI-010');
  await page.getByRole('checkbox', { name: 'Overskriv φᵥ manuelt', exact: true }).check();
  await number(page, 'bd_phi_man', '38.5');
  await results(page, 'UI-011');
  await page.reload();
  await results(page, 'UI-011');
  await page.getByRole('link', { name: 'Indstillinger', exact: true }).click();
  await chooseOption(page, page.locator('#ind_afr_trin'), '100 mm');
  await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
  await results(page, 'UI-014');
  await page.getByRole('link', { name: 'Indstillinger', exact: true }).click();
  await chooseOption(page, page.locator('#ind_afr_trin'), '50 mm');
  await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.locator('.dim-results').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('dimensioning-mobile.png') });
  await page.getByRole('button', { name: 'Nulstil dimensionering', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Brugerdefineret', exact: true })).toBeChecked();
  await results(page, 'UI-009');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: info.outputPath('dimensioning-desktop.png') });
});

test('class choices are horizontal, reference popups keep layout stable and product table matches legacy', async ({
  page,
}, info) => {
  await page.goto('/#dimensionering');
  // B-058: belastningsklasse 1–6 er en segmenteret knaprække af radioknapper.
  const classes = page
    .getByRole('radiogroup', { name: 'Belastningsklasse', exact: true })
    .getByRole('radio');
  await expect(classes).toHaveText(['1', '2', '3', '4', '5', '6']);
  const rowTops = await classes.evaluateAll((inputs) =>
    inputs.map((input) => Math.round(input.getBoundingClientRect().top)),
  );
  expect(new Set(rowTops).size).toBe(1);
  const section = page
    .getByRole('heading', {
      name: '1 Underbund og dimensioneringsgrundlag',
      exact: true,
      includeHidden: true,
    })
    .locator('xpath=ancestor::section[1]');
  const heightBefore = (await section.boundingBox())!.height;
  await page.getByRole('button', { name: 'Se designdiagram', exact: true }).click();
  const diagram = page.getByRole('dialog', {
    name: 'Designdiagram · belastningsklasse 4 · Eₒ = 80 MPa',
    exact: true,
  });
  await expect(diagram).toBeVisible();
  // B-082: diagrammet optegnet af tabellens værdier (siden Designdiagrammer), ikke scanningen.
  const chart = diagram.getByRole('img', { name: 'Optegnet af tabellens værdier', exact: true });
  await expect(chart).toBeVisible();
  await expect(chart.locator('[data-curve]')).toHaveCount(3);
  await expect(chart).toContainText('Bundmodul Eᵤ [MPa]');
  await expect(diagram.locator('img')).toHaveCount(0);
  const body = diagram.locator('.info-popup-body');
  expect(await body.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBeTruthy();
  expect((await section.boundingBox())!.height).toBeCloseTo(heightBefore, 0);
  await page.screenshot({ path: info.outputPath('diagram-popup.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Se designdiagram', exact: true })).toBeFocused();
  await page.getByRole('radio', { name: 'Cv — vingestyrke', exact: true }).check();
  const cvHeight = (await section.boundingBox())!.height;
  await page.getByRole('button', { name: 'Se korrelationstabel', exact: true }).click();
  const cv = page.getByRole('dialog', { name: 'Korrelation mellem Cv og Eᵤ', exact: true });
  await expect(cv.getByRole('table')).toBeVisible();
  expect(await cv.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBeTruthy();
  expect((await section.boundingBox())!.height).toBeCloseTo(cvHeight, 0);
  await cv.getByRole('button', { name: 'Luk popup' }).click();
  await page.getByRole('button', { name: 'Alle produkter · 20 produkter', exact: true }).click();
  const table = page.getByRole('table', { name: 'Alle produkter', exact: true });
  await expect(table.getByRole('columnheader')).toHaveText([
    'Produkt',
    'Klasse',
    'Indeks',
    '1 lag',
    'Sparet',
    '2 lag',
    'Sparet',
  ]);
  const first = table.locator('tbody tr').first();
  await expect(first.getByRole('cell')).toHaveText([
    'Tensar InterAx NX850',
    '5-6',
    '115–130',
    '550 mm',
    '−350 mm · 39 %',
    '—',
    '—',
  ]);
  await expect(table.locator('tbody tr')).toHaveCount(20);
  await expect(table).not.toContainText('Kombinationen');
  await table.getByRole('button', { name: 'Sorter efter 1 lag', exact: true }).click();
  await table.getByRole('button', { name: 'Sorter efter 1 lag', exact: true }).click();
  await expect(table.locator('tbody tr').first().getByRole('cell').nth(3)).toHaveText('750 mm');
  await page.screenshot({ path: info.outputPath('product-overview.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Se korrelationstabel', exact: true }).click();
  const bounds = (await cv.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath('cv-popup-mobile.png') });
});
