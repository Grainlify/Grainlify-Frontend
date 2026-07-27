import { test, expect } from './fixtures';

const BROWSE_PAGE_SIZE = 12;

test.describe('Browse Pagination', () => {
  test.beforeEach(async ({ page, setupMockAuth, setupMockBrowse }) => {
    await setupMockAuth();
    await setupMockBrowse({ totalProjects: 30 });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('patchwork_jwt', 'mock_jwt_token_123');
    });
  });

  test('renders browse page with project cards and showing counter', async ({ page }) => {
    await page.goto('/dashboard/browse');

    const cards = page.locator('h4');
    await expect(cards.first()).toBeVisible();

    await expect(page.locator('text=Showing 12 of 30 projects')).toBeVisible();
  });

  test('load more appends project cards', async ({ page }) => {
    await page.goto('/dashboard/browse');

    await expect(page.locator('h4')).toHaveCount(BROWSE_PAGE_SIZE);

    await page.locator('button', { hasText: 'Load more' }).click();
    await expect(page.locator('h4')).toHaveCount(BROWSE_PAGE_SIZE * 2);

    await page.locator('button', { hasText: 'Load more' }).click();
    await expect(page.locator('h4')).toHaveCount(30);

    await expect(page.locator('text=Showing 30 of 30 projects')).toBeVisible();
    await expect(page.locator('text=You\'ve reached the end of the list.')).toBeVisible();
  });

  test('shows end-of-list when fewer than one page of projects', async ({ page, setupMockBrowse }) => {
    await setupMockBrowse({ totalProjects: 5 });
    await page.goto('/dashboard/browse');

    await expect(page.locator('h4')).toHaveCount(5);
    await expect(page.locator('text=Showing 5 of 5 projects')).toBeVisible();
    await expect(page.locator('text=You\'ve reached the end of the list.')).toBeVisible();
  });

  test('shows empty state when no projects found', async ({ page, setupMockBrowse }) => {
    await setupMockBrowse({ totalProjects: 0 });
    await page.goto('/dashboard/browse');

    await expect(page.locator('text=No projects found')).toBeVisible();
    await expect(page.locator('text=Try adjusting your filters')).toBeVisible();
  });
});
