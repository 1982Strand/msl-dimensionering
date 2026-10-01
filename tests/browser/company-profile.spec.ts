import { chooseOption } from './helpers/choose-option.ts';
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
  if (await page.getByTestId('profile-save-state').count())
    await expect(page.getByTestId('profile-save-state')).toHaveAttribute('data-state', 'saved');
  // En ny revision kan starte lige efter »ready«; vent til tilstand og download står stabilt samtidig.
  await expect(async () => {
    await expect(page.getByTestId('compile-state')).toHaveAttribute('data-state', 'ready');
    await expect(page.getByRole('link', { name: 'Hent PDF', exact: true })).toBeVisible({
      timeout: 1_000,
    });
  }).toPass({ timeout: 90_000 });
  const frame = page.getByTitle('PDF-forhåndsvisning', { exact: true });
  if (old) await expect(frame).not.toHaveAttribute('src', old);
  return frame.getAttribute('src');
}
async function exported(page: Page) {
  // Headless Chromium kan hente PDF-forhåndsvisningen som download; vent på profilfilen.
  const downloaded = page.waitForEvent('download', {
    predicate: (d) => d.suggestedFilename() === 'firmaprofil.json',
  });
  await page.getByRole('button', { name: 'Eksportér profil', exact: true }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe('firmaprofil.json');
  return readFile((await file.path())!, 'utf8');
}
async function stored(page: Page) {
  return page.evaluate(
    // Profilen gemmes først ved første ændring; et tomt lager er standardprofilen.
    (key) => JSON.parse(localStorage.getItem(key) ?? 'null')?.current.profile ?? null,
    PROFILE_STORAGE_KEY,
  );
}

test('B-048/B-050/B-051: Popover, kartotek, rapportkopier og profilrundtur', async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(180_000);
  const seen = observe(page, baseURL!);
  await page.goto('/#rapport');
  await expect(
    page.getByText('Kartoteket er tomt. Tilføj personer under Firmaprofil → Medarbejdere.'),
  ).toHaveCount(2);
  await page.getByRole('tab', { name: 'Firmaprofil', exact: true }).click();
  let old = await ready(page);
  const employeeCard = page.locator('section[aria-labelledby="profile-card-8"]');
  const cardHeight = (await employeeCard.boundingBox())!.height;
  const people = [
    { navn: 'Anna Jensen', initialer: 'AJ', mail: 'anna@example.invalid', telefon: '12 34 56 78' },
    { navn: 'Bo Nielsen', initialer: 'BN', mail: 'bo@example.invalid', telefon: '87 65 43 21' },
  ];
  const addForm = page.getByRole('dialog', { name: 'Tilføj medarbejder', exact: true });
  for (const [index, person] of people.entries()) {
    await page.getByRole('button', { name: 'Tilføj medarbejder', exact: true }).click();
    await expect(addForm.getByLabel('Navn', { exact: true })).toBeFocused();
    for (const label of ['Navn', 'Initialer', 'Mail', 'Telefon'])
      await expect(addForm.getByLabel(label, { exact: true })).toHaveValue('');
    if (index === 0) {
      await addForm.getByRole('button', { name: 'Tilføj', exact: true }).click();
      await expect(addForm.getByLabel('Navn', { exact: true })).toHaveAttribute(
        'aria-invalid',
        'true',
      );
      await expect(addForm.getByText('Navn er påkrævet.', { exact: true })).toBeVisible();
    }
    for (const [label, value] of [
      ['Navn', person.navn],
      ['Initialer', person.initialer],
      ['Mail', person.mail],
      ['Telefon', person.telefon],
    ])
      await addForm
        .getByLabel(label, { exact: true })
        .fill(label === 'Telefon' ? value.replaceAll(' ', '') : value);
    await addForm.getByLabel('Telefon', { exact: true }).blur();
    await expect(addForm.getByLabel('Telefon', { exact: true })).toHaveValue(person.telefon);
    if (index === 0) {
      await addForm.getByLabel('Mail', { exact: true }).fill('ugyldig');
      await addForm.getByLabel('Initialer', { exact: true }).fill('1234567');
      await addForm.getByRole('button', { name: 'Tilføj', exact: true }).click();
      for (const label of ['Mail', 'Initialer'])
        await expect(addForm.getByLabel(label, { exact: true })).toHaveAttribute(
          'aria-invalid',
          'true',
        );
      await expect(
        addForm.getByText('Angiv en gyldig mailadresse.', { exact: true }),
      ).toBeVisible();
      expect((await stored(page))?.medarbejdere ?? []).toEqual([]);
      await addForm.getByLabel('Mail', { exact: true }).fill(person.mail);
      await addForm.getByLabel('Initialer', { exact: true }).fill(person.initialer);
      await addForm.getByRole('button', { name: 'Tilføj', exact: true }).click();
    } else {
      await addForm.getByLabel('Telefon', { exact: true }).press('Enter');
    }
    await expect(addForm).not.toBeVisible();
    old = await ready(page, old);
  }
  expect((await stored(page)).medarbejdere).toEqual(people);
  expect((await employeeCard.boundingBox())!.height).toBe(cardHeight);
  await page.getByRole('button', { name: 'Tilføj medarbejder', exact: true }).click();
  for (const label of ['Navn', 'Initialer', 'Mail', 'Telefon'])
    await expect(addForm.getByLabel(label, { exact: true })).toHaveValue('');
  await addForm.getByLabel('Navn', { exact: true }).press('Escape');
  await expect(addForm).not.toBeVisible();
  const catalogue = page.getByRole('dialog', { name: 'Medarbejderkartotek', exact: true });
  await page.getByRole('button', { name: 'Åbn kartotek (2)', exact: true }).click();
  for (const person of people) {
    const row = catalogue.getByRole('row').filter({ hasText: person.navn });
    for (const value of Object.values(person))
      await expect(row.getByRole('cell', { name: value, exact: true })).toBeVisible();
  }
  await catalogue.getByRole('button', { name: 'Luk kartotek', exact: true }).click();
  const json = await exported(page);
  expect(JSON.parse(json).profile.medarbejdere).toEqual(people);
  await page.getByRole('tab', { name: 'Rapport', exact: true }).click();
  for (const [role, person] of [
    ['Sagsbehandler', people[0]],
    ['Kvalitetssikring', people[1]],
  ] as const) {
    const group = page.getByRole('group', { name: role, exact: true });
    await chooseOption(
      page,
      group.getByLabel('Vælg fra kartotek …', { exact: true }),
      `${person.initialer} – ${person.navn}`,
    );
    await expect(group.locator('input[type=text]')).toHaveCount(4);
    expect(
      await group
        .locator('input[type=text]')
        .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value)),
    ).toEqual([person.navn, person.initialer, person.mail, person.telefon]);
  }
  await page.getByLabel('Sagsbehandler-telefon', { exact: true }).fill('11223344');
  await page.getByLabel('Sagsbehandler-telefon', { exact: true }).blur();
  await ready(page);
  const revision = await page.getByTestId('compile-state').getAttribute('data-revision');
  await page.evaluate(() => {
    const state = { disabled: false, stale: false };
    (window as unknown as { __b048: typeof state }).__b048 = state;
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
  await page.getByLabel('Kvalitetssikring i bunden af rapporten', { exact: true }).check();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __b048: Record<string, boolean> }).__b048),
    )
    .toEqual({ disabled: true, stale: true });
  old = await ready(page, old);
  expect(await page.getByTestId('compile-state').getAttribute('data-revision')).not.toBe(revision);
  await page.reload();
  await expect(page.getByLabel('Sagsbehandler', { exact: true })).toHaveValue(people[0].navn);
  await expect(page.getByLabel('Sagsbehandler-initialer', { exact: true })).toHaveValue('AJ');
  await expect(page.getByLabel('Sagsbehandler-mail', { exact: true })).toHaveValue(people[0].mail);
  await expect(page.getByLabel('Sagsbehandler-telefon', { exact: true })).toHaveValue(
    '11 22 33 44',
  );
  for (const [label, value] of [
    ['Kvalitetssikring', people[1].navn],
    ['Kvalitetssikring-initialer', 'BN'],
    ['Kvalitetssikring-mail', people[1].mail],
    ['Kvalitetssikring-telefon', people[1].telefon],
  ])
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
  await expect(
    page.getByLabel('Kvalitetssikring i bunden af rapporten', { exact: true }),
  ).toBeChecked();
  await page.getByRole('tab', { name: 'Firmaprofil', exact: true }).click();
  await ready(page);
  await page.getByRole('button', { name: 'Åbn kartotek (2)', exact: true }).click();
  const first = catalogue.getByRole('row').nth(1);
  await first.getByRole('button', { name: 'Ret', exact: true }).click();
  await first.getByLabel('Navn', { exact: true }).fill('Anna ændret');
  await first.getByRole('button', { name: 'Fortryd', exact: true }).click();
  await expect(first.getByRole('cell', { name: people[0].navn, exact: true })).toBeVisible();
  await first.getByRole('button', { name: 'Ret', exact: true }).click();
  await first.getByLabel('Mail', { exact: true }).fill('ugyldig');
  await first.getByRole('button', { name: 'Gem', exact: true }).click();
  await expect(first.getByLabel('Mail', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  expect((await stored(page)).medarbejdere).toEqual(people);
  await first.getByLabel('Mail', { exact: true }).fill('anna.ny@example.invalid');
  await first.getByLabel('Telefon', { exact: true }).fill('42400918');
  await first.getByRole('button', { name: 'Gem', exact: true }).click();
  await catalogue.getByRole('button', { name: 'Luk kartotek', exact: true }).click();
  await ready(page);
  await page.getByRole('button', { name: 'Åbn kartotek (2)', exact: true }).click();
  const changed = { ...people[0], mail: 'anna.ny@example.invalid', telefon: '42 40 09 18' };
  await expect(first.getByRole('cell', { name: changed.telefon, exact: true })).toBeVisible();
  const second = catalogue.getByRole('row').filter({ hasText: people[1].navn });
  page.once('dialog', (d) => void d.dismiss());
  await second.getByRole('button', { name: 'Slet', exact: true }).click();
  expect((await stored(page)).medarbejdere).toEqual([changed, people[1]]);
  page.once('dialog', (d) => {
    expect(d.message()).toContain(people[1].navn);
    void d.accept();
  });
  await second.getByRole('button', { name: 'Slet', exact: true }).click();
  await catalogue.getByRole('button', { name: 'Luk kartotek', exact: true }).click();
  await ready(page);
  expect((await stored(page)).medarbejdere).toEqual([changed]);
  await page.reload();
  await ready(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Åbn kartotek (1)', exact: true }).click();
  await expect(catalogue.getByRole('cell', { name: changed.mail, exact: true })).toBeVisible();
  const panel = await catalogue.boundingBox();
  expect(panel!.width).toBe(390);
  expect(
    await catalogue
      .locator('[data-slot=table-container]')
      .evaluate((el) => el.scrollWidth > el.clientWidth),
  ).toBe(true);
  await catalogue.getByRole('button', { name: 'Luk kartotek', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByRole('tab', { name: 'Rapport', exact: true }).click();
  for (const [label, value] of [
    ['Sagsbehandler-mail', people[0].mail],
    ['Sagsbehandler-telefon', '11 22 33 44'],
    ['Kvalitetssikring', people[1].navn],
    ['Kvalitetssikring-initialer', people[1].initialer],
    ['Kvalitetssikring-mail', people[1].mail],
    ['Kvalitetssikring-telefon', people[1].telefon],
  ])
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
  await page.getByRole('tab', { name: 'Firmaprofil', exact: true }).click();
  await ready(page);
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Nulstil firmaprofil til standard', exact: true }).click();
  await ready(page);
  expect((await stored(page)).medarbejdere).toEqual([]);
  await page.getByRole('button', { name: 'Åbn kartotek (0)', exact: true }).click();
  await expect(catalogue.getByText('Kartoteket er tomt.', { exact: true })).toBeVisible();
  await catalogue.getByRole('button', { name: 'Luk kartotek', exact: true }).click();
  await page
    .getByLabel('Profilfil', { exact: true })
    .setInputFiles({ name: 'b048.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await ready(page);
  expect((await stored(page)).medarbejdere).toEqual(people);
  expect(JSON.parse(await exported(page))).toEqual(JSON.parse(json));
  await page.getByRole('button', { name: 'Åbn kartotek (2)', exact: true }).click();
  await page.screenshot({ path: info.outputPath('b050-kartotek.png'), fullPage: true });
  await catalogue.getByRole('button', { name: 'Luk kartotek', exact: true }).click();
  await page.getByRole('tab', { name: 'Rapport', exact: true }).click();
  await page.getByRole('button', { name: 'Nulstil felter', exact: true }).click();
  for (const id of [
    'rap_sagsbehandler',
    'rap_sagsbehandler_initialer',
    'rap_sagsbehandler_mail',
    'rap_sagsbehandler_telefon',
    'rap_kontrol',
    'rap_kontrol_initialer',
    'rap_kontrol_mail',
    'rap_kontrol_telefon',
  ])
    await expect(page.locator('#' + id)).toHaveValue('');
  await expect(
    page.getByLabel('Kvalitetssikring i bunden af rapporten', { exact: true }),
  ).not.toBeChecked();
  expect(seen.errors).toEqual([]);
  expect(seen.external).toEqual([]);
});

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
    // Med varm compiler er spærringen kortvarig; den registreres, mens den står i DOM.
    await page.evaluate(() => {
      const w = window as unknown as { __locked: boolean };
      w.__locked = false;
      new MutationObserver(() => {
        if (
          [...document.querySelectorAll('button')].some(
            (b) => b.textContent?.trim() === 'Hent PDF' && b.disabled,
          )
        )
          w.__locked = true;
      }).observe(document.body, { subtree: true, childList: true, attributes: true });
    });
    await page.getByLabel(label, { exact: true }).fill(value);
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __locked: boolean }).__locked))
      .toBe(true);
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
  const downloading = page.waitForEvent('download', {
    // Kun »Hent PDF«; headless Chromium kan også hente forhåndsvisningen som download.
    predicate: (d) => d.suggestedFilename().startsWith('Dimensionering - '),
  });
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
