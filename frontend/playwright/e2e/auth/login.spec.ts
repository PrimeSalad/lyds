import { test, expect } from '@playwright/test';
import { installApiMocks, installSupabaseLoginMock } from '../helpers/mock-app';

test.describe('Login', () => {
  test('signs in with email and opens the dashboard', async ({ page }) => {
    await installApiMocks(page);
    await installSupabaseLoginMock(page, true);

    await page.goto('/login');
    await page.getByLabel('Email address').fill('admin@example.com');
    await page.getByLabel('Password', { exact: true }).fill('correct-password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.locator('main h1')).toBeVisible();
  });

  test('keeps the user on login and explains invalid credentials', async ({ page }) => {
    await installSupabaseLoginMock(page, false);

    await page.goto('/login');
    await page.getByLabel('Email address').fill('wrong@example.com');
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('alert')).toContainText('Invalid login credentials');
  });

  test('requires the authenticator code before opening protected pages', async ({ page }) => {
    await installApiMocks(page);
    await installSupabaseLoginMock(page, true, 'challenge');

    await page.goto('/login');
    await page.getByLabel('Email address').fill('admin@example.com');
    await page.getByLabel('Password', { exact: true }).fill('correct-password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL('/mfa');
    await page.getByLabel('Authenticator code').fill('123456');
    await page.getByRole('button', { name: 'Verify and sign in' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.locator('main h1')).toBeVisible();
  });
});
