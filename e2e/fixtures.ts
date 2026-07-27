/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, Route } from '@playwright/test';

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
 * Fixture options and helpers for setting up mocked E2E authentication,
 * browse data, and leaderboard data.
 */
export interface AuthFixtures {
  /**
   * Helper function to setup API route interception for auth endpoints.
   * Stubs out `/me` profile check, stats, and recommended projects.
   */
  setupMockAuth: (user?: MockUser) => Promise<void>;
  /**
   * Helper to mock the browse page API endpoints: ecosystems and
   * paginated projects list.
   * @param options.totalProjects - Total projects available (default 30).
   */
  setupMockBrowse: (options?: { totalProjects?: number }) => Promise<void>;
}

/**
 * Build a single entry in the projects array returned by the mock browse API.
 */
function buildMockProject(index: number) {
  return {
    id: `proj-${index}`,
    github_full_name: `owner/project-${index}`,
    language: 'TypeScript',
    tags: ['e2e', 'test'],
    category: 'Testing',
    stars_count: index * 10,
    forks_count: index * 2,
    contributors_count: index,
    open_issues_count: index % 5,
    open_prs_count: index % 3,
    ecosystem_name: 'Test Ecosystem',
    ecosystem_slug: 'test-ecosystem',
    description: `E2e test project number ${index}`,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}


/**
 * Custom Playwright test fixture to allow stubbing of the backend auth state,
 * browse pagination, and leaderboard data.
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
      await page.route('**/me', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(user),
        });
      });

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

  setupMockBrowse: async ({ page }, use) => {
    const setupMockBrowseFn = async (options?: { totalProjects?: number }) => {
      const total = options?.totalProjects ?? 30;

      await page.route('**/ecosystems', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ecosystems: [
              {
                id: 'eco-1',
                slug: 'test-ecosystem',
                name: 'Test Ecosystem',
                description: 'A test ecosystem for e2e',
                logo_url: null,
                website_url: null,
                status: 'active',
                project_count: total,
                user_count: 100,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
              },
            ],
          }),
        });
      });

      await page.route(/\/projects\?/, async (route) => {
        const url = new URL(route.request().url());
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        const limit = parseInt(url.searchParams.get('limit') || '12', 10);

        const remaining = Math.max(0, total - offset);
        const count = Math.min(limit, remaining);
        const projects = Array.from({ length: count }, (_, i) =>
          buildMockProject(offset + i + 1),
        );

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ projects, total, limit, offset }),
        });
      });
    };

    await use(setupMockBrowseFn);
  },
});

export { expect } from '@playwright/test';
