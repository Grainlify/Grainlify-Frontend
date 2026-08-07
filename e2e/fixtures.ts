import { test as base, expect, type Page } from '@playwright/test'

interface AuthFixtures {
  setupMockAuth: () => Promise<void>
  setupMockBrowse: () => Promise<void>
}

async function mockAuth(page: Page) {
  await page.route('**/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        role: 'contributor',
        github: { login: 'octocat', avatar_url: 'https://example.com/avatar.png' },
      }),
    })
  })
  await page.route('**/stats/landing', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ active_projects: 4, contributors: 120, grants_distributed_usd: 50000 }),
    })
  })
  await page.route('**/projects/recommended*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ projects: [] }) })
  })
}

async function mockBrowse(page: Page) {
  await page.route('**/projects*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        projects: [
          {
            id: 'proj-1',
            github_full_name: 'grainlify/example-repo',
            language: 'TypeScript',
            tags: ['good first issue'],
            category: 'Backend',
            stars_count: 42,
            forks_count: 3,
            contributors_count: 5,
            open_issues_count: 2,
          },
        ],
      }),
    })
  })
  await page.route('**/ecosystems', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ecosystems: [{ id: 'eco-1', name: 'Stellar', status: 'active' }] }),
    })
  })
}

export const test = base.extend<AuthFixtures>({
  setupMockAuth: async ({ page }, use) => {
    await use(async () => {
      await mockAuth(page)
    })
  },
  setupMockBrowse: async ({ page }, use) => {
    await use(async () => {
      await mockBrowse(page)
    })
  },
})

export { expect }
