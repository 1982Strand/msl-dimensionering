import { test, expect } from '@playwright/test';

test('designudkast viser komponenter, accordion og sorterbare produktdata uden sidefejl', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#designudkast');
  const titles = [
    'Sidebar',
    'Accordion',
    'Tooltip / Hover Card',
    'Data Table',
    'Alert',
    'Sonner',
    'Tabs og Sheet',
    'Progress',
  ];
  await expect(page.locator('[data-design-section]')).toHaveCount(8);
  for (const title of titles)
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Navigation' })
      .getByRole('link', { name: 'Designudkast' }),
  ).toHaveCount(0);
  const accordion = page.getByRole('button', { name: 'Dimensioneringstrafik', exact: true });
  await accordion.click();
  await expect(accordion).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByText('Eksempel: Trafikklasse T3 vælges som grundlag.', { exact: false }),
  ).toBeVisible();
  const table = page.getByRole('table', { name: 'Geonetprodukter' });
  const productHeader = table
    .getByRole('columnheader')
    .filter({ has: page.getByRole('button', { name: /^Produkt / }) });
  await productHeader.getByRole('button').click();
  await expect(productHeader).toHaveAttribute('aria-sort', 'ascending');
  const names = await table.locator('tbody tr td:first-child').allTextContents();
  expect(names).toEqual(
    [...names].sort((a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })),
  );
  await productHeader.getByRole('button').click();
  await expect(productHeader).toHaveAttribute('aria-sort', 'descending');
  expect(await table.locator('tbody tr td:first-child').allTextContents()).toEqual(
    [...names].reverse(),
  );
  await page.getByLabel('Søg i geonetprodukter').fill('TX160');
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(table.locator('tbody')).toContainText('Tensar TriAx TX160');
  expect(errors).toEqual([]);
});
