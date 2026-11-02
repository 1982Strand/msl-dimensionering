import { test, expect, type Browser, type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import {
  fresh_saved_session,
  SESSION_STORAGE_KEY,
  type SavedSession,
} from '../../src/engine/session-storage.ts';

// Køres mod dist-offentlig (VITE_UDGAVE=offentlig), se playwright.config.ts.
test('offentlig udgave: appen åbner på Dimensionering', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Dimensionering', exact: true, level: 1 }),
  ).toBeVisible();
});

test('Rapport er skjult, og et direkte rapportlink går til Dimensionering', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Rapport' })).toHaveCount(0);
  await page.goto('/#rapport');
  await expect(page).toHaveURL(/#dimensionering$/);
  await expect(
    page.getByRole('heading', { name: 'Dimensionering', exact: true, level: 1 }),
  ).toBeVisible();
});

test('designdiagrammer og korrelation vises uden redigeringskontroller', async ({ page }) => {
  await page.goto('/#diagrammer');
  await expect(
    page.getByText('Tabellerne er appens standard og kan ikke rettes i denne udgave.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tilføj række', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Gem diagram', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Indlæs diagram …', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Fortryd', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Gentag', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Nulstil alle diagramdata til standard', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.diagram-table input')).toHaveCount(0);

  await page.goto('/#vejdim');
  await expect(
    page.getByText('Tabellerne er appens standard og kan ikke rettes i denne udgave.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fortryd', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Gentag', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nulstil kørsler', exact: true })).toHaveCount(0);
  await expect(page.locator('.runs-table input')).toHaveCount(0);
});

test('materialer kan fortsat redigeres', async ({ page }) => {
  await page.goto('/#materialer');
  const input = page.locator('.materials-table input').first();
  await expect(input).toBeEnabled();
  const before = await input.inputValue();
  await input.fill('Offentlig testmateriale');
  await input.press('Enter');
  await expect(input).toHaveValue('Offentlig testmateriale');
  expect(before).not.toBe('Offentlig testmateriale');
});

test('kun visningsindstillingerne er aktive', async ({ page }) => {
  await page.goto('/#indstillinger');
  await expect(
    page.getByText('Kun visningsindstillingerne kan ændres; de øvrige er appens standard.'),
  ).toBeVisible();
  // Playwright regner kun formularfelter for låste; derfor kontrolleres radioknapperne.
  const radio = (key: string) =>
    page.locator(`fieldset[aria-labelledby="${key}-label"] [role="radio"]`).first();
  await expect(radio('ind_opb_enhed')).toBeEnabled();
  for (const key of [
    'ind_opb_paaskrift',
    'ind_opb_maal_streg',
    'ind_opb_maal_tal',
    'ind_opb_signatur',
    'ind_afr_vis_eksakt',
  ])
    await expect(page.locator(`#${key}`)).toBeEnabled();
  await expect(page.locator('#ind_afr_trin')).toBeDisabled();
  await expect(radio('ind_afr_phi')).toBeDisabled();
  await expect(radio('ind_lf_fordeling')).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Nulstil minimumstykkelser', exact: true }),
  ).toBeDisabled();
});

async function resultater(page: Page) {
  const values = page.locator('.m9-result-cards .m9-result-value strong');
  await expect(values.first()).toBeVisible();
  return values.allTextContents();
}

async function sideMedSession(browser: Browser, session: SavedSession) {
  const context = await browser.newContext();
  await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: SESSION_STORAGE_KEY,
    value: JSON.stringify({ schema: 1, session }),
  });
  return context.newPage();
}

test('ændringer af låste data i browserlageret ignoreres ved åbning', async ({ browser }) => {
  // Begge sessioner har samme visningsindstilling; kun den ene har ændrede, låste data.
  const standard = fresh_saved_session();
  standard.data.indstillinger.afrunding.vis_eksakt = true;
  const changed = structuredClone(standard);
  for (const diagram of changed.data.designdiagrammer)
    for (const row of diagram.rows) row.t_uarmeret_cm = (row.t_uarmeret_cm ?? 0) + 100;
  changed.data.indstillinger.afrunding.trin_mm = 10;

  const reference = await sideMedSession(browser, standard);
  await reference.goto('/#dimensionering');
  const expected = await resultater(reference);
  await reference.context().close();

  const seeded = await sideMedSession(browser, changed);
  await seeded.goto('/#dimensionering');
  expect(await resultater(seeded)).toEqual(expected);
  await seeded.goto('/#indstillinger');
  await expect(seeded.locator('#ind_afr_vis_eksakt')).toBeChecked();
  await seeded.context().close();
});

test('axe finder ingen tilgængelighedsfejl på Designdiagrammer og Indstillinger', async ({
  page,
}) => {
  for (const route of ['diagrammer', 'indstillinger']) {
    await page.goto(`/#${route}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.map((violation) => violation.id),
      route,
    ).toEqual([]);
  }
});
