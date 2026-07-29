import { expect, test } from '@playwright/test';
import { installApiMocks, runtimeErrors } from '../helpers/mock-app';

test.describe('Category registry switching', () => {
  test('separates youth and child laborer datasets without duplicating category cards', async ({ page }) => {
    const errors = runtimeErrors(page);
    await installApiMocks(page);
    await page.goto('/categories');

    await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Youth Registry', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'KK Youth Profile 2026' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Child Laborer Records 2026' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Child Laborer', exact: true }).click();

    await expect(page).toHaveURL('/categories?type=child-laborer');
    await expect(page.getByRole('button', { name: 'Child Laborer', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'Child Laborer Records 2026' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'KK Youth Profile 2026' })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('uses a child laborer category to define the record filing year', async ({ page }) => {
    await installApiMocks(page);
    await page.goto('/child-laborers/new');

    await expect(page.getByLabel('Category')).toHaveValue('child-category-2026');
    await expect(page.getByLabel('Filing Year')).toHaveValue('2026');
    await expect(page.getByText('Defined by the selected category.')).toBeVisible();
  });
});
