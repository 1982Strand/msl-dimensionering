import { expect, type Page } from '@playwright/test';

/** B-054: vælg med produktets navn; behold samme nøgle og resultatkontroller. */
export async function chooseProduct(page: Page, prefix: string, name: string) {
  const trigger = page.locator(`#${prefix}_geonet`);
  await trigger.click();
  const picker = page.locator('.product-picker-popover');
  // Filteret er lokal UI-tilstand og kan være valgt af et tidligere trin i samme forløb.
  await picker.getByRole('checkbox').uncheck();
  await picker.getByRole('combobox', { name: 'Søg produkt, serie eller klasse' }).fill(name);
  await picker.getByRole('option', { name, exact: true }).click();
  await expect(trigger).toContainText(name);
  await expect(picker).toHaveCount(0);
}
