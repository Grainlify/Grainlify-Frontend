import { test, expect } from '@playwright/test';

test.describe('Routing', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept stats landing API call
    await page.route('**/stats/landing', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          active_projects: 42,
          contributors: 1337,
          grants_distributed_usd: 125000,
        }),
      });
    });
  });

  test('landing page renders successfully', async ({ page }) => {
    await page.goto('/');
    // Check that landing page elements are visible
    await expect(page.locator('text=Everything You Need to Succeed')).toBeVisible();
    await expect(page.locator('text=Why Choose Grainlify?')).toBeVisible();
  });

  test('unauthenticated /dashboard redirects to /signin', async ({ page }) => {
    await page.goto('/dashboard');
    // Check that we got redirected to signin with returnTo parameter
    await expect(page).toHaveURL(/.*\/signin\?returnTo=.*/);
    await expect(page.locator('text=Sign in with GitHub')).toBeVisible();
  });

  test('unknown route renders the 404 page', async ({ page }) => {
    await page.goto('/some-completely-invalid-route');
    // Check that NotFoundPage is rendered
    await expect(page.locator('text=Page Not Found')).toBeVisible();
    await expect(page.locator('text=404')).toBeVisible();
  });
});
