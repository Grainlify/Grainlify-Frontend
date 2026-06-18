import { test as base } from '@playwright/test';

/**
 * Interface representing mock user profile details.
 */
export interface MockUser {
  id: string;
  role: string;
  github: {
    login: string;
    avatar_url: string;
    name: string;
    email: string;
  };
}

/**
 * Fixture options and helpers for setting up mocked E2E authentication.
 */
export interface AuthFixtures {
  /**
   * Helper function to setup API route interception for auth endpoints.
   * Stubs out `/me` profile check, stats, and recommended projects.
   */
  setupMockAuth: (user?: MockUser) => Promise<void>;
}

/**
 * Custom Playwright test fixture to allow stubbing of the backend auth state.
 */
export const test = base.extend<AuthFixtures>({
  setupMockAuth: async ({ page }, use) => {
    const defaultUser: MockUser = {
      id: 'mock-user-123',
      role: 'contributor',
      github: {
        login: 'mockdeveloper',
        avatar_url: 'https://github.com/mockdeveloper.png',
        name: 'Mock Developer',
        email: 'mockdeveloper@example.com',
      },
    };

    const setupMockAuthFn = async (user: MockUser = defaultUser) => {
      // Intercept profile fetch /me
      await page.route('**/me', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(user),
        });
      });

      // Intercept landing stats
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

      // Intercept recommended projects for the dashboard discover page
      await page.route('**/projects/recommended*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            projects: [
              {
                id: 'proj-1',
                github_full_name: 'test-owner/test-repo',
                language: 'TypeScript',
                tags: ['TypeScript', 'e2e'],
                category: 'Testing',
                stars_count: 42,
                forks_count: 7,
                open_issues_count: 3,
                open_prs_count: 1,
                ecosystem_name: 'TestEcosystem',
                ecosystem_slug: 'testecosystem',
                description: 'A mock project for testing',
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
              },
            ],
          }),
        });
      });

      // Intercept issues for the discover page
      await page.route('**/projects/proj-1/issues/public', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            issues: [
              {
                github_issue_id: 101,
                number: 1,
                state: 'open',
                title: 'Test Issue 1',
                description: 'This is a mock issue description',
                author_login: 'mockdeveloper',
                labels: ['good first issue'],
                url: 'https://github.com/test-owner/test-repo/issues/1',
                updated_at: '2026-01-01T00:00:00Z',
                last_seen_at: '2026-01-01T00:00:00Z',
              },
            ],
          }),
        });
      });
    };

    await use(setupMockAuthFn);
  },
});

export { expect } from '@playwright/test';
