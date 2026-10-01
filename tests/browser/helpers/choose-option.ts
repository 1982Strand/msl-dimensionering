import { expect, type Locator, type Page } from '@playwright/test';

/** B-058: valglister er shadcn Select (role="combobox"); vælg en mulighed som en bruger. */
export async function chooseOption(page: Page, trigger: Locator, label: string) {
  await trigger.click();
  await page.getByRole('option', { name: label, exact: true }).click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
}
