import { test, expect } from './fixtures';

/** Notes-index visual regression (B-4a) — the unscoped, all-subjects listing. */
test('notes-index renders consistently', async ({ page }) => {
  await page.goto('/notes-index');
  await expect(page.getByLabel('Search notes')).toBeVisible();

  await expect(page).toHaveScreenshot('notes-index.png', { fullPage: true });
});
