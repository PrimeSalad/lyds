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

  test('switches to the yearly child laborer report and shows the official record fields', async ({ page }) => {
    await installApiMocks(page);
    await page.goto('/reports');

    await page.getByLabel('Report dataset').selectOption('CHILD_LABORERS');

    await expect(page.getByRole('heading', { name: 'Child Laborer Analytics' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'School attendance' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Case status pipeline' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Barangay concentration' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reporting completeness' })).toBeVisible();
    await expect(page.getByText('100.0%', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Dela Cruz', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Seasonal farm work', { exact: true }).first()).toBeVisible();
    const recordRow = page.getByRole('row').filter({ hasText: 'Seasonal farm work' });
    await expect(recordRow.getByText('Monitored', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export XLSX/i })).toBeVisible();
  });

  test('keeps the analytics dashboard readable on a small mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await installApiMocks(page);
    await page.goto('/reports');

    await page.getByLabel('Report dataset').selectOption('CHILD_LABORERS');

    await expect(page.getByRole('heading', { name: 'Child Laborer Analytics' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'School attendance' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Decision brief' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Detailed child laborer registry' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
