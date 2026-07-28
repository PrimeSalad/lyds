import { test, expect } from '@playwright/test';
import { installApiMocks } from '../helpers/mock-app';

test.describe('Reports', () => {
  test('counts every record and exposes unanswered imported fields', async ({ page }) => {
    await installApiMocks(page);
    await page.goto('/reports');

    await expect(page.getByText('Records represented')).toBeVisible();
    await expect(page.getByText('6,714', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Unanswered fields', { exact: true })).toBeVisible();
    await expect(page.getByText('No response', { exact: true })).toHaveCount(10);
    await expect(page.getByRole('heading', { name: 'Civic participation responses' })).toBeVisible();
  });
});
