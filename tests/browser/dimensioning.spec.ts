import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { laengde } from '../../src/engine/enhed.ts';
import { pythonFixed } from '../../src/engine/python-numbers.ts';
const original = JSON.parse(
  readFileSync(new URL('../../reference/ui-flows.json', import.meta.url), 'utf8'),
);
const ui = JSON.parse(
  readFileSync(new URL('../../src/engine/dimensioning-ui.json', import.meta.url), 'utf8'),
);
const snapshot = (id: string) =>
  original.snapshots.find((s: { id: string }) => s.id === id).dimensioning;
async function results(page: Page, id: string) {
  const dim = snapshot(id);
  const cards = page.locator('.dim-results > div');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0).locator('strong')).toHaveText(
    laengde(
      dim.res_1.t_uarmeret_phi_kor_mm ?? dim.res_2.t_uarmeret_phi_kor_mm ?? dim.t_uarmeret_mm,
    ),
  );
  await expect(cards.nth(1).locator('strong')).toHaveText(laengde(dim.res_1.t_armeret_mm ?? null));
  await expect(cards.nth(2).locator('strong')).toHaveText(laengde(dim.res_2.t_armeret_mm ?? null));
  for (const [i, r] of [dim.res_1, dim.res_2].entries())
    if (r.reduktion_pct != null)
      await expect(cards.nth(i + 1)).toContainText(
        `${pythonFixed(r.reduktion_pct * 100, 0).replace('.', ',')} %`,
      );
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
  const label = ui.fields
    .find((f: { key: string }) => f.key === 'std_geonet')
    .options.find((o: { value: string }) => o.value === 'Tensar InterAx NX850').label;
  await page.locator('#std_geonet').selectOption({ label });
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
  await expect(page.locator('#std_cv_slider')).toHaveAttribute('max', '180');
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
  await page.locator('#bd_mat_2').selectOption({ label: 'Manuel indtastning' });
  await results(page, 'UI-010');
  await page.getByRole('checkbox', { name: 'Overskriv φᵥ manuelt', exact: true }).check();
  await number(page, 'bd_phi_man', '38.5');
  await results(page, 'UI-011');
  await page.reload();
  await results(page, 'UI-011');
  await page.getByRole('link', { name: 'Indstillinger', exact: true }).click();
  await page.locator('#ind_afr_trin').selectOption({ label: '100 mm' });
  await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
  await results(page, 'UI-014');
  await page.getByRole('link', { name: 'Indstillinger', exact: true }).click();
  await page.locator('#ind_afr_trin').selectOption({ label: '50 mm' });
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
