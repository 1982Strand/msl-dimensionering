import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { SESSION_STORAGE_KEY } from '../../src/engine/session-storage.ts';
import { standard_data_state } from '../../src/engine/auto-edit.ts';
const reference = JSON.parse(
  readFileSync(new URL('../../reference/table-ui-cases.json', import.meta.url), 'utf8'),
);
const saved = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).session, SESSION_STORAGE_KEY);
const setCell = async (page: Page, label: string, value: string) => {
  const field = page.getByLabel(label, { exact: true });
  await field.fill(value);
  await field.press('Tab');
};

test('diagram edits update actual chart, persist selected diagram, and share undo across pages', async ({
  page,
}) => {
  await page.goto('/#diagrammer');
  await expect(page.locator('.raw-chart .main-svg').first()).toBeVisible();
  await setCell(page, '1 lag tykkelse (cm) · Diagram 1 · Eᵤ 1', '87.3');
  await expect
    .poll(() =>
      page
        .locator('.raw-chart')
        .evaluate((el) => (el as unknown as { data: { x: number[] }[] }).data?.[1]?.x[0]),
    )
    .toBe(87.3);
  await expect(page.getByText('Standard: 86.7', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Materialer', exact: true }).click();
  await page.getByRole('button', { name: 'Fortryd', exact: true }).click();
  await page.getByRole('link', { name: 'Designdiagrammer', exact: true }).click();
  await expect(
    page.getByLabel('1 lag tykkelse (cm) · Diagram 1 · Eᵤ 1', { exact: true }),
  ).toHaveValue('86.7');
  await page.getByRole('button', { name: 'Gentag', exact: true }).click();
  await page.getByRole('button', { name: 'Vælg diagram 2', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Vælg diagram 2', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect((await saved(page)).data.designdiagrammer[0].rows[0].t_1_lag_cm).toBe(87.3);
  await page.getByRole('button', { name: 'Nulstil dette diagram', exact: true }).click();
  expect((await saved(page)).data.designdiagrammer[0].rows[0].t_1_lag_cm).toBe(87.3);
});

test('diagram rows support add, duplicate rejection, delete, cell and row restore', async ({
  page,
}) => {
  await page.goto('/#diagrammer');
  await page.getByRole('button', { name: 'Tilføj række', exact: true }).click();
  await setCell(page, 'Eᵤ (MPa) · Ny diagramrække', '99');
  await setCell(page, '1 lag tykkelse (cm) · Diagram 1 · Eᵤ 99', '20');
  await setCell(page, 'Eᵤ (MPa) · Diagram 1 · Eᵤ 99', '3');
  await expect(page.getByRole('alert')).toBeVisible();
  expect((await saved(page)).data.designdiagrammer[0].rows.at(-1).eu).toBe(99);
  await page.getByLabel('Eᵤ (MPa) · Diagram 1 · Eᵤ 99', { exact: true }).press('Escape');
  await page.getByRole('button', { name: 'Slet · Diagram 1 · Eᵤ 99', exact: true }).click();
  await page.getByRole('button', { name: 'Slet · Diagram 1 · Eᵤ 1', exact: true }).click();
  await page.getByRole('button', { name: 'Gendan række', exact: true }).click();
  await expect(
    page.getByLabel('1 lag tykkelse (cm) · Diagram 1 · Eᵤ 1', { exact: true }),
  ).toHaveValue('86.7');
  await setCell(page, '1 lag tykkelse (cm) · Diagram 1 · Eᵤ 1', '88');
  await page
    .getByRole('button', { name: 'Gendan 1 lag tykkelse (cm) · Diagram 1 · Eᵤ 1', exact: true })
    .click();
  expect((await saved(page)).data.designdiagrammer).toEqual(standard_data_state().designdiagrammer);
});

test('diagram missing value and explicit zero remain distinct after reopening', async ({
  page,
}) => {
  await page.goto('/#diagrammer');
  await setCell(page, 'Ustabiliseret tykkelse (cm) · Diagram 1 · Eᵤ 1', '0');
  await setCell(page, '1 lag tykkelse (cm) · Diagram 1 · Eᵤ 1', '');
  await page.reload();
  await expect(
    page.getByLabel('Ustabiliseret tykkelse (cm) · Diagram 1 · Eᵤ 1', { exact: true }),
  ).toHaveValue('0');
  await expect(
    page.getByLabel('1 lag tykkelse (cm) · Diagram 1 · Eᵤ 1', { exact: true }),
  ).toHaveValue('');
  const before = await saved(page);
  await setCell(page, '1 lag tykkelse (cm) · Diagram 1 · Eᵤ 1', '-1');
  await expect(
    page.getByLabel('1 lag tykkelse (cm) · Diagram 1 · Eᵤ 1', { exact: true }),
  ).toHaveAttribute('aria-invalid', 'true');
  expect(await saved(page)).toEqual(before);
});

test('VejDim edit recalculates correlation exactly as original and CSV contains edited values', async ({
  page,
}) => {
  await page.goto('/#vejdim');
  await setCell(page, 'SG (mm) · T1 · Eᵤ 3', '330');
  const matrix = page.getByRole('table', { name: 'Ækvivalent Eₒ', exact: true });
  const rendered = await matrix
    .locator('tbody tr')
    .evaluateAll((rows) =>
      rows.map((row) => Array.from(row.querySelectorAll('td'), (c) => c.textContent)),
    );
  expect(rendered).toEqual(
    reference.presentation[1].expected.map((row: Record<string, string>) => Object.values(row)),
  );
  await expect(page.getByLabel('Ubundet (mm) · T1 · Eᵤ 3', { exact: true })).toHaveText('778');
  // 458 is a valid legacy thickness even though the spin increment is 10 mm.
  await setCell(page, 'BL (mm) · T1 · Eᵤ 3', '458');
  expect((await saved(page)).data.vejdim_koersel_raekker[0].t_BL_mm).toBe(458);
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Hent som CSV', exact: true }).click();
  const download = await event;
  expect(download.suggestedFilename()).toBe('vejdim_koersler.csv');
  const path = await download.path();
  const csv = readFileSync(path!, 'utf8');
  expect(csv.startsWith('\uFEFFTrafikklasse;Eᵤ (MPa);')).toBeTruthy();
  expect(csv).toContain(';330.0;BL II U≤3;458.0;788.0;828.0;');
  await page.reload();
  await expect(page.getByLabel('BL (mm) · T1 · Eᵤ 3', { exact: true })).toHaveValue('458');
  await page.getByRole('button', { name: 'Nulstil kørsler', exact: true }).click();
  expect((await saved(page)).data.vejdim_koersel_raekker).toEqual(
    standard_data_state().vejdim_koersel_raekker,
  );
});

test('diagram edits also update VejDim matrix, explanation and saved data across navigation', async ({
  page,
}) => {
  await page.goto('/#vejdim');
  const example = page.getByLabel('Regneeksempel', { exact: true });
  const before = await example.innerText();
  await page.getByRole('link', { name: 'Designdiagrammer', exact: true }).click();
  await page.getByRole('button', { name: 'Vælg diagram 4', exact: true }).click();
  await setCell(page, 'Ustabiliseret tykkelse (cm) · Diagram 4 · Eᵤ 15', '65');
  await page.getByRole('link', { name: 'Trafikklasse-korrelation', exact: true }).click();
  await expect.poll(() => example.innerText()).not.toBe(before);
  await page.getByRole('button', { name: 'Fortryd', exact: true }).click();
  await expect.poll(() => example.innerText()).toBe(before);
});

test('all six scans and charts render; desktop and mobile tables stay inside the page', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#diagrammer');
  for (let n = 1; n <= 6; n++) {
    await page.getByRole('button', { name: `Vælg diagram ${n}`, exact: true }).click();
    await expect(page.locator('.raw-chart .main-svg').first()).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('.diagram-figures img')
          .evaluate((el) => (el as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  await page.screenshot({ path: info.outputPath('diagram-desktop.png'), fullPage: true });
  await page.getByRole('link', { name: 'Trafikklasse-korrelation', exact: true }).click();
  await page.screenshot({ path: info.outputPath('vejdim-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const hash of ['diagrammer', 'vejdim']) {
    await page.goto(`/#${hash}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if (hash === 'diagrammer')
      await expect(page.locator('.raw-chart .main-svg').first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: info.outputPath(`${hash}-mobile.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});
