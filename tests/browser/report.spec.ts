import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

function observe(page: Page, baseURL: string) {
  const external: string[] = [],
    errors: string[] = [],
    local: string[] = [];
  const origin = new URL(baseURL).origin;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol)) {
      if (url.origin !== origin) external.push(request.url());
      else local.push(url.pathname);
    }
  });
  return { external, errors, local };
}
async function ready(page: Page) {
  await expect(page.getByTestId('compile-state')).toHaveAttribute('data-state', 'ready', {
    timeout: 90_000,
  });
  await expect(page.getByRole('link', { name: 'Hent PDF', exact: true })).toBeVisible();
}
test('felter, afsnit, automatisk lagring, dato og de tre nulstillinger', async ({
  page,
  baseURL,
}) => {
  const seen = observe(page, baseURL!);
  await page.goto('/#rapport');
  await expect(page.getByRole('heading', { name: 'Rapport', exact: true })).toBeVisible();
  for (const name of ['Sagsoplysninger', 'Indhold', 'Gennemsyn', 'Generér'])
    await expect(page.getByRole('button', { name: new RegExp(name) }).first()).toBeVisible();
  const today = await page.getByLabel('Dato', { exact: true }).inputValue();
  for (const [label, value] of [
    ['Projekt', 'MSL test'],
    ['Beskrivelse', ''],
    ['Omfang', 'Prøvesag'],
    ['Udføres for', 'Test'],
    ['Sagsbehandler', 'Ingeniør'],
    ['Sagsbehandler-mail', 'test@example.invalid'],
    ['Kontrol', 'Kontrolperson'],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel('Dato', { exact: true }).fill('2001-02-03');
  await page.getByRole('link', { name: 'Hjælp', exact: true }).click();
  await page.getByRole('link', { name: 'Rapport', exact: true }).click();
  await expect(page.getByLabel('Dato', { exact: true })).toHaveValue('2001-02-03');
  await page.getByRole('button', { name: 'Krav til komprimering', exact: true }).click();
  const editor = page.locator('#rap_tekst_krav_komprimering');
  const standard = await editor.inputValue();
  await editor.fill('');
  await page.getByLabel('Ustabiliseret opbygning', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Grundlag for beregning', exact: true }).click();
  await page.getByLabel('Øverste lag', { exact: true }).fill('Prøvemateriale');
  await page.getByLabel('Underbundens E-modul (Eᵤ)', { exact: true }).uncheck();
  await page.getByLabel('Vis endepunkter for 1/2 lag i designdiagram', { exact: true }).uncheck();
  await page.reload();
  for (const [label, value] of [
    ['Projekt', 'MSL test'],
    ['Beskrivelse', ''],
    ['Omfang', 'Prøvesag'],
    ['Udføres for', 'Test'],
    ['Sagsbehandler', 'Ingeniør'],
    ['Sagsbehandler-mail', 'test@example.invalid'],
    ['Kontrol', 'Kontrolperson'],
  ])
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
  await expect(page.getByLabel('Dato', { exact: true })).toHaveValue(today);
  await expect(page.getByLabel('Ustabiliseret opbygning', { exact: true })).not.toBeChecked();
  await expect(
    page.getByLabel('Vis endepunkter for 1/2 lag i designdiagram', { exact: true }),
  ).not.toBeChecked();
  await page.getByRole('button', { name: 'Grundlag for beregning', exact: true }).click();
  await expect(page.getByLabel('Øverste lag', { exact: true })).toHaveValue('Prøvemateriale');
  await expect(page.getByLabel('Underbundens E-modul (Eᵤ)', { exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'Krav til komprimering', exact: true }).click();
  await expect(editor).toHaveValue('');
  await page
    .locator('.report-editor')
    .filter({ has: editor })
    .getByRole('button', { name: 'Nulstil', exact: true })
    .click();
  await expect(editor).toHaveValue(standard);
  await editor.fill('Redigeret prøvetekst');
  await page.reload();
  await page.getByRole('button', { name: 'Krav til komprimering', exact: true }).click();
  await expect(editor).toHaveValue('Redigeret prøvetekst');
  await page.getByLabel('Dato', { exact: true }).fill('2001-02-03');
  await page
    .getByRole('button', { name: 'Nulstil tekster og valg til standard', exact: true })
    .click();
  await expect(editor).toHaveValue(standard);
  await expect(page.getByLabel('Ustabiliseret opbygning', { exact: true })).toBeChecked();
  await expect(page.getByLabel('Projekt', { exact: true })).toHaveValue('MSL test');
  await expect(page.getByLabel('Dato', { exact: true })).toHaveValue('2001-02-03');
  await page.getByRole('button', { name: 'Grundlag for beregning', exact: true }).click();
  await expect(page.getByLabel('Øverste lag', { exact: true })).toHaveValue('Stabilgrus SG II');
  await expect(page.getByLabel('Underbundens E-modul (Eᵤ)', { exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Nulstil felter', exact: true }).click();
  await expect(page.getByLabel('Projekt', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Dato', { exact: true })).toHaveValue(today);
  expect(seen.external).toEqual([]);
  expect(seen.errors).toEqual([]);
});

test('rapportkæden, lokal compiler/skrifter, PDF-download og revisionens spærring', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const seen = observe(page, baseURL!);
  await page.goto('/#dimensionering');
  await expect(page.getByRole('heading', { name: 'Dimensionering', exact: true })).toBeVisible();
  expect(
    seen.local.some((path) => path.endsWith('.wasm') || path.startsWith('/report/fonts/')),
  ).toBe(false);
  await page.getByRole('link', { name: 'Rapport', exact: true }).click();
  await page.getByLabel('Projekt', { exact: true }).fill('MSL test');
  await page.getByLabel('Dato', { exact: true }).fill('2026-09-29');
  await page.getByRole('button', { name: 'Generér rapport', exact: true }).click();
  await ready(page);
  console.log(
    `R4 første kompilering inklusive indlæsning: ${await page.getByTestId('compile-time').textContent()} ms`,
  );
  const downloaded = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Hent PDF', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('Dimensionering - MSL test - 2026-09-29.pdf');
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
  expect(bytes.length).toBeGreaterThan(1024);
  expect(bytes.toString('latin1')).toMatch(/\/BaseFont\s*\/[^\s]*Carlito/);
  expect(bytes.toString('latin1')).toMatch(/\/BaseFont\s*\/[^\s]*LiberationSans/);
  expect(
    new Set(seen.local.filter((path) => path.startsWith('/report/fonts/') && path.endsWith('.ttf')))
      .size,
  ).toBe(8);
  expect(seen.local.some((path) => path.endsWith('.wasm'))).toBe(true);
  await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
  await page.getByRole('link', { name: 'Rapport', exact: true }).click();
  await ready(page); // Liveforløbet fortsætter ved navigation uden ny Generér-handling.
  await expect(page.getByLabel('Dato', { exact: true })).toHaveValue('2026-09-29');
  const old = await page.getByTitle('PDF-forhåndsvisning', { exact: true }).getAttribute('src');
  await page.getByLabel('Projekt', { exact: true }).fill('Ny revision');
  await expect(page.getByRole('button', { name: 'Hent PDF', exact: true })).toBeDisabled();
  await expect(page.getByText('Forhåndsvisningen er forældet.', { exact: false })).toBeVisible();
  await page.getByLabel('Projekt', { exact: true }).fill('Seneste revision');
  await ready(page);
  await expect(page.getByTitle('PDF-forhåndsvisning', { exact: true })).not.toHaveAttribute(
    'src',
    old!,
  );
  await expect(page.getByRole('link', { name: 'Hent PDF', exact: true })).toHaveAttribute(
    'download',
    'Dimensionering - Seneste revision - 2026-09-29.pdf',
  );
  await page.getByLabel('Ustabiliseret opbygning', { exact: true }).uncheck();
  await page.getByLabel('1 lag geonet', { exact: true }).uncheck();
  await page.getByLabel('2 lag geonet', { exact: true }).uncheck();
  await expect(page.getByRole('button', { name: 'Generér rapport', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Hent PDF', exact: true })).toBeDisabled();
  await expect(
    page.getByText('Vælg mindst ét snit for at kunne generere rapporten.'),
  ).toBeVisible();
  expect(seen.external).toEqual([]);
  expect(seen.errors).toEqual([]);
});

test('afvist beregning giver originalens info og navigation', async ({ page, baseURL }) => {
  const seen = observe(page, baseURL!);
  await page.goto('/#dimensionering');
  await page.getByRole('radio', { name: 'Trafikklasse', exact: true }).check();
  await page.getByRole('radio', { name: 'T1', exact: true }).check();
  await page.getByRole('link', { name: 'Rapport', exact: true }).click();
  await expect(
    page.getByText(
      'Der skal først foretages en dimensionering med et valgt geonet, før rapporten kan genereres.',
      { exact: false },
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generér rapport', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Gå til Dimensionering', exact: true }).click();
  await expect(page).toHaveURL(/#dimensionering$/);
  await page.getByRole('link', { name: 'Hjælp', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Gå til Rapport', exact: true })).toHaveAttribute(
    'href',
    '#rapport',
  );
  expect(seen.external).toEqual([]);
  expect(seen.errors).toEqual([]);
});

test('dansk compilerfejl og nyt forsøg efter faktisk WASM-fejl', async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const seen = observe(page, baseURL!);
  let attempts = 0;
  await page.route('**/*.wasm', async (route) => {
    attempts += 1;
    if (attempts === 1) await route.abort('failed');
    else await route.continue();
  });
  await page.goto('/#rapport');
  await page.getByRole('button', { name: 'Generér rapport', exact: true }).click();
  await expect(page.getByTestId('compile-state')).toHaveAttribute('data-state', 'error', {
    timeout: 90_000,
  });
  await expect(page.getByRole('alert')).toContainText('WASM eller netværk');
  await expect(page.getByRole('button', { name: 'Hent PDF', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Generér rapport', exact: true }).click();
  await ready(page);
  expect(attempts).toBeGreaterThanOrEqual(2);
  expect(seen.external).toEqual([]);
  expect(seen.errors).toEqual([]);
});

test('faktisk skabelonfejl giver dansk diagnose uden download, og rettelse kan kompileres', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const seen = observe(page, baseURL!);
  let broken = true;
  await page.route('**/assets/layout-*.typ', async (route) => {
    if (!broken) return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, body: '#let broken = (\n' + (await response.text()) });
  });
  await page.goto('/#rapport');
  await page.getByRole('button', { name: 'Generér rapport', exact: true }).click();
  await expect(page.getByTestId('compile-state')).toHaveAttribute('data-state', 'error', {
    timeout: 90_000,
  });
  await expect(page.getByRole('alert')).toContainText(
    'Rapportens skabelon eller kildefiler indeholder en fejl.',
  );
  await expect(page.getByRole('alert')).toContainText(/layout.typ, linje \d+, kolonne \d+/);
  await expect(page.getByRole('button', { name: 'Hent PDF', exact: true })).toBeDisabled();
  broken = false;
  await page.reload(); // Versionerede skabelonaktiver genindlæses ved genåbning.
  await page.getByRole('button', { name: 'Generér rapport', exact: true }).click();
  await ready(page);
  expect(seen.external).toEqual([]);
  expect(seen.errors).toEqual([]);
});
