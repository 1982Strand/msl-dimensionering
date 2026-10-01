import { test, expect } from '@playwright/test';
import {
  geonetDatabaseRows,
  geonetDatabaseColumns,
  geonetDatabaseNotes,
} from '../../src/engine/geonet-database.ts';

test('Geonet-database åbner fra navigationen, søger, sorterer og viser hjælpetekst/noter uden sidefejl', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#materialer');
  await page
    .getByRole('navigation', { name: 'Navigation' })
    .getByRole('link', { name: 'Geonet-database', exact: true })
    .click();
  await expect(page).toHaveURL(/#geonet-database$/);
  await expect(page.getByRole('heading', { name: 'Geonet-database', exact: true })).toBeVisible();
  const table = page.getByRole('table', { name: 'Geonetprodukter' });
  await expect(table.locator('tbody tr')).toHaveCount(20);
  await expect(table.getByRole('columnheader')).toHaveCount(25);
  expect(await table.locator('tbody tr td:first-child').allTextContents()).toEqual(
    geonetDatabaseRows().map((row) => String(row[0])),
  );

  const search = page.getByLabel('Søg i geonetprodukter');
  await search.fill('TX160');
  await expect(table.locator('tbody tr')).toHaveCount(1);
  await expect(table.locator('tbody')).toContainText('Tensar TriAx TX160');
  await search.fill('ingen-match-123');
  await expect(table.locator('tbody')).toHaveText('Ingen produkter matcher søgningen.');
  await search.fill('');
  await expect(table.locator('tbody tr')).toHaveCount(20);

  const productButton = table.getByRole('button', { name: 'Sortér efter Produkt', exact: true });
  const header = table.getByRole('columnheader').first();
  await productButton.click();
  await expect(header).toHaveAttribute('aria-sort', 'ascending');
  const names = await table.locator('tbody tr td:first-child').allTextContents();
  expect(names).toEqual(
    [...names].sort((a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })),
  );
  await productButton.click();
  await expect(header).toHaveAttribute('aria-sort', 'descending');
  expect(await table.locator('tbody tr td:first-child').allTextContents()).toEqual(
    [...names].reverse(),
  );
  // Et klik lukker Radix-tooltippen; musen føres væk og tilbage som ved brug.
  await page.mouse.move(0, 0);
  await productButton.hover();
  await expect(page.getByRole('tooltip')).toHaveText(geonetDatabaseColumns[0].help);

  // Vandret rulning flytter tabellen, mens Produkt forbliver fastlåst.
  const firstCell = table.locator('tbody tr td:first-child').first();
  const before = (await firstCell.boundingBox())!;
  await table.locator('..').evaluate((element) => {
    element.scrollLeft = 600;
  });
  const after = (await firstCell.boundingBox())!;
  expect(Math.abs(after.x - before.x)).toBeLessThan(2);
  await expect(
    page.getByRole('heading', { name: 'Database-noter og kildehenvisninger' }),
  ).toBeVisible();
  await expect(page.getByText('5 noter', { exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(5);
  for (const [index, note] of geonetDatabaseNotes.entries()) {
    const article = page.getByRole('article', { name: note.titel, exact: true });
    await expect(article.getByText(`Note ${index + 1}`, { exact: true })).toBeVisible();
    await expect(article).toContainText(note.tekst);
  }
  expect(errors).toEqual([]);
});
