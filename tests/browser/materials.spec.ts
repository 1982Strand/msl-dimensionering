import { test, expect } from '@playwright/test';
import { standard_data_state } from '../../src/engine/auto-edit.ts';
import { SESSION_STORAGE_KEY, fresh_saved_session } from '../../src/engine/session-storage.ts';
const first = standard_data_state().materialer[0];
const phiLabel = `φᵢ (°) · ${first.navn}`;

test('defaults, direct autosave, marker, filter and reload use actual localStorage', async ({
  page,
}) => {
  await page.goto('/#materialer');
  await expect(page.getByRole('heading', { name: 'Materialer', exact: true })).toBeVisible();
  await expect(page.getByLabel(phiLabel, { exact: true })).toHaveValue(String(first.phi));
  await page.getByLabel(phiLabel, { exact: true }).fill('39');
  await page.getByLabel(phiLabel, { exact: true }).press('Tab');
  await expect(page.getByRole('status')).toHaveText('Gemt i denne browser');
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SESSION_STORAGE_KEY,
  );
  expect(saved.session.data.materialer[0].phi).toBe(39);
  await expect(page.getByText('Standard: 37', { exact: true })).toBeVisible();
  await page.getByLabel('Vis kun ændringer').check();
  await expect(page.getByRole('textbox')).toHaveCount(2);
  await page.reload();
  await expect(page.getByLabel(phiLabel, { exact: true })).toHaveValue('39');
  await expect(page.getByRole('button', { name: 'Fortryd', exact: true })).toBeDisabled();
});
test('undo, redo, cell restore and global reset are persisted', async ({ page }) => {
  await page.goto('/#materialer');
  const phi = page.getByLabel(phiLabel, { exact: true });
  await phi.fill('39');
  await phi.press('Tab');
  await page.getByRole('button', { name: 'Fortryd', exact: true }).click();
  await expect(phi).toHaveValue('37');
  await page.getByRole('button', { name: 'Gentag', exact: true }).click();
  await expect(phi).toHaveValue('39');
  await page.getByRole('button', { name: `Gendan ${phiLabel}`, exact: true }).click();
  await expect(phi).toHaveValue('37');
  await page.getByRole('button', { name: 'Fortryd', exact: true }).click();
  await expect(phi).toHaveValue('39');
  await page.getByRole('button', { name: 'Nulstil til standard', exact: true }).click();
  await page.reload();
  await expect(phi).toHaveValue('37');
});
test('duplicates and input boundaries preserve last valid saved material', async ({ page }) => {
  await page.goto('/#materialer');
  const phi = page.getByLabel(phiLabel, { exact: true });
  await phi.fill('39');
  await phi.press('Tab');
  const before = await page.evaluate((key) => localStorage.getItem(key), SESSION_STORAGE_KEY);
  await phi.fill('61');
  await phi.press('Tab');
  await expect(phi).toHaveAttribute('aria-invalid', 'true');
  expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_STORAGE_KEY)).toBe(before);
  await phi.press('Escape');
  await expect(phi).toHaveValue('39');
  const name = page.getByLabel(`Materiale · ${first.navn}`, { exact: true });
  await name.fill(standard_data_state().materialer[1].navn);
  await name.press('Tab');
  await expect(page.getByRole('alert')).toContainText('Materialenavne skal være unikke.');
  expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_STORAGE_KEY)).toBe(before);
});
test('new material, removal, restore missing standard row and undo', async ({ page }) => {
  await page.goto('/#materialer');
  await page.getByRole('button', { name: 'Tilføj materiale', exact: true }).first().click();
  await page.getByLabel('Materiale · Nyt Bærelag', { exact: true }).fill('Testmateriale');
  await page.getByLabel('Materiale · Nyt Bærelag', { exact: true }).press('Tab');
  await page.getByLabel('φᵢ (°) · Nyt Bærelag', { exact: true }).fill('38');
  await page.getByLabel('φᵢ (°) · Nyt Bærelag', { exact: true }).press('Tab');
  await expect(page.getByLabel('φᵢ (°) · Testmateriale', { exact: true })).toHaveValue('38');
  await page.reload();
  await expect(page.getByLabel('φᵢ (°) · Testmateriale', { exact: true })).toHaveValue('38');
  await page.getByRole('button', { name: `Slet · ${first.navn}`, exact: true }).click();
  await expect(page.getByLabel(phiLabel, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Gendan række', exact: true }).click();
  await expect(page.getByLabel(phiLabel, { exact: true })).toHaveValue('37');
  await page.getByRole('button', { name: 'Fortryd', exact: true }).click();
  await expect(page.getByLabel(phiLabel, { exact: true })).toHaveCount(0);
});
test('empty optional field is retained after reopening', async ({ page }) => {
  await page.goto('/#materialer');
  const label = `Krav til geonet — maskestørrelse (mm) · ${first.navn}`;
  await page.getByLabel(label, { exact: true }).fill('');
  await page.getByLabel(label, { exact: true }).press('Tab');
  await page.reload();
  await expect(page.getByLabel(label, { exact: true })).toHaveValue('');
});
test('zero in an optional material field is displayed as the legacy normalised empty value', async ({
  page,
}) => {
  await page.goto('/#materialer');
  const field = page.getByLabel(`Maks. korn (mm) · ${first.navn}`, { exact: true });
  await field.fill('0');
  await field.press('Tab');
  await expect(field).toHaveValue('');
  await field.fill('0');
  await field.press('Tab');
  await expect(field).toHaveValue('');
  await page.reload();
  await expect(field).toHaveValue('');
});
test('corrupt storage is reported and never overwritten', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, 'broken'), SESSION_STORAGE_KEY);
  await page.goto('/#materialer');
  await expect(page.getByRole('alert')).toContainText('ikke overskrevet');
  expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_STORAGE_KEY)).toBe(
    'broken',
  );
  await expect(page.getByRole('heading', { name: 'Data kunne ikke indlæses' })).toBeVisible();
});
test('storage failure leaves active edit visible and never says saved', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await page.goto('/#materialer');
  const phi = page.getByLabel(phiLabel, { exact: true });
  await phi.fill('39');
  await phi.press('Tab');
  await expect(phi).toHaveValue('39');
  await expect(page.getByRole('status')).toHaveText('Ikke gemt');
  await expect(page.getByRole('alert')).toContainText('Ændringerne er stadig i denne åbne fane');
});
test('another tab cannot be overwritten without reloading', async ({ page, context }) => {
  await page.goto('/#materialer');
  const second = await context.newPage();
  await second.goto('/#materialer');
  await page.getByLabel(phiLabel, { exact: true }).fill('39');
  await page.getByLabel(phiLabel, { exact: true }).press('Tab');
  await expect(second.getByRole('alert')).toContainText('anden fane');
  await expect(second.getByLabel(phiLabel, { exact: true })).toBeDisabled();
  await second.getByRole('button', { name: 'Genindlæs data' }).click();
  await expect(second.getByLabel(phiLabel, { exact: true })).toHaveValue('39');
});
test('material edits preserve saved form values and other sections', async ({ page }) => {
  const session = fresh_saved_session();
  session.values = { eu: 15, report: { note: 'Bevar denne tekst' } };
  await page.addInitScript(({ key, text }) => localStorage.setItem(key, text), {
    key: SESSION_STORAGE_KEY,
    text: JSON.stringify({ schema: 1, session }),
  });
  await page.goto('/#materialer');
  await page.getByLabel(phiLabel, { exact: true }).fill('39');
  await page.getByLabel(phiLabel, { exact: true }).press('Tab');
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SESSION_STORAGE_KEY,
  );
  expect(saved.session.values).toEqual(session.values);
  expect(saved.session.data.designdiagrammer).toEqual(session.data.designdiagrammer);
});
test('desktop preview renders without page errors and mobile has contained table scrolling', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#materialer');
  await expect(page.getByRole('heading', { name: 'Materialer', exact: true })).toBeVisible();
  await page.screenshot({ path: 'output/materialer-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'output/materialer-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
