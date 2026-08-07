import { test, expect } from './fixtures'

// This branch's Dashboard has no distinct router paths for its internal
// pages - navigation is `/dashboard?tab=browse`, not `/dashboard/browse`.
test.describe('Browse and search', () => {
  test.beforeEach(async ({ page, setupMockAuth, setupMockBrowse }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('patchwork_jwt', 'mock_jwt_token_123')
    })
    await setupMockAuth()
    await setupMockBrowse()
  })

  test('browse tab renders the mocked project grid', async ({ page }) => {
    await page.goto('/dashboard?tab=browse')
    // Cards show just the repo name (org prefix stripped), not the full "org/repo".
    await expect(page.getByRole('heading', { name: 'example-repo' })).toBeVisible({ timeout: 10000 })
  })

  test('opening search via the nav and typing shows matching results', async ({ page }) => {
    await page.goto('/dashboard?tab=discover')
    await page.keyboard.press('Control+k')
    const searchInput = page.getByPlaceholder(/search/i).first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
    await searchInput.fill('dashboard')
    await expect(page.getByText('Add dark mode support')).toBeVisible()
  })
})
