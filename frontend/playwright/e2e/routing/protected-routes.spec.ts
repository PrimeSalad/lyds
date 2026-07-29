import { test, expect } from '@playwright/test';
import { installApiMocks, runtimeErrors } from '../helpers/mock-app';

const adminRoutes = [
  '/',
  '/youth-records',
  '/youth-records/new',
  '/youth-records/record-unanswered',
  '/child-laborers',
  '/child-laborers/new',
  '/child-laborers/child-laborer-1/edit',
  '/review-queue',
  '/imports',
  '/imports/new',
  '/reports',
  '/announcements',
  '/barangays',
  '/barangays/new',
  '/accounts',
  '/accounts/new',
  '/categories',
  '/categories/new',
  '/categories/category-2026/fields',
  '/reference-data',
  '/audit-logs',
  '/account-settings',
];

test.describe('Protected application routes', () => {
  for (const path of adminRoutes) {
    test(`${path} renders without a runtime failure`, async ({ page }) => {
      const errors = runtimeErrors(page);
      await installApiMocks(page);

      await page.goto(path);

      await expect(page).toHaveURL(path);
      await expect(page.locator('main h1')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('mobile navigation and report content fit a small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await installApiMocks(page);
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    ));
    expect(hasHorizontalOverflow).toBe(false);

    const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
    const openButton = page.getByRole('button', { name: 'Open navigation' });
    await expect(navigation).toBeHidden();
    const openButtonBox = await openButton.boundingBox();
    expect(openButtonBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(openButtonBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await openButton.click();
    const closeButton = navigation
      .getByRole('button', { name: 'Close navigation' });
    await expect(closeButton).toBeVisible();
    const closeButtonBox = await closeButton.boundingBox();
    expect(closeButtonBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(closeButtonBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await navigation.getByRole('link', { name: 'Child Labor Dashboard' }).click();
    await expect(page).toHaveURL('/?view=child-laborers');
    await expect(page.getByRole('heading', { name: 'Child Laborer Dashboard' })).toBeVisible();
    await expect(navigation).toBeHidden();
  });

  test('dashboard remains usable in mobile landscape with reduced motion', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await installApiMocks(page);
    await page.goto('/');

    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    expect(await page.evaluate(() => (
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    ))).toBe(false);
  });

  test('SK officials cannot open administrator-only pages', async ({ page }) => {
    await installApiMocks(page, 'SK_OFFICIAL');
    await page.goto('/accounts');

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'SK Accounts' })).toHaveCount(0);
  });
});
