import { test, expect } from '@playwright/test';

// Køres mod dist-offentlig; hjælpen følger src/ui/opsaetning-offentlig.json.
test('offentlig hjælp beskriver kun de gældende valg', async ({ page }) => {
  await page.goto('/#hjaelp');
  await page.getByRole('button', { name: 'Læs kapitel 6: Sådan læses resultaterne' }).click();
  const chapter = page.locator('.help-chapter').filter({
    has: page.getByRole('button', { name: 'Luk kapitel 6: Sådan læses resultaterne' }),
  });
  for (const text of [
    'Der kan vælges mellem fire fordelinger',
    'standardtrinnet på 50 mm',
    'kan redigeres under Indstillinger',
    'Øverste lag fastholdt. Det øverste lag har præcis',
  ])
    await expect(chapter.getByText(text, { exact: false })).toHaveCount(0);
  await expect(
    chapter.getByText('Det øverste lag fordeles proportionalt, men gøres ikke tyndere', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    chapter.getByText('oprundes til indbygningstrinnet på 10 mm', { exact: false }),
  ).toBeVisible();
  await expect(
    chapter.getByText('laveste af de to belastningsklasser', { exact: false }),
  ).toBeVisible();
  // Figurerne om VD's mindste lagtykkelse er skjult; resten er nummereret om.
  await expect(chapter.getByText('Figur 6.7', { exact: true })).toBeVisible();
  await expect(chapter.getByText('Figur 6.8', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: /^Læs kapitel 2:/ }).click();
  await expect(page.getByRole('heading', { name: /Redigering af kørslerne/ })).toHaveCount(0);
});
