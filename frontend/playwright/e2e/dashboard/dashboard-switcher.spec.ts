import { expect, test } from '@playwright/test';
import { installApiMocks, runtimeErrors } from '../helpers/mock-app';

test.describe('Dashboard dataset switcher', () => {
  test('uses one dashboard destination and switches registries inside the workspace', async ({ page }) => {
    const errors = runtimeErrors(page);
    await installApiMocks(page);
    await page.goto('/');

    const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(navigation.getByText('Overview', { exact: true })).toBeVisible();
    await expect(navigation.getByText('Records and review', { exact: true })).toBeVisible();
    await expect(page.getByText('Local Youth Development Office', { exact: true })).toBeVisible();
    await expect(page.locator('header').getByText('Administrator', { exact: true })).toHaveCount(0);
    await expect(page.locator('header').getByRole('link', { name: /account settings/i })).toHaveCount(0);
    await expect(navigation.getByRole('link', { name: 'Account Settings' })).toHaveCount(1);

    await expect(navigation.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(navigation.getByRole('link', { name: /Youth Dashboard|Child Labor Dashboard/ })).toHaveCount(0);

    await page.getByLabel('Registry').selectOption('CHILD_LABORERS');

    await expect(page).toHaveURL('/?view=child-laborers');
    await expect(page.getByRole('heading', { name: 'Child Laborer Dashboard' })).toBeVisible();
    await page.getByLabel('Registry').selectOption('YOUTH');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Youth Registry Dashboard' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('switches from youth analytics to the current child laborer dashboard', async ({ page }) => {
    const errors = runtimeErrors(page);
    await installApiMocks(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Youth Registry Dashboard' })).toBeVisible();
    await expect(page.getByText('Records represented', { exact: true })).toBeVisible();

    await page.getByLabel('Registry').selectOption('CHILD_LABORERS');

    await expect(page).toHaveURL('/?view=child-laborers');
    await expect(page.getByRole('heading', { name: 'Child Laborer Dashboard' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Child labor intelligence for focused local action' })).toBeVisible();
    await expect(page.getByText('Records represented', { exact: true })).toBeVisible();
    await expect(page.getByText('Validated records', { exact: true })).toBeVisible();
    await expect(page.getByText('Reported nature of work', { exact: true })).toBeVisible();
    await expect(page.getByText('No records match the current filters.')).toHaveCount(0);

    await page.getByLabel('Filing year').selectOption('2026');
    await expect(page.getByText('2026 situation snapshot', { exact: true })).toBeVisible();

    await page.getByLabel('Registry').selectOption('YOUTH');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Youth Registry Dashboard' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('keeps the child laborer dashboard controls usable on a small phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await installApiMocks(page);
    await page.goto('/?view=child-laborers');

    const viewSelector = page.getByLabel('Registry');
    await expect(viewSelector).toHaveValue('CHILD_LABORERS');
    await expect(page.getByLabel('Filing year')).toBeVisible();
    expect((await viewSelector.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
