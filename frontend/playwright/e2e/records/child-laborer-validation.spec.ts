import { expect, test } from '@playwright/test';
import { installApiMocks } from '../helpers/mock-app';

test('requires remarks before marking a child laborer record as validated', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/child-laborers/new');

  await page.getByLabel('Barangay').selectOption('barangay-agot');
  await page.getByLabel('Surname').fill('Dela Cruz');
  await page.getByLabel('First Name').fill('Maria');
  await page.getByLabel('Date of Birth').fill('2012-04-15');
  await page.getByLabel("Mother's Name").fill('Ana Dela Cruz');
  await page.getByLabel('Nature of Work').fill('Seasonal farm work');
  await page.getByLabel('Record Status').selectOption('VALIDATED');
  await page.getByRole('button', { name: 'Add Record' }).click();

  await expect(page.getByText('Add validation remarks before marking this record as validated.')).toBeVisible();
  await expect(page).toHaveURL('/child-laborers/new');
});
