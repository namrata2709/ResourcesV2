import { test, expect } from './fixtures';

/** Gallery visual regression (B-4a). */
test('gallery renders consistently', async ({ page }) => {
  await page.goto('/gallery');
  await expect(page.getByLabel('Search images')).toBeVisible();

  await expect(page).toHaveScreenshot('gallery.png', { fullPage: true });
});
