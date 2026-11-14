import { test, expect } from './fixtures';

/**
 * Note page visual regression (B-4a), using the one real fixture note
 * folder shipped in this repo (`dsa-merge-sort`).
 *
 * Known, documented gap in the fixture itself (not this test, not a
 * real app bug): this folder has no generated `body-prose.json` yet
 * (CHANGELOG/sprint-tickets.md already flag this under T5-3a's manual
 * test notes — "stale/incomplete fixture, not evidence the feature is
 * broken"). The page still renders its header, breadcrumb, and every
 * other module that doesn't depend on body-prose, so it's still a
 * real, useful baseline for those parts of the page. Once a real
 * `body-prose.json` ships for this folder, this baseline will need a
 * `--update-snapshots` pass — that's expected, not a regression.
 */
test('note page renders consistently (dsa-merge-sort fixture)', async ({ page }) => {
  await page.goto('/notes/dsa-merge-sort');
  await expect(page.getByRole('heading', { name: 'Merge Sort', level: 1 })).toBeVisible();

  await expect(page).toHaveScreenshot('note-dsa-merge-sort.png', { fullPage: true });
});
