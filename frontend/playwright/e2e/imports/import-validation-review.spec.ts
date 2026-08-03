import { expect, test } from '@playwright/test';
import { installApiMocks, runtimeErrors } from '../helpers/mock-app';

test('presents import validation outcomes and corrections with clear row recognition', async ({ page }) => {
  const errors = runtimeErrors(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await installApiMocks(page);
  await page.goto('/imports/new?batchId=import-batch-1');

  await expect(page.getByRole('heading', { name: 'Review before importing' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Validation results' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download Correction Report' })).toBeVisible();

  const table = page.getByRole('table', { name: 'Spreadsheet validation results' });
  const readyRow = table.getByRole('row').filter({ hasText: 'Alyssa Reyes' });
  await expect(readyRow).toContainText('Row4');
  await expect(readyRow).toContainText('Ready to import');
  await expect(readyRow).toContainText('Will be created');
  await expect(readyRow).toContainText('Passed all validation checks');
  await expect(readyRow).toContainText('All required values were recognized.');

  const invalidRow = table.getByRole('row').filter({ hasText: 'Brandon Santos' });
  await expect(invalidRow).toContainText('Needs correction');
  await expect(invalidRow).toContainText('Excluded until corrected');
  await expect(invalidRow).toContainText('Birth date is required.');
  await expect(invalidRow).toContainText('Youth classification was not recognized.');
  await expect(invalidRow).toContainText('Contact number is blank.');

  const duplicateRow = table.getByRole('row').filter({ hasText: 'Carla Mendoza' });
  await expect(duplicateRow).toContainText('Skipped — already recorded');
  await expect(duplicateRow).toContainText('Existing youth record detected');

  await page.setViewportSize({ width: 375, height: 812 });
  const mobileResults = page.getByLabel('Spreadsheet validation results').filter({ visible: true });
  await expect(mobileResults).toContainText('Source row');
  await expect(mobileResults).toContainText('Recognized youth');
  await expect(mobileResults).toContainText('Validation details');
  await expect(mobileResults).toContainText('Brandon Santos');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
