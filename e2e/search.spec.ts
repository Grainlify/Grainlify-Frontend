import { test, expect } from './fixtures';

test.describe('Search', () => {
  test.beforeEach(async ({ page, setupMockAuth }) => {
    await setupMockAuth();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('patchwork_jwt', 'mock_jwt_token_123');
    });
  });

  test('renders search page with input and suggestions', async ({ page }) => {
    await page.goto('/dashboard/search');

    await expect(page.locator('text=Search Open Source Projects')).toBeVisible();
    await expect(page.locator('input[placeholder="Search issues, projects, contributors..."]')).toBeVisible();
    await expect(page.locator('text=Search suggestions')).toBeVisible();

    const suggestionPills = page.locator('text=/Terminal-based|Unity projects|GraphQL clients|AI-powered tools/');
    await expect(suggestionPills).toHaveCount(4);
  });

  test('search input returns results for matching query', async ({ page }) => {
    await page.goto('/dashboard/search');

    const searchInput = page.locator('input[placeholder="Search issues, projects, contributors..."]');
    await searchInput.fill('React');

    await expect(page.locator('text=Search Results')).toBeVisible();
    await expect(page.locator('text=Search Results (3)')).toBeVisible();

    const resultItems = page.locator('button:has(div:has-text("React Dashboard"))');
    await expect(resultItems.first()).toBeVisible();
  });

  test('shows empty results when no match', async ({ page }) => {
    await page.goto('/dashboard/search');

    const searchInput = page.locator('input[placeholder="Search issues, projects, contributors..."]');
    await searchInput.fill('zzzxyz');

    await expect(page.locator('text=No results found')).toBeVisible();
    await expect(page.locator('text=Try searching for something else')).toBeVisible();
  });

  test('clear button resets search back to suggestions', async ({ page }) => {
    await page.goto('/dashboard/search');

    const searchInput = page.locator('input[placeholder="Search issues, projects, contributors..."]');
    await searchInput.fill('React');

    await expect(page.locator('text=Search Results (3)')).toBeVisible();

    await page.locator('button:has(svg.lucide-x)').first().click();

    await expect(page.locator('input[placeholder="Search issues, projects, contributors..."]')).toHaveValue('');
    await expect(page.locator('text=Search suggestions')).toBeVisible();
  });

  test('suggestion pill populates search input', async ({ page }) => {
    await page.goto('/dashboard/search');

    await page.locator('text=Terminal-based markdown editors').click();

    await expect(page.locator('input[placeholder="Search issues, projects, contributors..."]')).toHaveValue(
      'Terminal-based markdown editors worth checking out',
    );
  });
});
