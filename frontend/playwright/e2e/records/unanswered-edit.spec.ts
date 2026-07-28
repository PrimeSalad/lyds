import { test, expect } from '@playwright/test';
import { installApiMocks } from '../helpers/mock-app';

test.describe('Imported unanswered responses', () => {
  test('editing another field does not convert blanks to no', async ({ page }) => {
    await installApiMocks(page);
    let savedBody: Record<string, unknown> | null = null;
    await page.route('http://localhost:4000/api/v1/youth-records/record-unanswered', async (route) => {
      if (route.request().method() !== 'PATCH') {
        await route.fallback();
        return;
      }
      savedBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { id: 'record-unanswered' } }),
      });
    });

    await page.goto('/youth-records/record-unanswered/edit');
    await expect(page.getByRole('heading', { name: 'Edit Youth Record' })).toBeVisible();
    await expect(page.getByLabel('Registered Voter?')).toHaveValue('');
    await expect(page.getByLabel('Voted Last Election?')).toHaveValue('');
    await expect(page.getByLabel('Attended KK Assembly?')).toHaveValue('');

    await page.getByLabel('Contact Number').fill('09171234567');
    await page.getByRole('button', { name: 'Save Draft' }).click();

    await expect.poll(() => savedBody).not.toBeNull();
    expect(savedBody).toMatchObject({
      contact_number: '09171234567',
      is_registered_voter: null,
      voted_last_election: null,
      attended_kk_assembly: null,
    });
  });
});
