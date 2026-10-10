import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { chooseOption } from './helpers/choose-option.ts';
import { chooseProduct } from './helpers/choose-product.ts';
import { standard_data_state } from '../../src/engine/auto-edit.ts';
import { dimensioningInput } from '../../src/engine/dimensioning-form.ts';
import { dimensioner } from '../../src/engine/dimensionering.ts';
import { beregn_alle_produkter } from '../../src/engine/products.ts';
import { productOverview, overviewColumns } from '../../src/engine/product-overview.ts';
import { SESSION_STORAGE_KEY } from '../../src/engine/session-storage.ts';
import { pageCases, pageCaseInput, elementText } from '../helpers/dimensioning-page.ts';
import { pageCoverage } from '../helpers/dimensioning-page-coverage.ts';

const saved = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).session, SESSION_STORAGE_KEY);
async function number(field: Locator, value: number) {
  await field.fill(String(value));
  await field.press('Tab');
}
async function setEu(page: Page, prefix: string, value: number) {
  const slider = page.locator(`#${prefix}_eu_slider`);
  await slider.focus();
  await slider.press('Home');
  for (let i = 1; i < value; i++) await slider.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuenow', String(value));
}

for (const c of [
  { id: 'std_eu_slider', mode: 'Eᵤ — E-modul', min: 1, max: 45, start: 10, step: 1 },
  { id: 'std_cv_slider', mode: 'Cv — vingestyrke', min: 0, max: 180, start: 60, step: 5 },
]) {
  test(`F-02.1/F-02.2: ${c.id}, standard, begge grænser og tastaturtrin`, async ({ page }) => {
    await page.goto('/#dimensionering');
    await page.getByRole('radio', { name: c.mode, exact: true }).check();
    const slider = page.locator(`#${c.id}`);
    await expect(slider).toHaveAttribute('role', 'slider');
    await expect(slider).toHaveAttribute('aria-valuemin', String(c.min));
    await expect(slider).toHaveAttribute('aria-valuemax', String(c.max));
    await expect(slider).toHaveAttribute('aria-valuenow', String(c.start));
    await slider.focus();
    await slider.press('End');
    await expect(slider).toHaveAttribute('aria-valuenow', String(c.max));
    await slider.press('ArrowRight');
    await expect(slider).toHaveAttribute('aria-valuenow', String(c.max));
    await slider.press('Home');
    await expect(slider).toHaveAttribute('aria-valuenow', String(c.min));
    await slider.press('ArrowLeft');
    await expect(slider).toHaveAttribute('aria-valuenow', String(c.min));
    await slider.press('ArrowRight');
    await expect(slider).toHaveAttribute('aria-valuenow', String(c.min + c.step));
  });
}

// Feltkontrakt: src/ui/Dimensioning.tsx:311–419; fejltekst: SettingField.tsx:239–243.
for (const c of [
  { id: 'bd_antal_lag', min: 1, max: 3, step: 1, invalid: [0, 4, 1.5] },
  { id: 'bd_t_0', min: 200, max: 2000, step: 50, invalid: [199, 2001] },
  { id: 'bd_phi_m_0', min: 20, max: 60, step: 0.5, invalid: [19.5, 60.5] },
  { id: 'bd_korn_m_0', min: 0, max: 500, step: 1, invalid: [-1, 501, 0.5] },
  { id: 'bd_phi_man', min: 20, max: 60, step: 0.5, invalid: [19.5, 60.5] },
]) {
  test(`F-02.6/F-02.7: ${c.id}, gyldige grænser og afvisning uden ændret resultat`, async ({
    page,
  }) => {
    await page.goto('/#dimensionering');
    await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
    if (c.id.includes('_m_'))
      await chooseOption(page, page.locator('#bd_mat_0'), 'Manuel indtastning');
    if (c.id === 'bd_phi_man') await page.locator('#bd_phi_override').check();
    const field = page.locator(`#${c.id}`);
    await expect(field).toHaveAttribute('min', String(c.min));
    await expect(field).toHaveAttribute('max', String(c.max));
    await expect(field).toHaveAttribute('step', String(c.step));
    for (const value of [c.max, c.min, c.min + c.step]) {
      await number(field, value);
      await expect(field).toHaveAttribute('aria-invalid', 'false');
      await expect(field).toHaveValue(String(value));
      expect((await saved(page)).values[c.id]).toBe(value);
      if (c.id === 'bd_antal_lag') await expect(page.locator('.m9-layer')).toHaveCount(value);
    }
    // Browserens native talfelt bruger det deklarerede trin ved ArrowUp.
    await number(field, c.min);
    await field.focus();
    await field.press('ArrowUp');
    await field.press('Tab');
    await expect(field).toHaveValue(String(c.min + c.step));
    const before = await saved(page);
    const result = await page.locator('.m9-result-block').innerText();
    for (const value of c.invalid) {
      await number(field, value);
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator(`#${c.id}-error`)).toHaveText(
        `Angiv et gyldigt tal fra ${c.min} til ${c.max}.`,
      );
      await expect(field).toHaveAttribute('aria-describedby', `${c.id}-error`);
      expect(await saved(page)).toEqual(before);
      expect(await page.locator('.m9-result-block').innerText()).toBe(result);
      await field.press('Escape');
      await expect(field).toHaveValue(String(c.min + c.step));
    }
  });
}

test('F-02.7: manuelt lag accepterer begge lagtyper og bevarer dem efter navigation', async ({
  page,
}) => {
  await page.goto('/#dimensionering');
  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  await chooseOption(page, page.locator('#bd_mat_0'), 'Manuel indtastning');
  for (const type of ['Bundsikring', 'Bærelag']) {
    await chooseOption(page, page.locator('#bd_lt_m_0'), type);
    const session = await saved(page);
    expect(dimensioningInput(session.values, session.data).materialer![0].lagtype).toBe(type);
    await page.getByRole('link', { name: 'Materialer', exact: true }).click();
    await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
    await expect(page.locator('#bd_lt_m_0')).toHaveText(type);
  }
});

test('F-02.10: alle syv produktkolonner sorterer begge veje med korrekt aria-sort', async ({
  page,
}) => {
  // Forventninger fra referencekontrolleret productOverview, src/engine/product-overview.ts:41–152.
  // Godkendte produktdata: tests/product-overview.test.ts / tests/cases/product-overview-cases.json.
  await page.goto('/#dimensionering');
  await page.getByRole('button', { name: 'Alle produkter · 20 produkter', exact: true }).click();
  const table = page.getByRole('table', { name: 'Alle produkter', exact: true });
  const input = dimensioningInput({}, standard_data_state());
  const result = dimensioner(input)!;
  const common = {
    eu: input.eu,
    eo: result.eo!,
    phi: result.phi,
    afrunding: result.afrunding,
    skala: result.skala,
    t_basis_table: input.t_basis_table,
    klasse_for_anbefaling: result.valgt_klasse,
  };
  const products = {
    one: beregn_alle_produkter({ ...common, lag_mode: '1_lag' }),
    two: beregn_alle_produkter({ ...common, lag_mode: '2_lag' }),
  };
  for (const [index, column] of overviewColumns.entries()) {
    const header = table.getByRole('columnheader').nth(index);
    for (const direction of [
      column.direction,
      column.direction === 'asc' ? 'desc' : 'asc',
    ] as const) {
      await header.getByRole('button').click();
      await expect(header).toHaveAttribute(
        'aria-sort',
        direction === 'asc' ? 'ascending' : 'descending',
      );
      for (let other = 0; other < overviewColumns.length; other++)
        if (other !== index)
          await expect(table.getByRole('columnheader').nth(other)).toHaveAttribute(
            'aria-sort',
            'none',
          );
      await expect(table.locator('tbody tr td:first-child')).toHaveText(
        productOverview({ ...products, sort: { column: column.key, direction } }).rows.map(
          (row) => row.name,
        ),
      );
    }
  }
});

test('F-04.3: VejDim viser alle 48 og vender tilbage til scrollområdet med ni', async ({
  page,
}) => {
  // DataTables.tsx:153,464–470: alle rækker forbliver i DOM, kun runs-scroll skifter.
  await page.goto('/#vejdim');
  const table = page.getByRole('table', { name: 'VejDim-kørsler', exact: true });
  const wrap = table.locator('..');
  await expect(table.locator('tbody tr')).toHaveCount(
    standard_data_state().vejdim_koersel_raekker.length,
  );
  await expect(wrap).toHaveClass(/runs-scroll/);
  await page.getByRole('button', { name: 'Vis alle 48', exact: true }).click();
  await expect(wrap).not.toHaveClass(/runs-scroll/);
  await expect(table.locator('tbody tr')).toHaveCount(48);
  await page.getByRole('button', { name: 'Vis kun de første 9', exact: true }).click();
  await expect(wrap).toHaveClass(/runs-scroll/);
  await expect(page.getByRole('button', { name: 'Vis alle 48', exact: true })).toBeVisible();
});

test('F-11.2: slettet standardmateriale bliver manuelt med original advarsel; nulstilling genskaber det', async ({
  page,
}) => {
  // Mulig afvigelse: src normaliserer valget, men har ingen tilsvarende advarsel.
  // Bevar assertionen: testen skal afsløre afvigelsen, ikke godkende manglende tekst.
  const name = 'Stabilgrus SGII 0-32';
  await page.goto('/#dimensionering');
  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  await expect(page.locator('#bd_mat_0')).toHaveText(name);
  await page.getByRole('link', { name: 'Materialer', exact: true }).click();
  await page.getByRole('button', { name: `Slet · ${name}`, exact: true }).click();
  await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
  await expect(page.locator('#bd_mat_0')).toHaveText('Manuel indtastning');
  await expect(page.locator('#bd_phi_m_0')).toBeVisible();
  await expect.poll(async () => (await saved(page)).values.bd_mat_0).toBe('Manuel indtastning');
  const warnings = await page.locator('main').innerText();
  await page.getByRole('link', { name: 'Materialer', exact: true }).click();
  await page.getByRole('button', { name: 'Nulstil til standard', exact: true }).click();
  await expect(page.getByLabel(`φᵢ (°) · ${name}`, { exact: true })).toHaveValue(
    String(standard_data_state().materialer.find((m) => m.navn === name)!.phi),
  );
  expect((await saved(page)).data.materialer).toEqual(standard_data_state().materialer);
  await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
  await chooseOption(page, page.locator('#bd_mat_0'), name);
  await expect(page.locator('#bd_mat_0')).toHaveText(name);
  expect(warnings).toContain(
    `Materialet '${name}' findes ikke længere i databasen. Laget er skiftet til manuel indtastning.`,
  );
});

test('F-11.3: Nulstil alle diagramdata genskaber flere ændrede diagrammer og gemmer standarderne', async ({
  page,
}) => {
  const defaults = standard_data_state().designdiagrammer;
  await page.goto('/#diagrammer');
  for (const nr of [1, 2]) {
    await page.getByRole('button', { name: `Vælg diagram ${nr}`, exact: true }).click();
    const row = defaults.find((d) => d.diagram_nr === nr)!.rows[0];
    await number(
      page.getByLabel(`1 lag tykkelse (cm) · Diagram ${nr} · Eᵤ ${row.eu}`, { exact: true }),
      row.t_1_lag_cm! + 1,
    );
    expect((await saved(page)).data.designdiagrammer).not.toEqual(defaults);
  }
  const changed = (await saved(page)).data.designdiagrammer;
  for (const nr of [1, 2]) expect(changed[nr - 1].rows).not.toEqual(defaults[nr - 1].rows);
  await page
    .getByRole('button', { name: 'Nulstil alle diagramdata til standard', exact: true })
    .click();
  expect((await saved(page)).data.designdiagrammer).toEqual(defaults);
  await page.reload();
  for (const nr of [1, 2]) {
    await page.getByRole('button', { name: `Vælg diagram ${nr}`, exact: true }).click();
    const row = defaults[nr - 1].rows[0];
    await expect(
      page.getByLabel(`1 lag tykkelse (cm) · Diagram ${nr} · Eᵤ ${row.eu}`, { exact: true }),
    ).toHaveValue(String(row.t_1_lag_cm));
  }
});

test('F-06.6: under-minimum og krav om bundsikring følger originalens afhængigheder', async ({
  page,
}) => {
  await page.goto('/#indstillinger');
  const choices = page
    .getByRole('group', { name: 'Opbygning tyndere end stabilgrusminimum', exact: true })
    .getByRole('radio');
  for (const choice of await choices.all()) await expect(choice).toBeDisabled();
  await page.locator('#ind_lf_samlet').uncheck();
  for (const choice of await choices.all()) {
    await expect(choice).toBeEnabled();
    await choice.check();
    await expect(choice).toBeChecked();
  }
  await page.locator('#ind_std_opdeling').uncheck();
  for (const choice of await choices.all()) await expect(choice).toBeDisabled();
  await page.locator('#ind_std_opdeling').check();
  await page.locator('#ind_std_klassisk').check();
  for (const choice of await choices.all()) await expect(choice).toBeDisabled();
  await page.locator('#ind_std_klassisk').uncheck();
  for (const choice of await choices.all()) await expect(choice).toBeEnabled();
  const required = page.locator('#ind_lf_kraev_bundsikring');
  await expect(required).not.toBeChecked();
  await expect(required).toBeDisabled();
  await page
    .getByRole('radio', {
      name: "Lagene gøres mindst så tykke som VD's mindste lagtykkelse",
      exact: true,
    })
    .check();
  await expect(required).toBeEnabled();
  await required.check();
  await page
    .getByRole('radio', {
      name: 'Et lag tyndere end grænsen lægges til laget ovenover',
      exact: true,
    })
    .check();
  await expect(required).toBeDisabled();
});

// LT-1/LT-2/MIN-1 er Brugerdefineret-cases, ikke eksempler på Standards tre under-minimum-valg.
// Genskab dem via UI og brug pageCaseInput til at verificere HELE inputtet før resultatkontrollen.
for (const c of pageCases.filter((c) => ['LT-1', 'LT-2', 'MIN-1'].includes(c.id))) {
  test(`F-06.6: ${c.id} fra dimensioning-page-extra-cases.json via Indstillinger til Dimensionering`, async ({
    page,
  }) => {
    await page.goto('/#indstillinger');
    if (c.input.variant === 'restlag_vd')
      await page
        .getByRole('radio', {
          name: "Lagene gøres mindst så tykke som VD's mindste lagtykkelse",
          exact: true,
        })
        .check();
    await page.getByRole('radio', { name: c.input.enhed, exact: true }).check();
    await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
    await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
    await setEu(page, 'bd', c.input.eu);
    await page.getByRole('radio', { name: String(c.input.klasse), exact: true }).check();
    await chooseProduct(page, 'bd', c.input.geonet_navn);
    const session = await saved(page);
    const expected = pageCaseInput(c);
    const baseline = dimensioningInput({}, standard_data_state());
    // Referencecasens null-kørsler betyder indbyggede standardkørsler; UI sender dem eksplicit.
    expect(dimensioningInput(session.values, session.data)).toEqual({
      ...baseline,
      ...expected,
      koersler: expected.koersler ?? baseline.koersler,
    });
    const cards = pageCoverage(c.page).find((entry) => entry.slot === 'cards');
    expect(cards).toBeDefined();
    // Udtræk originalens viste tal fra HTML i referencen; ingen nye motorberegnede forventninger.
    const values = await page.evaluate(
      (html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return Array.from(
          doc.querySelectorAll('[style*="font:600 40px/1"]'),
          (el) => `${el.textContent!.trim()} ${el.nextElementSibling!.textContent!.trim()}`,
        );
      },
      elementText(cards!.node as { type: string })!,
    );
    expect(values.length).toBeGreaterThan(1);
    await expect(page.locator('.dim-results strong')).toHaveText(values);
  });
}

test('F-06.6: Standards tre under-minimum-valg ændrer det viste resultat', async ({ page }) => {
  await page.goto('/#dimensionering');
  await setEu(page, 'std', 33);
  await chooseProduct(page, 'std', 'Tensar TriAx TX160');
  for (const [label, thickness] of [
    ['Hele tykkelsen vises som stabilgrus', '200 mm'],
    ['Tykkelsen øges til stabilgrusminimum', '250 mm'],
    ['Opbygningen vises som ét samlet ubundet lag', '200 mm'],
  ]) {
    await page.getByRole('link', { name: 'Indstillinger', exact: true }).click();
    await page.locator('#ind_lf_samlet').uncheck();
    await page.getByRole('radio', { name: label, exact: true }).check();
    await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
    await expect(page.locator('.dim-results strong').nth(0)).toHaveText('350 mm');
    await expect(page.locator('.dim-results strong').nth(1)).toHaveText(thickness);

    await expect(page.locator('.construction-drawing [data-column="1"]')).toContainText(
      label.includes('ubundet') ? 'Ubunden opbygning' : 'Stabilgrus',
    );
  }
});

test('F-06.6: aktivt krav om bundsikring ændrer dimensioneringsresultatet', async ({ page }) => {
  await page.goto('/#dimensionering');
  await setEu(page, 'std', 30);
  await chooseProduct(page, 'std', 'Tensar TriAx TX160');
  await page.getByRole('link', { name: 'Indstillinger', exact: true }).click();
  await page
    .getByRole('radio', {
      name: "Lagene gøres mindst så tykke som VD's mindste lagtykkelse",
      exact: true,
    })
    .check();
  for (const required of [false, true, false]) {
    await page.locator('#ind_lf_kraev_bundsikring').setChecked(required);
    await page.getByRole('link', { name: 'Dimensionering', exact: true }).click();
    await expect(page.locator('.dim-results strong').nth(0)).toHaveText('450 mm');
    await expect(page.locator('.dim-results strong').nth(1)).toHaveText(
      required ? '450 mm' : '250 mm',
    );
    await page.getByRole('link', { name: 'Indstillinger', exact: true }).click();
  }
});

const settingsSchema = JSON.parse(
  readFileSync(new URL('../../src/engine/settings-ui.json', import.meta.url), 'utf8'),
);
const dimensioningSchema = JSON.parse(
  readFileSync(new URL('../../src/engine/dimensioning-ui.json', import.meta.url), 'utf8'),
);
for (const c of [
  {
    route: 'indstillinger',
    id: 'ind_afr_trin',
    focus: '#ind_afr_trin',
    fields: settingsSchema.sections.flatMap((s: { fields: unknown[] }) => s.fields),
    below: '#ind_afr_vis_eksakt',
  },
  {
    // »Antal lag« har skjult etiket og dermed intet synligt ikon, som originalens

    route: 'dimensionering',
    id: 'tilstand',
    focus: '[aria-labelledby="tilstand-label"] [role="radio"][data-state="checked"]',
    fields: dimensioningSchema.fields,
    below: '#std_eu_slider',
  },
]) {
  test(`B-053: Hover Card på ${c.route}, mus, tastatur, Escape, klik og uændret layout/tekst`, async ({
    page,
  }) => {
    // B-053; HelpHint i SettingField.tsx:19–44. Teksten er feltets help, uden markdown-fremhævning.
    const field = c.fields.find((f: { key: string }) => f.key === c.id);
    expect(field?.help).toBeTruthy();
    await page.goto(`/#${c.route}`);
    const icon = page.getByRole('button', { name: `Forklaring: ${field.label}`, exact: true });
    const card = page.locator('.help-hint-content');
    await icon.scrollIntoViewIfNeeded();
    const top = () =>
      page.locator(c.below).evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const before = await top();
    await icon.hover();
    await expect(card).toBeVisible();
    await expect(card).toHaveText(field.help.replace(/\*\*/g, '').replaceAll('\\*', '*'));
    expect(await top()).toBe(before);
    await page.mouse.move(0, 0);
    await expect(card).toHaveCount(0);
    await page.locator(c.focus).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(icon).toBeFocused();
    await expect(card).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(card).toHaveCount(0);
    await expect(icon).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(card).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(card).toHaveCount(0);
    // Et første klik fra ufokuseret tilstand skal åbne (onFocus må ikke ophæve onClick).
    // Mulig afvigelse: HelpHint sætter open=true ved fokus og inverterer igen ved klik.
    await icon.click();
    await expect(card).toBeVisible();
    expect(await top()).toBe(before);
    await icon.click();
    await expect(card).toHaveCount(0);
  });
}

test.describe('B-053: berøringsskærm', () => {
  test.use({ hasTouch: true });
  test('første tryk åbner, næste tryk lukker forklaringen', async ({ page }) => {
    // B-053 / HelpHint: SettingField.tsx:27–35. Ingen mus over, så hover kan ikke skjule klikfejl.
    // Mulig afvigelse: onFocus åbner før onClick inverterer til lukket på første tryk.
    await page.goto('/#indstillinger');
    const icon = page.getByRole('button', { name: 'Forklaring: Oprundingstrin', exact: true });
    const card = page.locator('.help-hint-content');
    await expect(card).toHaveCount(0);
    await icon.tap();
    await expect(card).toBeVisible();
    await icon.tap();
    await expect(card).toHaveCount(0);
  });
});
