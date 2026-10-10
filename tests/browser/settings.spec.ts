import { chooseOption } from './helpers/choose-option.ts';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { SESSION_STORAGE_KEY } from '../../src/engine/session-storage.ts';
import { elements, elementText, isBlock, type PageNode } from '../helpers/dimensioning-page.ts';
const pageReference: { cases: { id: string; page: PageNode[] }[] } = JSON.parse(
  readFileSync(new URL('../cases/settings-page-cases.json', import.meta.url), 'utf8'),
);
const original = JSON.parse(
  readFileSync(new URL('../cases/settings-ui-cases.json', import.meta.url), 'utf8'),
);
const saved = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).session, SESSION_STORAGE_KEY);
const number = async (page: Page, id: string, value: string) => {
  const input = page.locator(`#${id}`);
  await input.fill(value);
  await input.press('Tab');
};

test('opsummeringer og Gælder følger straks aktive valg og klassisk Standard', async ({ page }) => {
  const reference = (id: string) => pageReference.cases.find((c) => c.id === id)!.page;
  const applies = (id: string) =>
    elements(reference(id))
      .filter((node) => node.type === 'caption' && elementText(node)?.startsWith('Gælder:'))
      .map((node) => elementText(node)!);
  const headings = reference('IND-STD').filter(
    (node) =>
      isBlock(node) &&
      node.children.some(
        (child) => !isBlock(child) && elementText(child)?.includes('bg-trin-hoved'),
      ),
  );
  const summaries = headings.map((node) => {
    if (!isBlock(node)) throw new Error('Afsnitsblok mangler');
    return elementText(node.children[0] as { type: string })!.match(
      /<div class="bg-trin-opsum">(.*?)<\/div>/,
    )![1];
  });
  await page.goto('/#indstillinger');
  await expect(page.locator('[data-settings-summary]')).toHaveText(summaries);
  const marks = page.locator('[data-settings-caption]').filter({ hasText: /^Gælder:/ });
  await expect(marks).toHaveText(applies('IND-STD'));
  const distribution = page.getByRole('group', {
    name: 'Fordeling af lagtykkelsen på materialelagene',
    exact: true,
  });
  // B-058: »Gælder: …« er et mærke lige efter feltet.
  await expect(
    distribution.locator('..').locator('xpath=following-sibling::*[@data-settings-caption][1]'),
  ).toHaveText('Gælder: Brugerdefineret');
  await chooseOption(page, page.getByLabel('Oprundingstrin', { exact: true }), '100 mm');
  await expect(
    page.locator('#settings-afrunding').locator('..').locator('[data-settings-summary]'),
  ).toHaveText('100 mm · reduktion af oprundede tykkelser');
  await page.getByRole('checkbox', { name: 'Klassisk standardberegning', exact: true }).check();
  await expect(
    page.locator('#settings-standard').locator('..').locator('[data-settings-summary]'),
  ).toHaveText('klassisk standardberegning');
  await expect(marks).toHaveText(applies('IND-KLASSISK'));
  await page.getByRole('checkbox', { name: 'Klassisk standardberegning', exact: true }).uncheck();
  await expect(marks).toHaveText(applies('IND-STD'));
});

test('settings retain original defaults, bounds and dependent controls; changes persist', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#indstillinger');
  await expect(page.getByRole('heading', { name: 'Indstillinger', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(8);
  for (const widget of original.snapshots[0].widgets) {
    const control =
      widget.kind === 'radio'
        ? page.getByRole('group', { name: widget.label, exact: true }).getByRole('radio').first()
        : page.getByLabel(widget.label, { exact: true });
    if (widget.disabled) await expect(control).toBeDisabled();
    else await expect(control).toBeEnabled();
    if (widget.kind === 'checkbox') await expect(control).toBeChecked({ checked: widget.value });
    if (widget.kind === 'number') await expect(control).toHaveValue(String(widget.value));
  }
  await chooseOption(page, page.getByLabel('Oprundingstrin', { exact: true }), '100 mm');
  await expect(
    page.getByText('Eksempel: en beregnet lagtykkelse på 532 mm angives som 600 mm.', {
      exact: true,
    }),
  ).toBeVisible();
  const after = await saved(page);
  expect(after.data.indstillinger).toEqual({
    ...original.defaults,
    afrunding: { ...original.defaults.afrunding, trin_mm: 100 },
  });
  await page
    .getByRole('radio', {
      name: 'Et lag tyndere end grænsen lægges til laget ovenover',
      exact: true,
    })
    .check();
  await expect(page.locator('#ind_lf_restlag_graense')).toBeEnabled();
  await number(page, 'ind_lf_restlag_graense', '120');
  await page
    .getByRole('radio', {
      name: "Lagene gøres mindst så tykke som VD's mindste lagtykkelse",
      exact: true,
    })
    .check();
  await expect(page.locator('#ind_lf_restlag_graense')).toBeDisabled();
  await expect(page.locator('#ind_lf_vd_baerelag')).toBeEnabled();
  await page
    .getByRole('checkbox', {
      name: original.snapshots[0].widgets.find((w: { key: string }) => w.key === 'ind_lf_samlet')
        .label,
      exact: true,
    })
    .uncheck();
  await expect(
    page.getByRole('radio', { name: 'Tykkelsen øges til stabilgrusminimum', exact: true }),
  ).toBeEnabled();
  await page
    .getByRole('checkbox', {
      name: original.snapshots[0].widgets.find((w: { key: string }) => w.key === 'ind_std_klassisk')
        .label,
      exact: true,
    })
    .check();
  await expect(
    page.getByRole('radio', { name: 'Tykkelsen øges til stabilgrusminimum', exact: true }),
  ).toBeDisabled();
  await page.reload();
  expect((await saved(page)).data.indstillinger.lagfordeling.restlag_graense_mm).toBe(120);
  await expect(page.locator('#ind_lf_vd_baerelag')).toBeEnabled();
  await page.screenshot({ path: info.outputPath('settings-desktop.png') });
  expect(errors).toEqual([]);
});

test('minimum reset is scoped and tolerance changes reach actual correlation after navigation', async ({
  page,
}, info) => {
  await page.goto('/#indstillinger');
  await number(page, 'minimum-1', '225');
  await expect(page.getByText(/klasse 1: 225 mm anvendes som 250 mm/)).toBeVisible();
  await page.getByText('Eksempel', { exact: true }).click();
  await expect(page.getByRole('table', { name: 'Eksempel på stabilgrusminimum' })).toContainText(
    '250 mm stabilgrus',
  );
  await number(page, 'ind_yder_tol_over', '10');
  await number(page, 'ind_yder_tol_under', '10');
  await page.getByRole('button', { name: 'Nulstil minimumstykkelser', exact: true }).click();
  let state = await saved(page);
  expect(state.data.indstillinger.lagfordeling.minimum_mm).toEqual(
    original.defaults.lagfordeling.minimum_mm,
  );
  expect(state.data.indstillinger.yderomraade.tolerance_over_pct).toBe(10);
  await number(page, 'ind_yder_tol_under', '51');
  await expect(page.locator('#ind_yder_tol_under')).toHaveAttribute('aria-invalid', 'true');
  expect((await saved(page)).data.indstillinger.yderomraade.tolerance_under_pct).toBe(10);
  await page.locator('#ind_yder_tol_under').press('Escape');
  await page.getByRole('link', { name: 'Trafikklasse-korrelation', exact: true }).click();
  const row = page
    .getByRole('table', { name: 'Ækvivalent Eₒ', exact: true })
    .locator('tbody tr')
    .filter({ has: page.getByRole('cell', { name: 'T4', exact: true }) });
  await expect(row).toContainText('150* (+6,1 %)');
  await page.getByRole('link', { name: 'Indstillinger', exact: true }).click();
  await page.getByText('Målte afvigelser i korrelationen', { exact: true }).click();
  await expect(page.getByRole('table', { name: 'Målte afvigelser', exact: true })).toContainText(
    '+6,1 % · VejDim*',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#ind_yder_tol_over').scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: info.outputPath('settings-mobile.png') });
});
