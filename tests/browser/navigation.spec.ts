import { expect, test, type Page } from '@playwright/test';

const groups = [
  {
    label: 'Beregning',
    items: [
      ['dimensionering', 'Dimensionering'],
      ['rapport', 'Rapport'],
    ],
  },
  {
    label: 'Opslag',
    items: [
      ['materialer', 'Materialer'],
      ['geonet-database', 'Geonet-database'],
      ['diagrammer', 'Designdiagrammer'],
      ['vejdim', 'Trafikklasse-korrelation'],
      ['hjaelp', 'Hjælp og dokumentation'],
    ],
  },
  { label: 'Opsætning', items: [['indstillinger', 'Indstillinger']] },
] as const;

function observeErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function expectPage(page: Page, key: string, label: string) {
  await expect(page).toHaveURL(new RegExp(`#${key}$`));
  await expect(page.getByRole('heading', { name: label, exact: true, level: 1 })).toBeVisible();
}

test('originalens grupper, rækkefølge, sider, aktiv markering og versionsfod', async ({ page }) => {
  const errors = observeErrors(page);
  await page.goto('/');
  await expectPage(page, 'dimensionering', 'Dimensionering');
  const navigation = page.getByRole('navigation', { name: 'Navigation' });
  await expect(navigation.locator('[data-sidebar="group-label"]')).toHaveText(
    groups.map((g) => g.label),
  );
  for (const [index, group] of groups.entries()) {
    const section = navigation.locator('[data-sidebar="group"]').nth(index);
    await expect(section.getByRole('link')).toHaveText(group.items.map(([, name]) => name));
    for (const [key, name] of group.items) {
      const link = section.getByRole('link', { name, exact: true });
      await expect(link).toHaveAttribute('href', `#${key}`);
      await link.click();
      await expectPage(page, key, name);
      await expect(link).toHaveAttribute('aria-current', 'page');
      await expect(link).toHaveAttribute('data-active', 'true');
      await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(navigation.locator('[data-active="true"]')).toHaveCount(1);
    }
  }
  const footer = page.locator('[data-sidebar="footer"]');
  await expect(footer.getByText('BG Byggros A/S', { exact: true })).toBeVisible();
  await expect(footer.getByText('Beregningsværktøj v0.6', { exact: true })).toBeVisible();
  await expect(page.locator('.topbar')).toHaveCSS('background-color', 'rgb(23, 61, 57)');
  await expect(page.locator('.topbar .brand strong')).toHaveText('MSL');
  // B-058: lavere topbjælke uden »Under udvikling«.
  await expect(page.locator('.topbar')).toHaveCSS('height', '56px');
  await expect(page.getByText('Under udvikling', { exact: true })).toHaveCount(0);
  await expect(page.locator('.topbar').getByRole('button')).toHaveText(['Menu']);
  expect(errors).toEqual([]);
});

test('startside, ukendte ruter, direkte links og browserens frem/tilbage', async ({ page }) => {
  const errors = observeErrors(page);
  await page.goto('/');
  await expectPage(page, 'dimensionering', 'Dimensionering');
  // B-059: de fjernede udkastruter følger samme fallback som andre ukendte ruter.
  for (const route of ['ukendt-side', 'designudkast', 'designudkast-sidebar', 'temaudkast']) {
    await page.goto(`/#${route}`);
    await expectPage(page, 'dimensionering', 'Dimensionering');
  }
  await page.goto('/#hjaelp');
  await expectPage(page, 'hjaelp', 'Hjælp og dokumentation');
  const navigation = page.getByRole('navigation', { name: 'Navigation' });
  await navigation.getByRole('link', { name: 'Materialer', exact: true }).click();
  await expectPage(page, 'materialer', 'Materialer');
  await page.goBack();
  await expectPage(page, 'hjaelp', 'Hjælp og dokumentation');
  await expect(
    navigation.getByRole('link', { name: 'Hjælp og dokumentation', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await expectPage(page, 'materialer', 'Materialer');
  expect(errors).toEqual([]);
});

test('bred skærm: Menu sammenklapper til ikoner med tooltip og åbner igen', async ({ page }) => {
  const errors = observeErrors(page);
  await page.goto('/');
  const menu = page.locator('.topbar').getByRole('button', { name: 'Menu', exact: true });
  const sidebar = page.locator('[data-slot="sidebar"][data-state]');
  const navigation = page.getByRole('navigation', { name: 'Navigation' });
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  const expanded = (await navigation.boundingBox())!;
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(sidebar).toHaveAttribute('data-collapsible', 'icon');
  await expect(page.locator('[data-slot="sidebar-gap"]')).toHaveCSS('width', '48px');
  const collapsed = (await navigation.boundingBox())!;
  expect(collapsed.width).toBeLessThan(expanded.width);
  await expect(navigation.getByRole('link')).toHaveCount(8);
  const materials = navigation.getByRole('link', { name: 'Materialer', exact: true });
  await expect(materials.locator('svg')).toBeVisible();
  await materials.hover();
  await expect(page.getByRole('tooltip')).toHaveText('Materialer');
  await materials.click();
  await expectPage(page, 'materialer', 'Materialer');
  await expect(materials).toHaveAttribute('aria-current', 'page');
  await menu.click();
  await expect(sidebar).toHaveAttribute('data-state', 'expanded');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Beregningsværktøj v0.6', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('390 px: skuffe, alle sider og lukning uden vandret rulning', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = observeErrors(page);
  await page.goto('/');
  await expectPage(page, 'dimensionering', 'Dimensionering');
  const menu = page.locator('.topbar').getByRole('button', { name: 'Menu', exact: true });
  const drawer = page.getByRole('dialog');
  const noHorizontalScroll = async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  };
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await noHorizontalScroll();
  for (const [key, name] of groups.flatMap((g) => [...g.items])) {
    await menu.click();
    await expect(drawer).toBeVisible();
    const bounds = (await drawer.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    await expect(drawer.getByText('Beregningsværktøj v0.6', { exact: true })).toBeVisible();
    await noHorizontalScroll();
    await drawer
      .getByRole('navigation', { name: 'Navigation' })
      .getByRole('link', { name, exact: true })
      .click();
    await expect(drawer).toHaveCount(0);
    await expectPage(page, key, name);
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await noHorizontalScroll();
  }
  await menu.click();
  await drawer.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await menu.click();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(menu).toBeFocused();
  expect(errors).toEqual([]);
});
