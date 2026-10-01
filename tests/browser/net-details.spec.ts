import { chooseProduct } from './helpers/choose-product.ts';
import { test, expect } from '@playwright/test';

test('M4: punktprodukt, intervalprodukt og hover-hjælp uden sidefejl', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#dimensionering');
  const details = page.locator('.net-details');
  await expect(
    details.getByRole('heading', { name: 'Detaljer · Tensar TriAx TX160' }),
  ).toBeVisible();
  await expect(details.locator('.rt-detaljer-lag')).toHaveCount(2);
  await expect(details.locator('.rt-detaljer-lag').first()).toContainText(
    'Net-korrektion, indeks 100',
  );
  await expect(details.locator('.rt-detaljer-lag').last()).toContainText(
    'Ikke gyldigt for denne kombination.',
  );
  await expect(page.locator('.bg-produkt-interval-note')).toHaveCount(0);

  await page.locator('#std_eu_slider').focus();
  await page.locator('#std_eu_slider').press('Home');
  for (let i = 1; i < 5; i++) await page.locator('#std_eu_slider').press('ArrowRight');
  await chooseProduct(page, 'std', 'Tensar InterAx NX850');
  await expect(
    details.getByRole('heading', { name: 'Detaljer · Tensar InterAx NX850' }),
  ).toBeVisible();
  await expect(details.locator('.rt-detaljer-optimal')).toHaveCount(2);
  await expect(details.locator('.rt-detaljer-optimal-tal').first()).toHaveText('600 mm');
  await expect(details.locator('.rt-detaljer-resultat-tal').first()).toHaveText('750 mm');
  const interval = page.locator('.bg-produkt-interval-note');
  await expect(interval).toHaveText(
    'Hovedresultatet bruger den konservative værdi; den optimale værdi vises som supplement.',
  );
  expect(
    await interval.evaluate((el) =>
      Boolean(
        el.compareDocumentPosition(document.querySelector('.dim-results')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  ).toBe(true);

  const row = details
    .locator('.rt-detaljer-hjaelp')
    .filter({ hasText: 'Net-korrektion, konservativ' })
    .first();
  await row.hover();
  await page.mouse.move(0, 0, { steps: 5 });
  await row.hover();
  await expect(page.getByRole('tooltip')).toContainText(
    'Effektindeks 115–130. Hovedresultatet tager udgangspunkt i den konservative ende, indeks 115, svarende til net-korrektionen −15 %.',
  );
  await page.mouse.move(0, 0, { steps: 5 });
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  const optimal = details.locator('.rt-detaljer-optimal').first();
  await optimal.hover();
  await page.mouse.move(0, 0, { steps: 5 });
  await optimal.hover();
  await expect(page.getByRole('tooltip')).toContainText(
    'Optimal korrektion · effektindeks 130 · net-korrektion −30 %',
  );
  await expect(page.getByRole('tooltip')).toContainText('= Stabiliseret bærelagstykkelse: 600 mm');
  await page.mouse.move(0, 0, { steps: 5 });
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  expect(errors).toEqual([]);
});
