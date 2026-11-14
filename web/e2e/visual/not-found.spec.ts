import { test, expect } from './fixtures';

/**
 * 404 (NotFound) visual regression (B-4a).
 *
 * Real fixed sub-scope, deliberately: with fresh localStorage
 * (fixtures.ts), Recently Viewed renders nothing — this baseline
 * captures the true first-time-visitor 404, including B-6's Popular
 * Notes section (which, unlike Recently Viewed, doesn't depend on
 * localStorage and is always present for this visitor — see
 * PopularNotes.tsx's own header comment).
 */
test('404 page renders consistently for a first-time visitor', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');
  await expect(page.getByText('🔍 Page Not Found')).toBeVisible();
  await expect(page.getByText('Popular Notes')).toBeVisible();

  await expect(page).toHaveScreenshot('not-found-first-visit.png', { fullPage: true });
});
