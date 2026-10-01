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
// En ny revision kan starte lige efter »ready«; vent til tilstand og download står stabilt samtidig.
async function ready(page: Page) {
  await expect(async () => {
    await expect(page.getByTestId('compile-state')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByRole('link', { name: 'Hent PDF', exact: true })).toBeVisible({
      timeout: 1_000,
    });
  }).toPass({ timeout: 90_000 });
}

test('B-046: tekstværktøjer, afsnitsfravalg/revision og diagramvalg i diagramkortet', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const seen = observe(page, baseURL!);
  await page.goto('/#rapport');
  await page.getByRole('button', { name: 'Udførelse', exact: true }).click();
  const section = page.locator('.report-step-2 .dim-expander-card').filter({
    has: page.locator('#rap_tekst_udfoerelse'),
  });
  const field = section.locator('textarea');
  await field.fill('Valgt tekst\nAnden linje');
  await field.evaluate((el: HTMLTextAreaElement) => {
    el.focus();
    el.setSelectionRange(0, 5);
  });
  await section.getByRole('button', { name: 'Fed', exact: true }).click();
  await expect(field).toHaveValue('**Valgt** tekst\nAnden linje');
  await expect(field).toBeFocused();
  await expect
    .poll(() => field.evaluate((el: HTMLTextAreaElement) => [el.selectionStart, el.selectionEnd]))
    .toEqual([2, 7]);
  await field.evaluate((el: HTMLTextAreaElement) => {
    el.setSelectionRange(0, el.value.length);
  });
  await section.getByRole('button', { name: 'Punkt', exact: true }).click();
  await expect(field).toHaveValue('• **Valgt** tekst\n• Anden linje');
  await expect(field).toBeFocused();
  await expect
    .poll(() => field.evaluate((el: HTMLTextAreaElement) => [el.selectionStart, el.selectionEnd]))
    .toEqual([2, 31]);

  const diagram = page
    .locator('.report-figure')
    .filter({ has: page.getByRole('heading', { name: 'Designdiagram', exact: true }) });
  await expect(diagram.locator('input[type=checkbox]')).toHaveCount(3);
  await expect(page.locator('.report-cut-choices input[type=checkbox]')).toHaveCount(4);
  await diagram
    .getByLabel("Vis 'Indtastet opbygning'-prik i designdiagram", { exact: true })
    .uncheck();
  await diagram.getByRole('checkbox', { name: 'Personligt designdiagram', exact: true }).uncheck();
  await expect(diagram).toBeVisible();
  await expect(diagram.locator('svg')).toHaveCount(0);
  await expect(diagram.getByLabel('Vis endepunkter for 1/2 lag i designdiagram')).toBeDisabled();

  await page.getByRole('button', { name: 'Generér rapport', exact: true }).click();
  await ready(page);
  // Den varme compiler kan afslutte før en assertion; gem mellemtilstanden i DOM-observatøren.
  await page.evaluate(() => {
    const state = { disabled: false, stale: false };
    (window as unknown as { __b046: typeof state }).__b046 = state;
    new MutationObserver(() => {
      if (
        [...document.querySelectorAll('button')].some(
          (b) => b.textContent?.trim() === 'Hent PDF' && b.disabled,
        )
      )
        state.disabled = true;
      if (document.body.textContent?.includes('Forhåndsvisningen er forældet.')) state.stale = true;
    }).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  });
  await section.getByLabel('Medtag i rapporten', { exact: true }).uncheck();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __b046: Record<string, boolean> }).__b046),
    )
    .toEqual({ disabled: true, stale: true });
  await ready(page);
  await page.reload();
  await page.getByRole('button', { name: 'Udførelse', exact: true }).click();
  await expect(field).toHaveValue('• **Valgt** tekst\n• Anden linje');
  await expect(section.getByLabel('Medtag i rapporten', { exact: true })).not.toBeChecked();
  await expect(
    diagram.getByRole('checkbox', { name: 'Personligt designdiagram', exact: true }),
  ).not.toBeChecked();
  await diagram.getByRole('checkbox', { name: 'Personligt designdiagram', exact: true }).check();
  await expect(diagram.getByRole('img', { name: 'Personligt designdiagram' })).toBeVisible();
  await expect(
    diagram.getByLabel("Vis 'Indtastet opbygning'-prik i designdiagram", { exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole('button', { name: 'Nulstil tekster og valg til standard', exact: true })
    .click();
  await expect(section.getByLabel('Medtag i rapporten', { exact: true })).toBeChecked();
  await expect(
    diagram.getByLabel("Vis 'Indtastet opbygning'-prik i designdiagram", { exact: true }),
  ).toBeChecked();
  expect(seen.external).toEqual([]);
  expect(seen.errors).toEqual([]);
});
test('faste rapportkort og synlige formularer ved 1440 og 390 px', async ({ page }, info) => {
  await page.goto('/#rapport');
  await expect(page.locator('.report-form > .section-card.settings-card')).toHaveCount(4);
  await expect(page.locator('.report-step-2 .dim-expander-card')).toHaveCount(8);
  for (const name of ['Sagsoplysninger', 'Indhold', 'Gennemsyn', 'Generér']) {
    await expect(page.getByRole('heading', { name: new RegExp(name) }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(`^\\d ${name}`) })).toHaveCount(0);
  }
  const project = await page.getByLabel('Projekt', { exact: true }).boundingBox();
  const description = await page.getByLabel('Beskrivelse', { exact: true }).boundingBox();
  expect(description!.x).toBeGreaterThan(project!.x + project!.width);
  expect(description!.y).toBe(project!.y);
  const cuts = await page
    .locator('.report-cut-choices input')
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
  expect(cuts).toHaveLength(4);
  expect(new Set(cuts).size).toBe(1);
  await page.getByRole('button', { name: 'Krav til komprimering', exact: true }).click();
  for (const id of ['rap_projekt', 'rap_beskrivelse', 'rap_dato', 'rap_tekst_krav_komprimering']) {
    const field = page.locator(`#${id}`);
    await expect(field).toBeVisible();
    await expect(field).toHaveCSS('border-top-style', 'solid');
    await expect(field).toHaveCSS('border-top-width', '1px');
  }
  await page.screenshot({ path: info.outputPath('report-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const mobileProject = await page.getByLabel('Projekt', { exact: true }).boundingBox();
  const mobileDescription = await page.getByLabel('Beskrivelse', { exact: true }).boundingBox();
  expect(mobileDescription!.x).toBe(mobileProject!.x);
  expect(mobileDescription!.y).toBeGreaterThan(mobileProject!.y + mobileProject!.height);
  for (const figure of await page.locator('.report-figure svg').all()) {
    const box = await figure.boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  await page.screenshot({ path: info.outputPath('report-mobile.png'), fullPage: true });
});

test('felter, afsnit, automatisk lagring, dato og de tre nulstillinger', async ({
  page,
  baseURL,
}) => {
  const seen = observe(page, baseURL!);
  await page.goto('/#rapport');
  await expect(page.getByRole('heading', { name: 'Rapport', exact: true })).toBeVisible();
  for (const name of ['Sagsoplysninger', 'Indhold', 'Gennemsyn', 'Generér'])
    await expect(page.getByRole('heading', { name: new RegExp(name) }).first()).toBeVisible();
  const today = await page.getByLabel('Dato', { exact: true }).inputValue();
  for (const [label, value] of [
    ['Projekt', 'MSL test'],
    ['Beskrivelse', ''],
    ['Omfang', 'Prøvesag'],
    ['Udføres for', 'Test'],
    ['Sagsbehandler', 'Ingeniør'],
    ['Sagsbehandler-mail', 'test@example.invalid'],
    ['Kontrollant', 'Kontrolperson'], // B-048: gemt rap_kontrol er bevaret.
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel('Dato', { exact: true }).fill('2001-02-03');
  await page.getByRole('link', { name: 'Hjælp og dokumentation', exact: true }).click();
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
    ['Kontrollant', 'Kontrolperson'], // B-048.
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
  const downloaded = page.waitForEvent('download', {
    // Kun »Hent PDF«; headless Chromium kan også hente forhåndsvisningen som download.
    predicate: (d) => d.suggestedFilename().startsWith('Dimensionering - '),
  });
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
  // Med varm compiler er den nye revision klar på få millisekunder; mellemtilstanden
  // (spærret download og forældet forhåndsvisning) registreres derfor, mens den står i DOM.
  await page.evaluate(() => {
    const seen: Record<string, boolean> = { disabled: false, stale: false };
    (window as unknown as { __revision: Record<string, boolean> }).__revision = seen;
    const check = () => {
      if (
        [...document.querySelectorAll('button')].some(
          (b) => b.textContent?.trim() === 'Hent PDF' && b.disabled,
        )
      )
        seen.disabled = true;
      if (document.body.textContent?.includes('Forhåndsvisningen er forældet.')) seen.stale = true;
    };
    new MutationObserver(check).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  });
  await page.getByLabel('Projekt', { exact: true }).fill('Ny revision');
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __revision: Record<string, boolean> }).__revision,
      ),
    )
    .toEqual({ disabled: true, stale: true });
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
