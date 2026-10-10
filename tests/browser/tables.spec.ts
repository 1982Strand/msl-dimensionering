import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { SESSION_STORAGE_KEY } from '../../src/engine/session-storage.ts';
import { standard_data_state } from '../../src/engine/auto-edit.ts';
const reference = JSON.parse(
  readFileSync(new URL('../cases/table-ui-cases.json', import.meta.url), 'utf8'),
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
  const curve = page.locator('.raw-chart svg [data-curve][data-name="1 lag geonet"]');
  await expect(curve).toBeVisible();
  const originalPath = (await curve.getAttribute('d'))!;
  await setCell(page, '1 lag tykkelse (cm) · Diagram 1 · Eᵤ 1', '87.3');
  await expect(curve).not.toHaveAttribute('d', originalPath);
  const editedPath = (await curve.getAttribute('d'))!;
  await expect(page.getByText('Standard: 86.7', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Materialer', exact: true }).click();
  await page.getByRole('button', { name: 'Fortryd', exact: true }).click();
  await page.getByRole('link', { name: 'Designdiagrammer', exact: true }).click();
  await expect(
    page.getByLabel('1 lag tykkelse (cm) · Diagram 1 · Eᵤ 1', { exact: true }),
  ).toHaveValue('86.7');
  await expect(curve).toHaveAttribute('d', originalPath);
  await page.getByRole('button', { name: 'Gentag', exact: true }).click();
  await expect(curve).toHaveAttribute('d', editedPath);
  await page.getByRole('button', { name: 'Vælg diagram 2', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Vælg diagram 2', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect((await saved(page)).data.designdiagrammer[0].rows[0].t_1_lag_cm).toBe(87.3);
  await page.getByRole('button', { name: 'Nulstil dette diagram', exact: true }).click();
  expect((await saved(page)).data.designdiagrammer[0].rows[0].t_1_lag_cm).toBe(87.3);
  await page.getByRole('button', { name: 'Vælg diagram 1', exact: true }).click();
  await expect(curve).toHaveAttribute('d', editedPath);
  await page.getByRole('button', { name: 'Nulstil dette diagram', exact: true }).click();
  await expect(curve).toHaveAttribute('d', originalPath);
  await expect(
    page.getByLabel('1 lag tykkelse (cm) · Diagram 1 · Eᵤ 1', { exact: true }),
  ).toHaveValue('86.7');
});

test('raw SVG highlights table points with decimal comma, arrow keys and Escape', async ({
  page,
}) => {
  await page.goto('/#diagrammer');
  const chart = page.getByRole('img', { name: 'Optegnet af tabellens værdier', exact: true });
  const canvas = page.getByRole('group', { name: /^Optegnet af tabellens værdier\./ });
  const tip = canvas.getByRole('status');
  const point = chart.locator('[data-curve-marker="0"][data-index="0"]');
  // Diagram 1's første ustabiliserede punkt står i tabellen ved Eᵤ 3.
  const cell = page.getByLabel('Ustabiliseret tykkelse (cm) · Diagram 1 · Eᵤ 3', {
    exact: true,
  });
  const thickness = Number(await cell.inputValue())
    .toFixed(1)
    .replace('.', ',');
  await point.hover({ force: true });
  await expect(tip).toContainText(`${thickness} cm`);
  await expect(tip).toContainText('Ustabiliseret');
  await expect(tip).toContainText('Eᵤ 3 MPa');
  await expect(tip).not.toContainText('3,0 MPa');
  await expect(canvas.locator('.personal-diagram-overlay path')).toHaveAttribute(
    'stroke-width',
    '3.5',
  );
  const ring = canvas.locator('.personal-diagram-overlay circle[r="8"]');
  await expect(ring).toBeVisible();
  expect(Number(await ring.getAttribute('cx'))).toBeCloseTo(
    Number(await point.getAttribute('cx')),
    2,
  );
  expect(Number(await ring.getAttribute('cy'))).toBeCloseTo(
    Number(await point.getAttribute('cy')),
    2,
  );
  await expect(chart.locator('[data-legend]')).toContainText('Ustabiliseret');
  await expect(chart.locator('[data-legend]')).toContainText('1 lag geonet');
  expect(await chart.locator('[tabindex]').count()).toBe(0);
  await canvas.focus();
  await canvas.press('ArrowUp');
  const nextThickness = Number(
    await page
      .getByLabel('Ustabiliseret tykkelse (cm) · Diagram 1 · Eᵤ 4', { exact: true })
      .inputValue(),
  )
    .toFixed(1)
    .replace('.', ',');
  await expect(tip).toContainText(`${nextThickness} cm`);
  await expect(tip).toContainText('Eᵤ 4 MPa');
  await canvas.press('ArrowDown');
  await expect(tip).toContainText(`${thickness} cm`);
  await expect(tip).toContainText('Eᵤ 3 MPa');
  await canvas.press('ArrowRight');
  await expect(tip).toContainText('1 lag geonet');
  await canvas.press('ArrowLeft');
  await expect(tip).toContainText('Ustabiliseret');
  await canvas.press('Escape');
  await expect(tip).toHaveCount(0);
  await expect(canvas.locator('.personal-diagram-overlay')).toHaveCount(0);
  await setCell(page, 'Ustabiliseret tykkelse (cm) · Diagram 1 · Eᵤ 3', '111.2');
  await point.hover({ force: true });
  await expect(tip).toContainText('111,2 cm');
  await expect(tip).toContainText('Eᵤ 3 MPa');
  await page.getByRole('button', { name: 'Fortryd', exact: true }).click();
  await point.hover({ force: true });
  await expect(tip).toContainText(`${thickness} cm`);
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
    await expect(page.locator('.raw-chart svg [data-curve]').first()).toBeVisible();
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
      await expect(page.locator('.raw-chart svg [data-curve]').first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: info.outputPath(`${hash}-mobile.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});

test('B-083: siden Designdiagrammer viser Eₒ og Eᵤ i MPa', async ({ page }) => {
  await page.goto('/#diagrammer');
  const main = page.locator('main');
  await expect(main.getByRole('heading', { level: 2 }).first()).toHaveText(
    /^Diagram \d — Eₒ = \d+ MPa, belastningsklasse \d$/,
  );
  await expect(main.getByRole('button', { name: 'Vælg diagram 4', exact: true })).toContainText(
    '80 MPa',
  );
  await expect(main.locator('.raw-chart svg')).toContainText('Bundmodul Eᵤ [MPa]');
  await expect(main.locator('.table-caption')).toContainText(/Ustabiliseret Eᵤ = \d+–\d+ MPa/);
  await expect(main).not.toContainText('MN/m²');
});
