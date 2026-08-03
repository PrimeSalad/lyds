import { expect, test, type Locator } from '@playwright/test';
import { installApiMocks, runtimeErrors } from '../helpers/mock-app';

const optionLabels = async (select: Locator) => (
  select.locator('option').allTextContents()
);

test.describe('Record registry category scope', () => {
  test('shows only Child Laborer category years and matching categories', async ({ page }) => {
    const errors = runtimeErrors(page);
    await installApiMocks(page);
    await page.goto('/child-laborers');

    const year = page.getByLabel('Filing year');
    const category = page.getByLabel('Category');
    await expect(year).toHaveValue('2026');
    expect(await optionLabels(year)).toEqual(['2026', '2025']);
    expect(await optionLabels(category)).toEqual([
      'All Child Laborer Categories',
      'Child Laborer Records 2026',
    ]);
    await expect(page.getByRole('columnheader', { name: 'Category', exact: true })).toHaveCount(0);

    await year.selectOption('2025');
    await expect(category.locator('option')).toHaveCount(2);
    expect(await optionLabels(category)).toEqual([
      'All Child Laborer Categories',
      'Child Laborer Records 2025',
    ]);
    await expect(category.locator('option', { hasText: 'KK Youth Profile' })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('shows only Youth Registry category years and matching categories', async ({ page }) => {
    const errors = runtimeErrors(page);
    await installApiMocks(page);
    await page.goto('/youth-records');

    const year = page.getByLabel('Filter by year');
    const category = page.getByLabel('Filter by category');
    await expect(year).toHaveValue('2026');
    expect(await optionLabels(year)).toEqual(['2026', '2025']);
    expect(await optionLabels(category)).toEqual([
      'All Youth Registry Categories',
      'KK Youth Profile 2026',
    ]);

    await year.selectOption('2025');
    await expect(category.locator('option')).toHaveCount(2);
    expect(await optionLabels(category)).toEqual([
      'All Youth Registry Categories',
      'KK Youth Profile 2025',
    ]);
    await expect(category.locator('option', { hasText: 'Child Laborer' })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('shows the empty OSY 2026 category with CSV import and CSV or Excel export actions', async ({ page }) => {
    const errors = runtimeErrors(page);
    await installApiMocks(page);
    await page.goto('/out-of-school-youth');

    const year = page.getByLabel('Filter by year');
    const category = page.getByLabel('Filter by category');
    await expect(year).toHaveValue('2025');
    expect(await optionLabels(year)).toEqual(['2026', '2025']);

    await year.selectOption('2026');
    expect(await optionLabels(category)).toEqual([
      'All Out-of-School Youth Categories',
      'Out-of-School Youth 2026',
    ]);

    await expect(page.getByRole('button', { name: 'Import CSV' })).toBeVisible();
    await page.getByRole('button', { name: 'Export CSV / Excel' }).click();
    await expect(page.getByRole('button', { name: 'CSV · Re-importable' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Excel · Print-ready' })).toBeVisible();
    await page.getByLabel('Close export dialog').click();

    await page.getByRole('button', { name: 'Import CSV' }).click();
    await expect(page).toHaveURL('/imports?type=out-of-school-youth');
    expect(errors).toEqual([]);
  });

  test('uses filing year as the parent selector in both record forms', async ({ page }) => {
    await installApiMocks(page);

    await page.goto('/child-laborers/new');
    await expect(page.getByLabel('Filing Year')).toHaveValue('2026');
    await expect(page.getByLabel('Child Laborer Category')).toHaveValue('child-category-2026');
    expect(await optionLabels(page.getByLabel('Child Laborer Category'))).toEqual([
      'Select child laborer category',
      'Child Laborer Records 2026',
    ]);

    await page.goto('/youth-records/new');
    await expect(page.getByLabel(/^Filing Year/)).toHaveValue('2026');
    await expect(page.getByLabel('Youth Registry Category')).toHaveValue('category-2026');
    expect(await optionLabels(page.getByLabel('Youth Registry Category'))).toEqual([
      'Select youth category',
      'KK Youth Profile 2026',
    ]);
  });
});
