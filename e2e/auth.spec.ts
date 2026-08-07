import { test, expect } from './fixtures'

test.describe('Auth', () => {
  test('sign-in page renders the GitHub sign-in button', async ({ page }) => {
    await page.goto('/signin')
    await expect(page.getByRole('button', { name: /sign in with github/i })).toBeVisible()
  })

  test('GitHub OAuth callback with a token redirects into the dashboard', async ({ page, setupMockAuth }) => {
    await setupMockAuth()
    await page.goto('/auth/callback?token=mock_jwt_token_123')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('a cancelled OAuth flow redirects back to sign-in', async ({ page }) => {
    await page.goto('/auth/callback?error=access_denied')
    await expect(page).toHaveURL(/\/signin/, { timeout: 5000 })
  })

  test('unauthenticated access to /dashboard redirects to /signin', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/signin/)
  })
})
