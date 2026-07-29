import { expect, test } from '@playwright/test';
import { installApiMocks, runtimeErrors } from '../helpers/mock-app';

test.describe('Dashboard dataset switcher', () => {
  test('exposes both dashboards directly from the grouped workspace navigation', async ({ page }) => {
    const errors = runtimeErrors(page);
    await installApiMocks(page);
    await page.goto('/');

    const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(navigation.getByText('Overview', { exact: true })).toBeVisible();
    await expect(navigation.getByText('Records and review', { exact: true })).toBeVisible();
    await expect(page.getByText('Local Youth Development Office', { exact: true })).toBeVisible();

    await navigation.getByRole('link', { name: 'Child Labor Dashboard' }).click();

    await expect(page).toHaveURL('/?view=child-laborers');
    await expect(page.getByRole('heading', { name: 'Child Laborer Dashboard' })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Child Labor Dashboard' })).toHaveAttribute('aria-current', 'page');

    await navigation.getByRole('link', { name: 'Youth Dashboard' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('switches from youth analytics to the current child laborer dashboard', async ({ page }) => {
    const errors = runtimeErrors(page);
    await installApiMocks(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    await expect(page.getByText('Youth records', { exact: true })).toBeVisible();

    await page.getByLabel('Dashboard view').selectOption('CHILD_LABORERS');

    await expect(page).toHaveURL('/?view=child-laborers');
    await expect(page.getByRole('heading', { name: 'Child Laborer Dashboard' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Child labor intelligence for focused local action' })).toBeVisible();
    await expect(page.getByText('Records represented', { exact: true })).toBeVisible();
    await expect(page.getByText('Validated records', { exact: true })).toBeVisible();
    await expect(page.getByText('Reported nature of work', { exact: true })).toBeVisible();
    await expect(page.getByText('No records match the current filters.')).toHaveCount(0);

    await page.getByLabel('Filing year').selectOption('2025');
    await expect(page.getByText('2025 situation snapshot', { exact: true })).toBeVisible();

    await page.getByLabel('Dashboard view').selectOption('YOUTH');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('keeps the child laborer dashboard controls usable on a small phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await installApiMocks(page);
    await page.goto('/?view=child-laborers');

    const viewSelector = page.getByLabel('Dashboard view');
    await expect(viewSelector).toHaveValue('CHILD_LABORERS');
    await expect(page.getByLabel('Filing year')).toBeVisible();
    expect((await viewSelector.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
