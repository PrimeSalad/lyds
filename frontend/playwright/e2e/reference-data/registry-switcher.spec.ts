import { expect, test } from '@playwright/test';
import { installApiMocks } from '../helpers/mock-app';

test('switches Reference Data between Youth and Child Laborer registries', async ({ page }) => {
  await installApiMocks(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/reference-data');

  await expect(page.getByRole('button', { name: 'Youth Registry' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Youth Classification' })).toBeVisible();

  await page.getByRole('button', { name: 'Child Laborer' }).click();

  await expect(page).toHaveURL('/reference-data?type=child-laborer');
  await expect(page.getByRole('button', { name: 'Child Laborer' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Highest Grade Completed' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nature of Work' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Parent or Guardian Occupation' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
