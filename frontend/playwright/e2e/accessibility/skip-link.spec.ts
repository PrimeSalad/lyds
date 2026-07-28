import { test, expect } from '@playwright/test';
import { installApiMocks } from '../helpers/mock-app';

test.describe('Skip link accessibility', () => {
  test('shows the skip link when the user presses Tab', async ({ page }) => {
    await installApiMocks(page);
    await page.goto('/');
    await expect(page.locator('main h1')).toBeVisible();
    await page.keyboard.press('Tab');

    const skipLink = page.locator('[href="#main-content"]');
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toBeFocused();
  });
});
