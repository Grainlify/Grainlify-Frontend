import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { LeaderboardPage } from './LeaderboardPage'
import { getLeaderboard, getRecommendedProjects, getEcosystems } from '../../../shared/api/client'

// LeaderboardPage itself fetches getLeaderboard (contributors, the default tab) and
// getRecommendedProjects (only once the user switches to the "projects" tab, not on
// mount). Its child FiltersSection also independently calls getEcosystems() on mount
// to populate the ecosystem filter dropdown, so that must be mocked here too even
// though LeaderboardPage never imports it directly itself.
vi.mock('../../../shared/api/client', () => ({
  getLeaderboard: vi.fn(),
  getRecommendedProjects: vi.fn(),
  getEcosystems: vi.fn(),
}))

const mockedGetLeaderboard = vi.mocked(getLeaderboard)
const mockedGetRecommendedProjects = vi.mocked(getRecommendedProjects)
const mockedGetEcosystems = vi.mocked(getEcosystems)

type LeaderboardResponse = Awaited<ReturnType<typeof getLeaderboard>>
type ApiLeaderRow = LeaderboardResponse[number]

function makeLeaderRow(
  overrides: Partial<ApiLeaderRow> & Pick<ApiLeaderRow, 'rank' | 'username'>,
): ApiLeaderRow {
  return {
    rank_tier: 'gold',
    rank_tier_name: 'Gold',
    avatar: `https://github.com/${overrides.username}.png?size=200`,
    user_id: `user-${overrides.rank}`,
    contributions: 0,
    ecosystems: [],
    score: 0,
    trend: 'same',
    trendValue: 0,
    ...overrides,
  }
}

const row1 = makeLeaderRow({
  rank: 1,
  username: 'octocat',
  score: 980,
  user_id: 'u1',
  contributions: 120,
  ecosystems: ['Web3'],
  trend: 'up',
  trendValue: 3,
})
const row2 = makeLeaderRow({
  rank: 2,
  username: 'hubot',
  score: 875,
  user_id: 'u2',
  contributions: 98,
  ecosystems: ['AI'],
  trend: 'down',
  trendValue: -1,
})
const row3 = makeLeaderRow({
  rank: 3,
  username: 'monalisa',
  score: 760,
  user_id: 'u3',
  contributions: 77,
  ecosystems: ['Data'],
  trend: 'same',
  trendValue: 0,
})

type RecommendedProjectsResponse = Awaited<ReturnType<typeof getRecommendedProjects>>
type ApiProject = RecommendedProjectsResponse['projects'][number]

function makeApiProject(
  overrides: Partial<ApiProject> & Pick<ApiProject, 'id' | 'github_full_name'>,
): ApiProject {
  return {
    language: 'TypeScript',
    tags: [],
    category: null,
    stars_count: 0,
    forks_count: 0,
    contributors_count: 0,
    open_issues_count: 0,
    open_prs_count: 0,
    ecosystem_name: null,
    ecosystem_slug: null,
    description: '',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('LeaderboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
  })

  it('shows the podium/table skeletons, then a populated ranked list with real row data once the leaderboard loads', async () => {
    mockedGetLeaderboard.mockResolvedValue([row1, row2, row3])

    const { container } = renderWithProviders(<LeaderboardPage />)

    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getAllByText('octocat').length).toBeGreaterThan(0)
    })
    // Each of the top 3 renders twice: once in the podium, once as a table row.
    expect(screen.getAllByText('octocat').length).toBe(2)
    expect(screen.getAllByText('hubot').length).toBe(2)
    expect(screen.getAllByText('monalisa').length).toBe(2)
    expect(screen.getAllByText('980').length).toBe(2)
    expect(screen.getAllByText('875').length).toBe(2)
    expect(screen.getAllByText('760').length).toBe(2)
    // Rank numbers appear in the table's rank column.
    expect(screen.getByText('Rank')).toBeInTheDocument()

    // LeaderboardHero has one permanent decorative "animate-shimmer" underline
    // unrelated to loading state, so the skeletons clearing means the count drops
    // to exactly that 1 (not 0).
    expect(container.querySelectorAll('.animate-shimmer').length).toBe(1)
    expect(mockedGetLeaderboard).toHaveBeenCalledWith(10, 0, undefined)
    // The "projects" leaderboard type never loads on mount — only once the user
    // switches tabs — since the default leaderboardType is "contributors".
    expect(mockedGetRecommendedProjects).not.toHaveBeenCalled()
  })

  it('renders an empty state (no podium) when the API returns zero contributors', async () => {
    mockedGetLeaderboard.mockResolvedValue([])

    renderWithProviders(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('No contributors yet. Be the first to contribute!')).toBeInTheDocument()
    })
    expect(screen.queryByText('#1')).not.toBeInTheDocument()
  })

  it('does not crash when the leaderboard fetch fails, and settles on the empty state', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedGetLeaderboard.mockRejectedValue(new Error('server exploded'))

    const { container } = renderWithProviders(<LeaderboardPage />)

    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText('No contributors yet. Be the first to contribute!')).toBeInTheDocument()
    })
    // Same permanent decorative underline noted above — 1, not 0, once skeletons clear.
    expect(container.querySelectorAll('.animate-shimmer').length).toBe(1)
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('gives the podium its full 1st/2nd/3rd special treatment once 3 or more contributors are returned', async () => {
    mockedGetLeaderboard.mockResolvedValue([row1, row2, row3])

    renderWithProviders(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
    })
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText('#3')).toBeInTheDocument()
  })

  describe('Projects tab', () => {
    it('ranks by organization, not by individual repo - multiple repos under one org become a single, aggregated entry', async () => {
      mockedGetLeaderboard.mockResolvedValue([])
      mockedGetRecommendedProjects.mockResolvedValue({
        projects: [
          makeApiProject({
            id: 'p1',
            github_full_name: 'acme/widget-kit',
            contributors_count: 30,
            open_issues_count: 2,
            ecosystem_name: 'Web3',
          }),
          makeApiProject({
            id: 'p2',
            github_full_name: 'acme/other-tool',
            contributors_count: 15,
            open_issues_count: 1,
            ecosystem_name: 'Web3',
          }),
          makeApiProject({
            id: 'p3',
            github_full_name: 'globex/data-tool',
            contributors_count: 10,
            open_issues_count: 0,
          }),
          // Excluded as a special GitHub meta-repo, same as the existing per-repo filter.
          makeApiProject({ id: 'p4', github_full_name: 'acme/.github', contributors_count: 999 }),
        ],
      })
      const user = userEvent.setup()

      renderWithProviders(<LeaderboardPage />)
      await user.click(screen.getByRole('button', { name: 'Projects' }))

      await waitFor(() => expect(screen.getAllByText('acme').length).toBeGreaterThan(0))
      expect(screen.getAllByText('globex').length).toBeGreaterThan(0)
      // Repo names never appear - only the org.
      expect(screen.queryByText('widget-kit')).not.toBeInTheDocument()
      expect(screen.queryByText('other-tool')).not.toBeInTheDocument()

      // acme's two repos are summed (30 + 15 = 45), ranking it above globex (10),
      // and its .github meta-repo's contributor count is excluded entirely.
      expect(screen.getAllByText('45').length).toBeGreaterThan(0)
      expect(screen.queryByText('999')).not.toBeInTheDocument()
    })
  })

  it('only shows the 1st place podium slot when just 1 contributor is returned', async () => {
    mockedGetLeaderboard.mockResolvedValue([row1])

    renderWithProviders(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
    })
    expect(screen.queryByText('#2')).not.toBeInTheDocument()
    expect(screen.queryByText('#3')).not.toBeInTheDocument()
  })
})
