import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('lokal PDF-compiler, skrifter, diagnose og nyt forsøg', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const external: string[] = [];
  const local: string[] = [];
  const origin = new URL(baseURL!).origin;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      if (url.origin !== origin) external.push(request.url());
      else local.push(url.pathname);
    }
  });
  await page.goto('/#dimensionering');
  await expect(page.getByRole('heading', { name: 'Dimensionering', exact: true })).toBeVisible();
  expect(local.some((path) => path.endsWith('.wasm'))).toBe(false);
  expect(local.some((path) => /snippet-|wasm-pack-shim/.test(path))).toBe(false);
  await page.goto('/#rapport-kompilering');
  const status = page.getByTestId('compile-state');
  await expect(status).toHaveAttribute('data-state', 'ready', { timeout: 90_000 });
  const first = await page.getByTestId('compile-time').textContent();
  console.log(`R2 første kompilering (inkl. indlæsning): ${first} ms`);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Hent PDF' }).click();
  const download = await downloadEvent;
  const bytes = await readFile((await download.path())!);
  expect(bytes.length).toBeGreaterThanOrEqual(1024);
  expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
  expect(bytes.toString('latin1')).toMatch(/\/BaseFont\s*\/[^\s]*Carlito/);
  expect(bytes.toString('latin1')).toMatch(/\/BaseFont\s*\/[^\s]*LiberationSans/);
  console.log(
    `R2 PDF: ${bytes.length} bytes; ${bytes.toString('latin1').match(/\/Creator\s*\([^)]*\)/)?.[0] ?? 'ingen Creator-metadata'}`,
  );
  const fonts = local.filter((path) => path.startsWith('/report/fonts/') && path.endsWith('.ttf'));
  expect(new Set(fonts).size).toBe(8);
  expect(local.some((path) => path.endsWith('.wasm'))).toBe(true);
  await page.getByRole('button', { name: 'Lav syntaksfejl' }).click();
  await expect(status).toHaveAttribute('data-state', 'error');
  await expect(page.getByRole('alert')).toContainText(
    'Rapportens skabelon eller kildefiler indeholder en fejl.',
  );
  await expect(page.getByRole('alert')).toContainText('rapport.typ, linje 12, kolonne 15');
  await expect(page.getByRole('link', { name: 'Hent PDF' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Kompilér gyldig rapport' }).click();
  await expect(status).toHaveAttribute('data-state', 'ready');
  await expect(page.getByRole('link', { name: 'Hent PDF' })).toBeVisible();
  const second = await page.getByTestId('compile-time').textContent();
  console.log(`R2 anden gyldige kompilering (genbrug): ${second} ms`);
  expect(external).toEqual([]);
});

test('nyt forsøg efter faktisk WASM-indlæsningsfejl', async ({ page }) => {
  test.setTimeout(120_000);
  let attempts = 0;
  await page.route('**/*.wasm', async (route) => {
    attempts += 1;
    if (attempts === 1) await route.abort('failed');
    else await route.continue();
  });
  await page.goto('/#rapport-kompilering');
  await expect(page.getByTestId('compile-state')).toHaveAttribute('data-state', 'error');
  await expect(page.getByRole('alert')).toContainText('WASM eller netværk');
  await expect(page.getByRole('link', { name: 'Hent PDF' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Kompilér gyldig rapport' }).click();
  await expect(page.getByTestId('compile-state')).toHaveAttribute('data-state', 'ready', {
    timeout: 90_000,
  });
  expect(attempts).toBeGreaterThanOrEqual(2);
});
