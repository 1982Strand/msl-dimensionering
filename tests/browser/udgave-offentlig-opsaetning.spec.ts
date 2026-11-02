import { test, expect } from '@playwright/test';

test('offentlig udgave: knappen til eksport af offentlig opsætning vises ikke', async ({
  page,
}) => {
  await page.goto('/#indstillinger');
  await expect(
    page.getByRole('button', { name: 'Eksportér opsætning til offentlig udgave' }),
  ).toHaveCount(0);
});
