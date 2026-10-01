import { test, expect } from '@playwright/test';
import { chooseProduct } from './helpers/choose-product.ts';

test('B-054: søgbar produktvælger, tastatur, filter, resultat og nummer 3', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#dimensionering');
  const trigger = page.locator('#std_geonet');
  const picker = page.locator('.product-picker-popover');
  const search = picker.getByRole('combobox', { name: 'Søg produkt, serie eller klasse' });
  await expect(trigger).toHaveAccessibleName('Produkt');
  await expect(trigger).toContainText('Tensar TriAx TX160');
  await expect(trigger).toContainText('Belastningsklasse 3–6');
  await expect(trigger).toContainText('Net-korrektion 0 %');
  await expect(trigger).toContainText('Referencenet');
  await expect(page.getByRole('heading', { name: '3 Resultat', exact: true })).toBeVisible();
  await expect(page.locator('[data-m9-slot="resultHeading"] .bg-trin-nr')).toHaveText('3');
  await trigger.click();
  await expect(search).toBeFocused();
  await expect(trigger).toHaveAttribute(
    'aria-controls',
    (await picker.getByRole('listbox').getAttribute('id'))!,
  );
  expect((await picker.boundingBox())!.width).toBeGreaterThanOrEqual(520);
  await expect(picker.locator('[cmdk-group-heading]')).toHaveText(['Tensar', 'GS-GRID', "E'GRID"]);
  await expect(picker.getByRole('option')).toHaveCount(20);
  await expect(
    picker
      .getByRole('option', { name: 'Tensar TriAx TX160', exact: true })
      .locator('[data-product-check="selected"]'),
  ).toBeVisible();
  const filter = picker.getByRole('checkbox', {
    name: 'Kun anbefalet til belastningsklasse 4',
    exact: true,
  });
  await expect(filter).not.toBeChecked();
  await search.fill('GS-GRID');
  await expect(picker.getByRole('option')).toHaveCount(9);
  await search.fill('Belastningsklasse 3–6');
  await expect(picker.getByRole('option')).toHaveCount(3);
  await search.fill('NX850');
  await expect(picker.getByRole('option')).toHaveCount(1);
  await filter.check();
  await expect(picker.getByRole('option')).toHaveCount(0);
  await expect(picker.getByText('Ingen produkter fundet.')).toBeVisible();
  await filter.uncheck();
  await search.fill('InterAx');
  await expect(picker.getByRole('option')).toHaveCount(2);
  await search.focus();
  const active = picker.locator('[cmdk-item][data-selected="true"]');
  await search.press('Home');
  await expect(active).toHaveAttribute('data-value', 'Tensar InterAx NX750');
  await search.press('ArrowDown');
  await expect(active).toHaveAttribute('data-value', 'Tensar InterAx NX850');
  await expect(trigger).toContainText('Tensar TriAx TX160');
  await search.press('ArrowUp');
  await expect(active).toHaveAttribute('data-value', 'Tensar InterAx NX750');
  await search.press('ArrowDown');
  // Pile vælger mellem de to søgeresultater i originalens rækkefølge.
  await expect(active).toHaveAttribute('data-value', 'Tensar InterAx NX850');
  await search.press('Enter');
  await expect(picker).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toContainText('Tensar InterAx NX850');
  await chooseProduct(page, 'std', 'Tensar InterAx NX850');
  await expect(trigger).toContainText('Net-korrektion −15 %');
  await expect(trigger).toContainText('Optimalt −30 %');
  await expect(
    page.getByRole('heading', { name: 'Detaljer · Tensar InterAx NX850', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.dim-results strong')).toHaveText(['900 mm', '550 mm']);
  await trigger.click();
  await search.press('Escape');
  await expect(picker).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.reload();
  await expect(trigger).toContainText('Tensar InterAx NX850');
  await trigger.click();
  await expect(filter).not.toBeChecked();
  await page.screenshot({ path: info.outputPath('product-picker-desktop.png') });
  expect(errors).toEqual([]);
});

test('B-054: trafikklassemærker følger Alle produkter, lokal filtrering og 390 px uden vandret rulning', async ({
  page,
}, info) => {
  await page.goto('/#dimensionering');
  await page.getByRole('radio', { name: 'Trafikklasse', exact: true }).check();
  const trigger = page.locator('#std_geonet');
  const picker = page.locator('.product-picker-popover');
  await page.getByRole('button', { name: 'Alle produkter · 20 produkter', exact: true }).click();
  const rows = await page
    .getByRole('table', { name: 'Alle produkter', exact: true })
    .locator('tbody tr')
    .evaluateAll((rows) =>
      rows.map((row) =>
        Array.from(row.querySelectorAll('td'))
          .slice(0, 2)
          .map((cell) => cell.textContent!),
      ),
    );
  await trigger.click();
  const filter = picker.getByRole('checkbox', {
    name: 'Kun anbefalet til trafikklasse T4',
    exact: true,
  });
  for (const [name, classes] of rows) {
    const option = picker.getByRole('option', { name, exact: true });
    await expect(option.locator('[data-slot="badge"]').first()).toHaveText(
      `Trafikklasse ${classes.replaceAll('-', '–')}`,
    );
  }
  await expect(trigger.locator('.product-picker-green')).toHaveText(/Trafikklasse T2–T6/);
  await expect(
    picker
      .getByRole('option', { name: 'GS-GRID B20/20', exact: true })
      .locator('.product-picker-yellow'),
  ).toHaveText(/Trafikklasse/);
  await filter.check();
  expect(await picker.getByRole('option').count()).toBeLessThan(20);
  await expect(picker.locator('.product-picker-yellow')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.reload();
  await trigger.click();
  await expect(filter).not.toBeChecked();
  await expect(picker.getByRole('option')).toHaveCount(20);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await trigger.click();
  await expect(
    picker.getByRole('combobox', { name: 'Søg produkt, serie eller klasse' }),
  ).toBeFocused();
  const box = (await picker.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await picker.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('product-picker-mobile.png') });
  await page.keyboard.press('Escape');
  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  await chooseProduct(page, 'bd', 'Tensar InterAx NX850');
  await expect(
    page.getByRole('heading', { name: 'Detaljer · Tensar InterAx NX850', exact: true }),
  ).toBeVisible();
});
