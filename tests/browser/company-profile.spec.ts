import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { DEFAULT_COMPANY_PROFILE } from '../../src/report/profile-defaults.ts';
import { PROFILE_STORAGE_KEY } from '../../src/report/profile-storage.ts';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64',
);
function observe(page: Page, baseURL: string) {
  const errors: string[] = [],
    external: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (['http:', 'https:'].includes(u.protocol) && u.origin !== new URL(baseURL).origin)
      external.push(r.url());
  });
  return { errors, external };
}
async function ready(page: Page, old?: string | null) {
  await expect(page.getByTestId('profile-save-state')).toHaveAttribute('data-state', 'saved');
  await expect(page.getByTestId('compile-state')).toHaveAttribute('data-state', 'ready', {
    timeout: 90_000,
  });
  await expect(page.getByRole('link', { name: 'Hent PDF', exact: true })).toBeVisible();
  const frame = page.getByTitle('PDF-forhåndsvisning', { exact: true });
  if (old) await expect(frame).not.toHaveAttribute('src', old);
  return frame.getAttribute('src');
}
async function exported(page: Page) {
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Eksportér profil', exact: true }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe('firmaprofil.json');
  return readFile((await file.path())!, 'utf8');
}
async function stored(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).current.profile,
    PROFILE_STORAGE_KEY,
  );
}

test('R5 live revision, logo, feltfejl, genåbning, eksport/import og nulstilling', async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(180_000);
  const seen = observe(page, baseURL!);
  await page.goto('/#rapport');
  await page.getByRole('tab', { name: 'Firmaprofil', exact: true }).click();
  let old = await ready(page);
  for (const [label, value] of [
    ['Top (mm)', '40'],
    ['Firmafarve', '#123456'],
    ['Overskrift 1', 'Komprimering – prøve:'],
  ]) {
    const revision = await page.getByTestId('compile-state').getAttribute('data-revision');
    await page.getByLabel(label, { exact: true }).fill(value);
    await expect(page.getByRole('button', { name: 'Hent PDF', exact: true })).toBeDisabled();
    old = await ready(page, old);
    expect(await page.getByTestId('compile-state').getAttribute('data-revision')).not.toBe(
      revision,
    );
  }
  await page
    .getByLabel('Logofil', { exact: true })
    .setInputFiles({ name: 'test-logo.png', mimeType: 'image/png', buffer: png });
  old = await ready(page, old);
  await expect(page.getByAltText('Aktuelt firmalogo')).toHaveAttribute(
    'src',
    /^data:image\/png;base64,/,
  );
  const downloading = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Hent PDF', exact: true }).click();
  const pdf = await readFile((await (await downloading).path())!);
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  expect(pdf.toString('latin1')).toMatch(/\/Subtype\s*\/Image/);
  expect(pdf.toString('latin1')).toMatch(/\/Width\s+1\b/);
  await page.getByLabel('Top (mm)', { exact: true }).fill('14');
  await expect(page.getByLabel('Top (mm)', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.getByText('Angiv en værdi mellem 15 og 60.', { exact: true })).toBeVisible();
  expect((await stored(page)).margener_mm.top).toBe(40);
  await expect(page.getByTitle('PDF-forhåndsvisning', { exact: true })).toHaveAttribute(
    'src',
    old!,
  );
  await expect(page.getByRole('link', { name: 'Hent PDF', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Firmaprofil', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  old = await ready(page);
  await expect(page.getByLabel('Top (mm)', { exact: true })).toHaveValue('40');
  await expect(page.getByLabel('Firmafarve', { exact: true })).toHaveValue('#123456');
  await expect(page.getByLabel('Overskrift 1', { exact: true })).toHaveValue(
    'Komprimering – prøve:',
  );
  await expect(page.getByAltText('Aktuelt firmalogo')).toHaveAttribute(
    'src',
    /^data:image\/png;base64,/,
  );
  const json = await exported(page);
  expect(JSON.parse(json).logo).toContain('data:image/png;base64,');
  await page.getByRole('button', { name: 'Flyt afsnit 1 ned', exact: true }).click();
  old = await ready(page, old);
  await expect(page.getByLabel('Overskrift 2', { exact: true })).toHaveValue(
    'Komprimering – prøve:',
  );
  await page.getByRole('button', { name: 'Flyt afsnit 2 op', exact: true }).click();
  old = await ready(page, old);
  expect(JSON.parse(await exported(page))).toEqual(JSON.parse(json));
  page.once('dialog', (d) => void d.dismiss());
  await page.getByRole('button', { name: 'Nulstil firmaprofil til standard', exact: true }).click();
  expect((await stored(page)).margener_mm.top).toBe(40);
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Nulstil firmaprofil til standard', exact: true }).click();
  old = await ready(page, old);
  expect(await stored(page)).toEqual(DEFAULT_COMPANY_PROFILE);
  await expect(page.getByAltText('Aktuelt firmalogo')).toHaveAttribute(
    'src',
    /\/report\/logo\/byggros_logo.jpeg$/,
  );
  await page.getByLabel('Profilfil', { exact: true }).setInputFiles({
    name: 'firmaprofil.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });
  old = await ready(page, old);
  expect(JSON.parse(await exported(page))).toEqual(JSON.parse(json));
  const bad = JSON.parse(json);
  bad.profile.margener_mm.top = 100;
  await page.getByLabel('Profilfil', { exact: true }).setInputFiles({
    name: 'ugyldig.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(bad)),
  });
  await expect(page.getByRole('alert')).toContainText('margener_mm.top');
  expect(JSON.parse(await exported(page))).toEqual(JSON.parse(json));
  await page.getByRole('tab', { name: 'Rapport', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Hent PDF', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Firmaprofil', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const lastField = await page
    .getByRole('button', { name: 'Importér profil …', exact: true })
    .boundingBox();
  const preview = await page.getByRole('complementary', { name: 'Aktuel rapport' }).boundingBox();
  expect(preview!.y).toBeGreaterThan(lastField!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({ path: info.outputPath('firmaprofil.png'), fullPage: true });
  expect(seen.errors).toEqual([]);
  expect(seen.external).toEqual([]);
});

test('R5 faktisk IndexedDB-fejl bevarer profil og logo i aktiv visning og efter genåbning', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const seen = observe(page, baseURL!);
  await page.goto('/#rapport');
  await page.getByRole('tab', { name: 'Firmaprofil', exact: true }).click();
  let old = await ready(page);
  await page.getByLabel('Top (mm)', { exact: true }).fill('40');
  old = await ready(page, old);
  const before = await stored(page);
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('Test: lageret er fuldt', 'QuotaExceededError');
    };
  });
  await page
    .getByLabel('Logofil', { exact: true })
    .setInputFiles({ name: 'test-logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByTestId('profile-save-state')).toHaveAttribute('data-state', 'error');
  await expect(page.getByRole('alert')).toContainText('sidst konsistente profil');
  expect(await stored(page)).toEqual(before);
  await expect(page.getByAltText('Aktuelt firmalogo')).toHaveAttribute('src', /byggros_logo.jpeg$/);
  await page.reload();
  await ready(page);
  expect(await stored(page)).toEqual(before);
  expect(seen.errors).toEqual([]);
  expect(seen.external).toEqual([]);
});
