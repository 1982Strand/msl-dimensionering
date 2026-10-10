import { test, expect } from '@playwright/test';

// B-073: »Genstart app« i sidemenuens bund. Testene udløser ikke en rigtig bygning; serverens
// svar efterlignes, og endepunktets beskyttelse kontrolleres direkte.
const footer = '.app-sidebar-footer';

test('B-073: knappen vises lokalt, markerer ny version og genindlæser efter genstart', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#dimensionering');
  // Den rigtige preview-server svarer på status; knappen vises.
  const button = page.locator(footer).getByRole('button', { name: 'Genstart app', exact: true });
  await expect(button).toBeVisible();

  await page.route('**/__app/status', (route) =>
    route.fulfill({ json: { lokal: true, nyVersion: true, version: 'x', genstarter: false } }),
  );
  await page.route('**/__app/genstart', (route) => route.fulfill({ json: { ok: true } }));
  await page.reload();
  await expect(page.locator(footer)).toContainText('Ny version klar');
  // Genindlæsning i samme fane: markøren på vinduet forsvinder.
  await page.evaluate(() => ((window as unknown as { før: boolean }).før = true));
  await Promise.all([page.waitForEvent('load'), button.click()]);
  expect(await page.evaluate(() => (window as unknown as { før?: boolean }).før)).toBeUndefined();
  expect(errors).toEqual([]);
});

test('B-073: fejl vises, og knappen findes ikke uden lokal server', async ({ page }) => {
  await page.route('**/__app/status', (route) =>
    route.fulfill({ json: { lokal: true, nyVersion: false, version: 'x', genstarter: false } }),
  );
  await page.route('**/__app/genstart', (route) =>
    route.fulfill({ status: 500, json: { ok: false, fejl: 'npm run build fejlede.' } }),
  );
  await page.goto('/#dimensionering');
  const button = page.locator(footer).getByRole('button', { name: 'Genstart app', exact: true });
  await expect(page.locator(footer)).not.toContainText('Ny version klar');
  await button.click();
  await expect(page.locator(footer).getByRole('alert')).toHaveText(
    'Genstart mislykkedes. Se serverens vindue.',
  );
  await expect(button).toBeEnabled();

  // En statisk udgivelse (fx hjemmesiden) har ingen status; knappen vises ikke.
  await page.unrouteAll();
  await page.route('**/__app/status', (route) => route.fulfill({ status: 404, body: '' }));
  await page.reload();
  await expect(page.locator(footer)).toContainText('Beregningsværktøj');
  await expect(page.locator(footer).getByRole('button', { name: 'Genstart app' })).toHaveCount(0);
});

test('B-073: endepunktet kræver POST fra appens egen side', async ({ request }) => {
  const status = await request.get('/__app/status');
  expect(status.ok()).toBe(true);
  expect(await status.json()).toMatchObject({ lokal: true });
  expect((await request.get('/__app/genstart')).status()).toBe(405);
  // Uden Origin (eller fra en anden side) afvises kaldet, før noget bygges.
  expect((await request.post('/__app/genstart')).status()).toBe(403);
  expect(
    (
      await request.post('/__app/genstart', { headers: { Origin: 'http://evil.example' } })
    ).status(),
  ).toBe(403);
});
