import { test, expect } from './fixtures';

test.describe('Authentication', () => {
  test('sign-in page renders GitHub authentication button', async ({ page }) => {
    await page.goto('/signin');
    // Ensure the page renders title and GitHub button
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    await expect(page.locator('text=Sign in with GitHub')).toBeVisible();
  });

  test('GitHub OAuth callback redirects to dashboard upon successful login', async ({ page, setupMockAuth }) => {
    // Setup the mock responses for the profile check and discover page requests
    await setupMockAuth();

    // Visit the callback route with a mock token
    await page.goto('/auth/callback?token=mock_jwt_token_123');

    // After a successful login, the app should fetch /me and redirect to /dashboard/discover
    await expect(page).toHaveURL(/.*\/dashboard\/discover/);

    // Verify dashboard discover page content is rendered
    await expect(page.locator('text=Get matched to your next')).toBeVisible();
    await expect(page.locator('text=Recommended Projects (1)')).toBeVisible();
  });

  test('GitHub OAuth callback handles access denied or cancellation', async ({ page }) => {
    // Visit callback page with access_denied error parameter
    await page.goto('/auth/callback?error=access_denied');

    // Wait for the automatic redirection back to signin page (takes 3 seconds)
    await expect(page).toHaveURL(/.*\/signin/, { timeout: 6000 });

    // Verify we are back on the sign-in page
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    await expect(page.locator('text=Sign in with GitHub')).toBeVisible();
  });
});
