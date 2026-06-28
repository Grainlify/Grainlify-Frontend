import { test, expect } from './fixtures'

test.describe('Auth Callback', () => {
  const VALID_TOKEN = 'mock_e2e_valid_token'
  const INVALID_TOKEN = 'mock_e2e_invalid_token'

  test('redirects to dashboard with a valid token', async ({ page, setupMockAuth }) => {
    await setupMockAuth()
    await page.goto(`/auth/callback?token=${VALID_TOKEN}`)

    await expect(page).toHaveURL(/.*\/dashboard\/discover/)
    await expect(page.locator('text=Get matched to your next')).toBeVisible()
  })

  test('routes to sign-in when token is missing', async ({ page }) => {
    await page.goto('/auth/callback')

    await expect(page.locator('text=No authentication token received')).toBeVisible()
    await expect(page).toHaveURL(/.*\/signin/, { timeout: 8000 })
    await expect(page.locator('text=Welcome Back')).toBeVisible()
  })

  test('clears state and routes to sign-in with an invalid token', async ({ page }) => {
    await page.route('**/me', async (route) => {
      await route.fulfill({ status: 401 })
    })
    await page.goto(`/auth/callback?token=${INVALID_TOKEN}`)

    await expect(page.getByRole('heading', { name: 'Authentication Failed' })).toBeVisible()

    const storedToken = await page.evaluate(() => localStorage.getItem('patchwork_jwt'))
    expect(storedToken).toBeNull()

    await expect(page).toHaveURL(/.*\/signin/, { timeout: 8000 })
    await expect(page.locator('text=Welcome Back')).toBeVisible()
  })

  test('handles extra query params alongside the token', async ({ page, setupMockAuth }) => {
    await setupMockAuth()
    await page.goto(`/auth/callback?token=${VALID_TOKEN}&state=abc&code=xyz`)

    await expect(page).toHaveURL(/.*\/dashboard\/discover/)
  })

  test('does not persist token in URL or rendered UI after successful handoff', async ({
    page,
    setupMockAuth,
  }) => {
    await setupMockAuth()
    await page.goto(`/auth/callback?token=${VALID_TOKEN}`)

    await expect(page).toHaveURL(/.*\/dashboard\/discover/)

    expect(page.url()).not.toContain('token=')
    await expect(page.locator(`text=${VALID_TOKEN}`)).toHaveCount(0)
  })
})
