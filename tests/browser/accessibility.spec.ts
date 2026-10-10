import { AxeBuilder } from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';
import { chooseProduct } from './helpers/choose-product.ts';

// Fase 5: automatisk tilgængelighedskontrol (WCAG 2.1 A/AA) af alle sider, også med
// udfoldede afsnit, i computer- og mobilbredde. Axe finder ikke alt; tastatur og
// skærmlæser kontrolleres desuden i de øvrige forløb.
const pages = [
  'dimensionering',
  'rapport',
  'materialer',
  'geonet-database',
  'diagrammer',
  'vejdim',
  'hjaelp',
  'indstillinger',
];

async function violations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return result.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
}

async function expandAll(page: Page) {
  const closed = page.locator('[data-slot="accordion-trigger"][aria-expanded="false"]:visible');
  for (let n = await closed.count(); n > 0; n = await closed.count()) {
    await closed.first().click();
    await expect(closed).toHaveCount(n - 1);
  }
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
}

async function checkStatusHints(page: Page) {
  for (const [label, kind] of [
    ['Kontrolpunkter', 'warning'],
    ['Anbefalinger', 'info'],
  ]) {
    const trigger = page.locator(`.bg-resultat-status [aria-label="${label}"]`);
    if (!(await trigger.count())) continue;
    await trigger.hover();
    await expect(page.locator(`.hint-content-${kind}`)).toBeVisible();
    expect(await violations(page), `resultat: ${label}`).toEqual([]);
    await page.mouse.move(0, 0);
    await expect(page.getByRole('tooltip')).toHaveCount(0);
  }
}

for (const width of [1440, 390])
  test(`ingen axe-fund på siderne ved ${width} px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    for (const name of pages) {
      await page.goto(`/#${name}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expandAll(page);
      expect(await violations(page), name).toEqual([]);
      if (name === 'dimensionering') await checkStatusHints(page);
    }
  });

test('ingen axe-fund i Brugerdefineret, trafikklasse, popup, produktvælger og firmaprofil', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto('/#dimensionering');
  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  await chooseProduct(page, 'bd', 'Tensar InterAx NX850');
  await checkStatusHints(page);
  await page.getByRole('radio', { name: 'Trafikklasse', exact: true }).check();
  await expandAll(page);
  expect(await page.locator('.coupling-explanation math').count()).toBeGreaterThan(0);
  await expect(page.locator('.coupling-explanation [data-formula-fallback]')).toHaveCount(0);
  expect(await violations(page), 'brugerdefineret').toEqual([]);
  await page.getByRole('button', { name: 'Se korrelationstabel', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await violations(page), 'korrelationspopup').toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: /^Produkt/ }).click();
  await expect(page.getByRole('listbox', { name: 'Produkter' })).toBeVisible();
  expect(await violations(page), 'produktvælger').toEqual([]);
  await page.keyboard.press('Escape');

  await page.goto('/#rapport');
  await page.getByRole('tab', { name: 'Firmaprofil', exact: true }).click();
  await expect(page.getByTestId('profile-save-state')).toHaveAttribute('data-state', 'saved');
  expect(await violations(page), 'firmaprofil').toEqual([]);
  await page.getByRole('button', { name: 'Tilføj medarbejder', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Tilføj medarbejder' })).toBeVisible();
  expect(await violations(page), 'medarbejder').toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Åbn kartotek/ }).click();
  await expect(page.getByRole('dialog', { name: 'Medarbejderkartotek' })).toBeVisible();
  expect(await violations(page), 'kartotek').toEqual([]);
});
