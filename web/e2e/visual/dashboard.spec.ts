import { test, expect } from './fixtures';

/**
 * Dashboard visual regression (B-4a).
 *
 * Fresh-localStorage state (from fixtures.ts) means the "first-time
 * visitor" shape of the page — no Continue Reading card, no daily-goal
 * progress, default greeting/avatar. This is deliberate: it's the one
 * state every real visitor passes through, and the most reproducible
 * one to baseline against. A signed-in/populated-state variant is a
 * reasonable follow-up (M2-2-style "informed by, not blocked on"
 * coverage growth), not required for this ticket's own Done-when
 * ("a CI run produces a real screenshot diff report between two
 * commits") — one real page is enough to prove the mechanism works.
 */
test('dashboard renders consistently for a first-time visitor', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('AWS')).toBeVisible();

  await expect(page).toHaveScreenshot('dashboard-first-visit.png', { fullPage: true });
});
