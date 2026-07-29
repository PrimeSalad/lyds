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
    await expect(page.getByText('Validated records', { exact: true })).toBeVisible();
    await expect(page.getByText('1 record with validation remarks', { exact: true })).toBeVisible();
    await expect(page.getByText('100.0%', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Dela Cruz', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Seasonal farm work', { exact: true }).first()).toBeVisible();
    const recordRow = page.getByRole('row').filter({ hasText: 'Seasonal farm work' });
    await expect(recordRow.getByText('Validated', { exact: true })).toBeVisible();
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

  test('rebuilds every chart when the live API still returns the legacy summary', async ({ page }) => {
    await installApiMocks(page);
    await page.route('**/api/v1/child-laborers/summary**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            total_records: 1,
            attending_school: 1,
            not_attending_school: 0,
            active_cases: 1,
            closed_cases: 0,
            status_counts: { IDENTIFIED: 0, VALIDATED: 1 },
          },
        }),
      });
    });
    await page.goto('/reports');

    await page.getByLabel('Report dataset').selectOption('CHILD_LABORERS');

    await expect(page.getByText('No records match the current filters.')).toHaveCount(0);
    await expect(page.getByText('Female', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('10–14', { exact: true }).first()).toBeVisible();
    await expect(page.locator('[aria-label="Agot: 1, 100.0%"]')).toBeVisible();
    await expect(
      page.locator('[aria-label="Seasonal farm work: 1, 100.0%"]'),
    ).toBeVisible();
  });
});
