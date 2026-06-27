import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'

// --- Mock the API client -------------------------------------------------
const getLeaderboard = vi.fn()
const getRecommendedProjects = vi.fn()
vi.mock('../../../shared/api/client', () => ({
  getLeaderboard: (...args: unknown[]) => getLeaderboard(...args),
  getRecommendedProjects: (...args: unknown[]) => getRecommendedProjects(...args),
}))

// --- Mock heavy / presentational children -------------------------------
// (ContributorsTable et al. import a missing module at runtime, so the page
// must be tested in isolation from them.)
vi.mock('../components/FallingPetals', () => ({
  FallingPetals: () => null,
}))
vi.mock('../components/LeaderboardStyles', () => ({
  LeaderboardStyles: () => null,
}))
vi.mock('../components/LeaderboardTypeToggle', () => ({
  LeaderboardTypeToggle: ({ onToggle }: { onToggle: (t: string) => void }) => (
    <div>
      <button onClick={() => onToggle('projects')}>to-projects</button>
      <button onClick={() => onToggle('contributors')}>to-contributors</button>
    </div>
  ),
}))
vi.mock('../components/LeaderboardHero', () => ({
  LeaderboardHero: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="hero">{children}</div>
  ),
}))
vi.mock('../components/ContributorsPodium', () => ({
  ContributorsPodium: () => <div data-testid="podium" />,
}))
vi.mock('../components/ProjectsPodium', () => ({
  ProjectsPodium: () => <div data-testid="projects-podium" />,
}))
vi.mock('../components/ContributorsPodiumSkeleton', () => ({
  ContributorsPodiumSkeleton: () => <div data-testid="podium-skeleton" />,
}))
vi.mock('../components/ContributorsTableSkeleton', () => ({
  ContributorsTableSkeleton: () => <div data-testid="table-skeleton" />,
}))
vi.mock('../components/FiltersSection', () => ({
  FiltersSection: ({
    onEcosystemChange,
  }: {
    onEcosystemChange: (e: { label: string; value: string }) => void
  }) => (
    <button onClick={() => onEcosystemChange({ label: 'Eco One', value: 'eco1' })}>pick-eco</button>
  ),
}))
vi.mock('../components/ContributorsTable', () => ({
  ContributorsTable: ({
    data,
    onUserClick,
    error,
    onRetry,
  }: {
    data: unknown[]
    onUserClick: (username: string, userId?: string) => void
    error?: string | null
    onRetry?: () => void
  }) => (
    <div data-testid="contributors-table" data-rows={data.length}>
      {error ? <div data-testid="contributors-error">{error}</div> : `${data.length} rows`}
      {error && onRetry && <button onClick={onRetry}>retry-contributors</button>}
      <button onClick={() => onUserClick('octocat', 'uid-1')}>row-click</button>
    </div>
  ),
}))
vi.mock('../components/ProjectsTable', () => ({
  ProjectsTable: ({
    data,
    error,
    onRetry,
  }: {
    data: unknown[]
    error?: string | null
    onRetry?: () => void
  }) => (
    <div data-testid="projects-table" data-rows={data.length}>
      {error && <div data-testid="projects-error">{error}</div>}
      {error && onRetry && <button onClick={onRetry}>retry-projects</button>}
    </div>
  ),
}))

import { LeaderboardPage } from './LeaderboardPage'

/** Build `count` leaderboard rows starting at the given rank. */
function makePage(count: number, startRank = 1) {
  return Array.from({ length: count }, (_, i) => ({
    rank: startRank + i,
    rank_tier: 'bronze',
    rank_tier_name: 'Bronze',
    username: `user${startRank + i}`,
    avatar: '',
    user_id: `id-${startRank + i}`,
    contributions: 1,
    ecosystems: [],
    score: 100 - i,
    trend: 'same' as const,
    trendValue: 0,
  }))
}

const renderPage = () =>
  render(
    <ThemeProvider>
      <LeaderboardPage />
    </ThemeProvider>
  )

const rows = () => Number(screen.getByTestId('contributors-table').getAttribute('data-rows'))

beforeEach(() => {
  getLeaderboard.mockReset()
  getRecommendedProjects.mockReset()
  getRecommendedProjects.mockResolvedValue({ projects: [] })
  localStorage.clear()
})

describe('LeaderboardPage pagination', () => {
  it("shows 'Load more' after a full first page", async () => {
    getLeaderboard.mockResolvedValueOnce(makePage(10))
    renderPage()

    await waitFor(() => expect(rows()).toBe(10))
    expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument()
    // First page is always requested at offset 0.
    expect(getLeaderboard).toHaveBeenCalledWith(10, 0, undefined)
  })

  it("hides 'Load more' and shows end-of-list on a short first page", async () => {
    getLeaderboard.mockResolvedValueOnce(makePage(4))
    renderPage()

    await waitFor(() => expect(rows()).toBe(4))
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
    expect(screen.getByText(/reached the end of the leaderboard/i)).toBeInTheDocument()
  })

  it("appends a page and disables 'Load more' at the end of the list", async () => {
    getLeaderboard
      .mockResolvedValueOnce(makePage(10)) // initial
      .mockResolvedValueOnce(makePage(3, 11)) // load more -> short page = end
    renderPage()

    await waitFor(() => expect(rows()).toBe(10))
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }))

    await waitFor(() => expect(rows()).toBe(13))
    // The second request paged forward by the page size.
    expect(getLeaderboard).toHaveBeenLastCalledWith(10, 10, undefined)
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
    expect(screen.getByText(/reached the end of the leaderboard/i)).toBeInTheDocument()
  })

  it("handles an empty result set with no 'Load more' button", async () => {
    getLeaderboard.mockResolvedValueOnce([])
    renderPage()

    await waitFor(() => expect(rows()).toBe(0))
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
    expect(getLeaderboard).toHaveBeenCalledTimes(1)
  })

  it('does not fire duplicate concurrent load-more requests on rapid clicks', async () => {
    let resolveSecond: (v: unknown) => void = () => {}
    const second = new Promise((res) => {
      resolveSecond = res
    })
    getLeaderboard
      .mockResolvedValueOnce(makePage(10)) // initial
      .mockReturnValueOnce(second) // load more (kept pending)

    renderPage()
    await waitFor(() => expect(rows()).toBe(10))

    const button = screen.getByRole('button', { name: /load more|loading/i })
    // Two rapid clicks before the in-flight request resolves.
    fireEvent.click(button)
    fireEvent.click(button)

    // Only the initial call + a single load-more call should have happened.
    expect(getLeaderboard).toHaveBeenCalledTimes(2)

    await act(async () => {
      resolveSecond(makePage(10, 11))
      await second
    })
    await waitFor(() => expect(rows()).toBe(20))
  })

  it('resets pagination to offset 0 when the ecosystem filter changes', async () => {
    getLeaderboard
      .mockResolvedValueOnce(makePage(10)) // initial (all ecosystems)
      .mockResolvedValueOnce(makePage(10, 11)) // load more
      .mockResolvedValueOnce(makePage(5)) // refetch after filter change
    renderPage()

    await waitFor(() => expect(rows()).toBe(10))
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }))
    await waitFor(() => expect(rows()).toBe(20))

    // Change the ecosystem filter -> pagination must restart at offset 0.
    await userEvent.click(screen.getByRole('button', { name: 'pick-eco' }))

    await waitFor(() => expect(rows()).toBe(5))
    expect(getLeaderboard).toHaveBeenLastCalledWith(10, 0, 'eco1')
  })

  it('keeps the list unchanged when load-more returns an empty page', async () => {
    getLeaderboard
      .mockResolvedValueOnce(makePage(10)) // initial full page
      .mockResolvedValueOnce([]) // load more -> nothing left
    renderPage()

    await waitFor(() => expect(rows()).toBe(10))
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }))

    await waitFor(() =>
      expect(screen.getByText(/reached the end of the leaderboard/i)).toBeInTheDocument()
    )
    expect(rows()).toBe(10)
  })

  it('disables load-more when the request errors', async () => {
    getLeaderboard.mockResolvedValueOnce(makePage(10)).mockRejectedValueOnce(new Error('boom'))
    renderPage()

    await waitFor(() => expect(rows()).toBe(10))
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
    )
  })

  it('renders an empty contributor state under the dark theme', async () => {
    localStorage.setItem('theme', 'dark')
    getLeaderboard.mockResolvedValueOnce([])
    renderPage()

    await waitFor(() => expect(rows()).toBe(0))
  })

  it('recovers gracefully when the initial fetch fails', async () => {
    getLeaderboard.mockRejectedValueOnce(new Error('boom'))
    renderPage()

    // Error path clears data, stops loading and disables load-more.
    await waitFor(() => expect(rows()).toBe(0))
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('passes a generic error to the contributors table on fetch failure', async () => {
    getLeaderboard.mockRejectedValueOnce(new Error('ECONNREFUSED 127.0.0.1:5432'))
    renderPage()

    await waitFor(() => expect(screen.getByTestId('contributors-error')).toBeInTheDocument())
    const message = screen.getByTestId('contributors-error').textContent ?? ''
    // The raw error must not leak; only generic copy is surfaced.
    expect(message).toMatch(/please try again/i)
    expect(message).not.toMatch(/ECONNREFUSED|5432/)
  })

  it('retries the contributors fetch from the table error state', async () => {
    getLeaderboard.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(makePage(6))
    renderPage()

    await waitFor(() => expect(screen.getByTestId('contributors-error')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'retry-contributors' }))

    await waitFor(() => expect(rows()).toBe(6))
    expect(screen.queryByTestId('contributors-error')).not.toBeInTheDocument()
    expect(getLeaderboard).toHaveBeenCalledTimes(2)
  })

  it('navigates to a contributor profile on row click', async () => {
    getLeaderboard.mockResolvedValueOnce(makePage(10))
    renderPage()

    await waitFor(() => expect(rows()).toBe(10))
    // jsdom treats navigation as a no-op; we just exercise the handler.
    await userEvent.click(screen.getByRole('button', { name: 'row-click' }))
  })
})

describe('LeaderboardPage projects tab', () => {
  it('loads, filters and maps recommended projects', async () => {
    getLeaderboard.mockResolvedValue([])
    getRecommendedProjects.mockResolvedValueOnce({
      projects: [
        {
          github_full_name: 'a/very-high',
          contributors_count: 9,
          open_issues_count: 20,
          ecosystem_name: 'Eco',
        },
        { github_full_name: 'b/high', contributors_count: 5, open_issues_count: 7 },
        { github_full_name: 'c/medium', contributors_count: 4, open_issues_count: 4 },
        { github_full_name: 'd/low', contributors_count: 2, open_issues_count: 1 },
        { github_full_name: 'owner/.github', contributors_count: 99, open_issues_count: 99 }, // filtered out
      ],
    })

    render(
      <ThemeProvider>
        <LeaderboardPage />
      </ThemeProvider>
    )

    // Switch to the projects leaderboard.
    await userEvent.click(screen.getByRole('button', { name: 'to-projects' }))

    await waitFor(() =>
      expect(Number(screen.getByTestId('projects-table').getAttribute('data-rows'))).toBe(4)
    )
    expect(getRecommendedProjects).toHaveBeenCalledWith(50)
  })

  it('shows the empty projects state when none are returned', async () => {
    getLeaderboard.mockResolvedValue([])
    getRecommendedProjects.mockResolvedValueOnce({ projects: [] })

    render(
      <ThemeProvider>
        <LeaderboardPage />
      </ThemeProvider>
    )

    await userEvent.click(screen.getByRole('button', { name: 'to-projects' }))

    await waitFor(() => expect(screen.getByText(/No projects yet/i)).toBeInTheDocument())
  })

  it('surfaces a generic error and retries the projects fetch', async () => {
    getLeaderboard.mockResolvedValue([])
    getRecommendedProjects
      .mockRejectedValueOnce(new Error('postgres://secret@db down'))
      .mockResolvedValueOnce({
        projects: [{ github_full_name: 'a/repo', contributors_count: 3, open_issues_count: 1 }],
      })

    render(
      <ThemeProvider>
        <LeaderboardPage />
      </ThemeProvider>
    )

    await userEvent.click(screen.getByRole('button', { name: 'to-projects' }))

    await waitFor(() => expect(screen.getByTestId('projects-error')).toBeInTheDocument())
    // Internal connection details must not leak into the UI.
    expect(screen.getByTestId('projects-error').textContent ?? '').not.toMatch(/postgres|secret/)

    await userEvent.click(screen.getByRole('button', { name: 'retry-projects' }))

    await waitFor(() =>
      expect(Number(screen.getByTestId('projects-table').getAttribute('data-rows'))).toBe(1)
    )
    expect(screen.queryByTestId('projects-error')).not.toBeInTheDocument()
  })
})
