import { test, expect, type Page } from '@playwright/test';

async function setEu(page: Page, prefix: string, value: number) {
  const slider = page.locator(`#${prefix}_eu_slider`);
  await slider.focus();
  await slider.press('Home');
  for (let n = 1; n < value; n++) await slider.press('ArrowRight');
}
async function nx850(page: Page, prefix: string) {
  const select = page.locator(`#${prefix}_geonet`);
  await select.selectOption({
    label: await select.locator('option').filter({ hasText: 'Tensar InterAx NX850' }).innerText(),
  });
}

test('M9: Standard/belastningsklasse, Brugerdefineret/trafikklasse og afvist driftspunkt', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#dimensionering');
  await setEu(page, 'std', 5);
  await nx850(page, 'std'); // FIG-002
  await expect(page.locator('[data-m9-slot="step1"]')).toHaveText(
    '1 Underbund og dimensioneringsgrundlagEᵤ 5 MPa · Klasse 4 · Eₒ 80 MPa',
  );
  await expect(page.locator('[data-m9-slot="step2"]')).toHaveText(
    '2 Forudsætningerφᵥ 37,0° · ingen φᵥ-korrektion · stabilgrus og bundsikring',
  );
  await expect(page.locator('.bg-noegletal-hoved .t')).toHaveText('Klasse 4');
  await expect(page.locator('.bg-noegletal-hoved .n')).toHaveText(
    'Middel trafikerede veje, p-arealer, flydende gulve i lagerhaller',
  );
  await expect(page.locator('.bg-noegletal table td')).toHaveText([
    'Belastning:',
    'Middel trafik (akseltryk ≤ 8 t)',
    'Eₒ-kurve:',
    '80 MPa',
  ]);
  await expect(page.locator('.dim-results strong')).toHaveText(['1.200 mm', '750 mm', '700 mm']);
  await expect(page.locator('.dim-results h3')).toHaveText([
    'Nødvendig uden geonet',
    '1 lag geonet',
    '2 lag geonet',
  ]);
  await expect(page.locator('.m9-thinnest h3')).toHaveText('2 lag geonet');
  await expect(page.locator('.m9-badge')).toHaveText('TYNDEST');
  await expect(page.locator('.m9-badge')).toHaveAttribute(
    'title',
    'Dette er det tyndeste gyldige alternativ blandt de viste opbygninger.',
  );
  await expect(page.locator('.m9-result-delta')).toHaveText([
    '−450 mm 38 % tyndere',
    '−500 mm 42 % tyndere',
  ]);
  const all = page.getByRole('button', { name: 'Alle produkter · 20 produkter', exact: true });
  await expect(all).toHaveAttribute('aria-expanded', 'false');
  await all.click();
  await expect(
    page.getByRole('table', { name: 'Alle produkter', exact: true }).locator('tbody tr'),
  ).toHaveCount(20);
  await all.click();
  await expect(all).toHaveAttribute('aria-expanded', 'false');
  const slots = await page
    .locator('.m9-result-block')
    .evaluate((el) =>
      [
        el.querySelector('.dim-results'),
        el.querySelector('.bg-resultat-status'),
        el.querySelector('[data-m9-slot="constructionHeading"]'),
        el.querySelector('.net-details'),
        el.querySelector('[data-m9-slot="diagramHeading"]'),
        el.querySelector('.m9-products'),
        el.querySelector('.coupling-explanation'),
        el.querySelector('.result-checks'),
      ].map(
        (node, i, nodes) =>
          !!node &&
          (i === 0 ||
            !!(nodes[i - 1]!.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)),
      ),
    );
  expect(slots).toEqual(Array(8).fill(true));
  await page.screenshot({ path: info.outputPath('m9-standard.png'), fullPage: true });

  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  await setEu(page, 'bd', 7);
  await page.getByRole('radio', { name: 'Trafikklasse', exact: true }).check();
  await nx850(page, 'bd');
  await page.getByRole('link', { name: 'Indstillinger', exact: true }).click();
  await page.getByRole('radio', { name: 'cm', exact: true }).check();
  await page.getByRole('link', { name: 'Dimensionering', exact: true }).click(); // TR-2
  await expect(page.locator('.bg-trin-opsum')).toHaveText([
    'Eᵤ 7 MPa · T4 · Eₒ,ækv 92 MPa',
    '2 lag · 70 cm · vægtet φᵥ 38,3° · kφ −2,6 %',
  ]);
  await expect(page.locator('.bg-lagtabel-hoved')).toHaveText('#MaterialeTykkelseφ');
  await expect(page.locator('.bg-lagtabel-nr')).toHaveText(['1', '2']);
  await expect(page.locator('.bg-lagtabel-phi')).toHaveText(['40,0°', '37,0°']);
  await expect(page.locator('.bg-lagtabel-note')).toHaveText([
    'Bærelag · maks. korn 32 mm · krav til geonet maskestørrelse 35 mm',
    'Bundsikring · maks. korn 8 mm · krav til geonet maskestørrelse 35 mm',
  ]);
  await expect(page.locator('.bg-lagtabel-sum')).toHaveText('Samlet700 mm38,3°');
  await expect(page.locator('[data-m9-slot="materialsHelp"]')).toHaveText(
    'Mindste lagtykkelse der kan indtastes er 200 mm.',
  );
  await expect(page.locator('.dim-results strong')).toHaveText(['110 cm', '65 cm', '60 cm']);
  await expect(page.locator('.m9-result-delta')).toHaveText([
    '−45 cm 41 % tyndere',
    '−50 cm 45 % tyndere · holder ved 70 cm',
  ]);
  await expect(page.locator('.bg-underhoved-forbehold')).toHaveText(
    'Beregningen tager ikke højde for minimumskrav til koblingshøjde pga frostfarlighed, jf. Vejdirektoratets dimensioneringshåndbog',
  );
  await expect(page.locator('[data-m9-slot="constructionHeading"] .bg-kort-note')).toHaveText(
    'Snit i samme lodrette skala · stiplet linje = indtastet 70 cm',
  );
  await expect(page.locator('.bg-noegletal span[title]')).toHaveAttribute(
    'title',
    'Den designdiagram-kurve, opslaget sker i: den kurve, hvis lagtykkelse uden geonet svarer til VejDims krav. Et opslagspunkt, ikke et forventet E-modul for opbygningen.',
  );
  await page.screenshot({ path: info.outputPath('m9-custom-traffic.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: info.outputPath('m9-mobile.png'), fullPage: true });

  await page.getByRole('radio', { name: 'Standard', exact: true }).check();
  await page.getByRole('radio', { name: 'Trafikklasse', exact: true }).check();
  await setEu(page, 'std', 10);
  await page.getByRole('radio', { name: 'T1', exact: true }).check();
  await expect(page.locator('.bg-trin-opsum').first()).toHaveText(
    'Eᵤ 10 MPa · T1 · afvist (under 21,4 %)',
  );
  await expect(page.locator('[data-m9-slot="basisMessage"]')).toHaveText(
    'T1 · Eᵤ = 10 MPa ligger 21,4 % under diagrammets laveste kurve, uden for tolerancen på 5,0 %. VejDim kræver 45,6 cm ubundet mod 58 cm for kurven Eₒ = 30 MPa. Beregningen afvises efter Indstillinger, afsnit 8, og opbygningen kræver en konkret vurdering. Der kan i stedet dimensioneres efter Belastningsklasse-grundlaget, eller reglerne kan ændres under Indstillinger.',
  );
  await expect(page.locator('.m9-result-block')).toHaveCount(0);
  await expect(page.locator('[data-m9-slot="fixedLabel"]')).toBeVisible();
  await page.getByRole('radio', { name: 'Brugerdefineret', exact: true }).check();
  await setEu(page, 'bd', 10);
  await page.getByRole('radio', { name: 'T1', exact: true }).check();
  await expect(page.locator('[data-m9-slot="step2"]')).toHaveCount(0);
  await expect(page.locator('.m9-result-block')).toHaveCount(0);
  expect(errors).toEqual([]);
});
