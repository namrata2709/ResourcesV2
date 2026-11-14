import { test, expect } from './fixtures';

/** Quiz-index visual regression (B-4a). */
test('quiz-index renders consistently', async ({ page }) => {
  await page.goto('/quiz-index');
  await expect(page.getByLabel('Search quizzes')).toBeVisible();

  await expect(page).toHaveScreenshot('quiz-index.png', { fullPage: true });
});
