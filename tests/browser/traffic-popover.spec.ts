import { test, expect } from '@playwright/test';

test('local T4/Eᵤ10 correlation popup, original marking and load-class visibility', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#dimensionering');
  const trigger = page.getByRole('button', { name: 'Se korrelationstabel', exact: true });
  await expect(trigger).toHaveCount(0);
  await page.getByRole('radio', { name: 'Trafikklasse', exact: true }).check();
  await page.getByRole('radio', { name: 'T4', exact: true }).check();
  const slider = page.locator('#std_eu_slider');
  await slider.focus();
  await slider.press('Home');
  for (let eu = 1; eu < 10; eu++) await slider.press('ArrowRight');
  const dialog = page.getByRole('dialog', { name: 'Se korrelationstabel', exact: true });
  await expect(dialog).toHaveCount(0);
  await trigger.click();
  await expect(dialog).toBeVisible();
  const table = dialog.getByRole('table', { name: 'Trafikklasse-korrelation', exact: true });
  await expect(table.getByRole('columnheader')).toHaveText([
    'Trafikklasse',
    'Eᵤ 3',
    'Eᵤ 4',
    'Eᵤ 5',
    'Eᵤ 10',
    'Eᵤ 15',
    'Eᵤ 20',
    'Eᵤ 30',
    'Eᵤ 40',
  ]);
  const row = table.locator('tr[data-active-row="true"]');
  await expect(row.getByRole('rowheader')).toHaveText('T4');
  await expect(row.locator('[aria-current="true"]')).toHaveText('108');
  await expect(row.locator('[aria-current="true"]')).toHaveCSS('font-weight', '700');
  await expect(row.getByRole('cell').first()).toHaveCSS('background-color', 'rgb(245, 250, 241)');
  await expect(table.getByRole('cell', { name: '30* (−4,9 %)', exact: true })).toHaveCSS(
    'font-style',
    'italic',
  );
  await expect(dialog).toContainText('VejDim kræver 969 mm ubundet');
  await page.screenshot({ path: info.outputPath('traffic-correlation-popup.png') });
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.getByRole('radio', { name: 'Belastningsklasse', exact: true }).check();
  await expect(trigger).toHaveCount(0);
  expect(errors).toEqual([]);
});
