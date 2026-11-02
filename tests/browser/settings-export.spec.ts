import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test('lokal udgave eksporterer opsætningen med de aktuelle faste indstillinger', async ({
  page,
}) => {
  await page.goto('/#indstillinger');
  await page.locator('#ind_afr_trin').click();
  await page.getByRole('option', { name: '10 mm', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Eksportér opsætning til offentlig udgave' }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe('opsaetning-offentlig.json');
  const content = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(content.funktioner).toEqual({
    rapport: false,
    redigerOpslag: false,
    redigerMaterialer: true,
    diagramfiler: false,
  });
  expect(content.kan_aendres).toContain('ind_opb_enhed');
  expect(content.indstillinger).toEqual({ afrunding: { trin_mm: 10 } });
});
