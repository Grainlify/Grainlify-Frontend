import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { DiscoverPage } from './DiscoverPage'
import { ApiError } from '../../../shared/api/apiError'
import { getRecommendedProjects, getPublicProjectIssues, getUserProfile } from '../../../shared/api/client'

// DiscoverPage fetches recommended projects (getRecommendedProjects) and, once those
// resolve, recommended issues sourced from those projects (getPublicProjectIssues) —
// both via useOptimisticData. It also fetches getUserProfile for the hero's setup-nudge
// (billing profile comes from localStorage instead, see loadProfilesFromStorage - real
// code, not mocked, since jsdom's localStorage is enough on its own). Mock only what
// DiscoverPage itself imports from the client; IssueDetailPage/ProjectDetailPage are
// imported for DiscoverPage's own internal selectedIssue/selectedProjectId overlay
// ProjectDetailPage backs DiscoverPage's remaining project overlay. IssueDetailPage
// is no longer rendered by this page at all - issue selection was lifted to Dashboard
// so there is a single shared detail view - but the stub stays so the test asserting
// this page does NOT render one has something that would have been visible if it did.
// getAuthToken/setAuthToken/removeAuthToken/getCurrentUser back AuthProvider
// (withAuth: true below, needed since the hero greets the user by github
// login/avatar via useAuth() — confirmed by reading AuthContext.tsx's full set of
// client imports). getAuthToken must explicitly resolve to null: with no token,
// checkAuth()'s `if (token)` branch is never entered, so getCurrentUser() itself
// is never actually called in these tests.
vi.mock('../../../shared/api/client', () => ({
  getRecommendedProjects: vi.fn(),
  getPublicProjectIssues: vi.fn(),
  getUserProfile: vi.fn(),
  getAuthToken: vi.fn(() => null),
  setAuthToken: vi.fn(),
  removeAuthToken: vi.fn(),
  getCurrentUser: vi.fn(),
}))

// Regression coverage below for URL-persisting DiscoverPage's own overlay
// (?dIssue=/?dProject=) needs these two mounted - stub them so the tests
// stay focused on DiscoverPage's own logic instead of also covering their
// unrelated data-fetching.
vi.mock('./IssueDetailPage', () => ({
  IssueDetailPage: (props: any) => (
    <div data-testid="issue-detail-page" data-issue-id={props.issueId} data-project-id={props.projectId}>
      <button onClick={props.onClose}>Close issue</button>
    </div>
  ),
}))
vi.mock('./ProjectDetailPage', () => ({
  ProjectDetailPage: (props: any) => (
    <div data-testid="project-detail-page" data-project-id={props.projectId}>
      <button onClick={props.onClose}>Close project</button>
    </div>
  ),
}))

const mockedGetRecommendedProjects = vi.mocked(getRecommendedProjects)
const mockedGetPublicProjectIssues = vi.mocked(getPublicProjectIssues)
const mockedGetUserProfile = vi.mocked(getUserProfile)

type RecommendedProjectsResponse = Awaited<ReturnType<typeof getRecommendedProjects>>
type ApiProject = RecommendedProjectsResponse['projects'][number]

type IssuesResponse = Awaited<ReturnType<typeof getPublicProjectIssues>>
type ApiIssue = IssuesResponse['issues'][number]

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

function makeApiIssue(
  overrides: Partial<ApiIssue> & Pick<ApiIssue, 'github_issue_id' | 'title'>,
): ApiIssue {
  return {
    number: overrides.github_issue_id,
    state: 'open',
    description: null,
    author_login: 'octocat',
    labels: [],
    url: 'https://github.com/example/example/issues/1',
    updated_at: null,
    last_seen_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// projectA's github_full_name is "acme/widget-kit" - DiscoverPage cards are
// grouped by org (the part before the slash), one card per org, so the card
// displays "acme" (not "widget-kit") and derives its icon/stars/forks/tags/
// ecosystem_name from whichever repo of that org is encountered first.
const projectA = makeApiProject({
  id: 'proj-a',
  github_full_name: 'acme/widget-kit',
  description: 'A great widget kit for building things',
  stars_count: 1234,
  forks_count: 56,
  open_issues_count: 3,
  tags: ['TypeScript', 'CLI'],
  ecosystem_name: 'Ecosystem Alpha',
})

// Second repo under the SAME org as projectA - exercises the one-card-per-org
// grouping (getRecommendedProjects is already sorted by contributors_count,
// so projectA being listed first means it's the one whose fields "win").
const projectAA = makeApiProject({
  id: 'proj-aa',
  github_full_name: 'acme/other-repo',
  description: 'A second acme repo',
  stars_count: 10,
})

const projectB = makeApiProject({
  id: 'proj-b',
  github_full_name: 'globex/data-tool',
  description: 'A data processing tool',
  stars_count: 42,
  forks_count: 7,
  open_issues_count: 1,
  tags: ['Python'],
})

const projectC = makeApiProject({
  id: 'proj-c',
  github_full_name: 'initech/reportgen',
  description: 'A report generator',
  stars_count: 7,
})

describe('DiscoverPage', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.resetAllMocks()
    // Fresh-user default (nothing set up yet) — matches most scenarios below, which
    // aren't testing the setup nudge itself. The "fires onGoToBilling..." test relies
    // on this to get the "Continue setup" (not "Verify KYC") button label.
    mockedGetUserProfile.mockResolvedValue({
      contributions_count: 0,
      projects_contributed_to_count: 0,
      projects_led_count: 0,
      rewards_count: 0,
      languages: [],
      ecosystems: [],
      kyc_verified: false,
      rank: { position: null, tier: 'unranked', tier_name: 'Unranked', tier_color: '#000' },
    })
    // The org-card click now does a real window.location.href navigation -
    // jsdom's real setter throws "Not implemented: navigation", so replace
    // it with an inert stand-in, matching RewardsTab.test.tsx's pattern.
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    })
  })

  it('shows the loading skeleton, then real project and issue content once fetches resolve', async () => {
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [projectA, projectB] })
    mockedGetPublicProjectIssues.mockImplementation(async (projectId: string) => {
      if (projectId === 'proj-a') {
        return {
          issues: [
            makeApiIssue({
              github_issue_id: 101,
              title: 'Fix crash on startup',
              description: 'Steps to reproduce the crash',
              labels: ['bug'],
            }),
            makeApiIssue({
              github_issue_id: 102,
              title: 'Add dark mode toggle',
              description: 'Nice to have setting',
              labels: ['enhancement'],
            }),
          ],
        }
      }
      return {
        issues: [
          makeApiIssue({
            github_issue_id: 201,
            title: 'Improve documentation',
            description: 'Docs are outdated',
            labels: [{ name: 'good first issue' }],
          }),
        ],
      }
    })

    const { container } = renderWithProviders(<DiscoverPage />, { withAuth: true })

    // Loading skeletons render before the fetches resolve.
    expect(screen.getByText(/Finding the most active projects/i)).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText('acme')).toBeInTheDocument()
    })
    expect(screen.getByText('globex')).toBeInTheDocument()
    expect(screen.getByText('Ecosystem Alpha')).toBeInTheDocument()
    expect(screen.getByText('1.2K')).toBeInTheDocument()
    expect(screen.getByText('Recommended Projects (2)')).toBeInTheDocument()
    expect(mockedGetRecommendedProjects).toHaveBeenCalledWith(50)

    await waitFor(() => {
      expect(screen.getByText('Fix crash on startup')).toBeInTheDocument()
    })
    expect(screen.getByText('Add dark mode toggle')).toBeInTheDocument()
    expect(screen.getByText('Improve documentation')).toBeInTheDocument()

    // Both skeleton grids are gone once real content is in.
    expect(container.querySelectorAll('.animate-shimmer').length).toBe(0)
  })

  it('resolves the issues section instead of hanging when there are zero recommended projects', async () => {
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [] })

    renderWithProviders(<DiscoverPage />, { withAuth: true })

    await waitFor(() => {
      expect(screen.getByText('No recommended projects found')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByText('No recommended issues found')).toBeInTheDocument()
    })

    // Regression coverage: an empty projects list must not leave the issues section
    // waiting on a projects-first fetch that never actually gets triggered.
    expect(mockedGetPublicProjectIssues).not.toHaveBeenCalled()
  })

  // Rewritten: this used to assert the page settled on "No recommended
  // projects found" / "No recommended issues found" after a rejected fetch -
  // the skeletons cleared, but into an empty state indistinguishable from a
  // real absence of projects.
  it('says projects and issues failed to load (not "No recommended ...") when the projects fetch rejects, and retries', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockedGetRecommendedProjects.mockRejectedValueOnce(
      new ApiError('internal_error', 500, { error: 'internal_error' }),
    )
    mockedGetRecommendedProjects.mockResolvedValueOnce({ projects: [projectA] })
    mockedGetPublicProjectIssues.mockResolvedValue({
      issues: [makeApiIssue({ github_issue_id: 101, title: 'Fix crash on startup' })],
    })

    const { container } = renderWithProviders(<DiscoverPage />, { withAuth: true })

    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0)

    expect(await screen.findByText("Couldn't load recommended projects")).toBeInTheDocument()
    expect(screen.getByText("Couldn't load recommended issues")).toBeInTheDocument()
    expect(screen.queryByText('No recommended projects found')).not.toBeInTheDocument()
    expect(screen.queryByText('No recommended issues found')).not.toBeInTheDocument()
    expect(screen.queryByText(/Finding the most active projects/i)).not.toBeInTheDocument()
    expect(container.querySelectorAll('.animate-shimmer').length).toBe(0)
    expect(mockedGetPublicProjectIssues).not.toHaveBeenCalled()

    await userEvent.setup().click(screen.getAllByRole('button', { name: /try again/i })[0])
    expect(await screen.findByText('acme')).toBeInTheDocument()
    expect(await screen.findByText('Fix crash on startup')).toBeInTheDocument()
    expect(screen.queryByText(/Couldn't load/)).not.toBeInTheDocument()

    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  it('says issues failed to load, not "No recommended issues found", when every per-project issue fetch fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [projectA, projectB] })
    mockedGetPublicProjectIssues.mockRejectedValue(
      new ApiError('project_not_accessible', 404, { error: 'project_not_accessible' }),
    )

    renderWithProviders(<DiscoverPage />, { withAuth: true })

    expect(await screen.findByText("Couldn't load recommended issues")).toBeInTheDocument()
    expect(screen.getByText(/project_not_accessible/)).toBeInTheDocument()
    expect(screen.queryByText('No recommended issues found')).not.toBeInTheDocument()
    // Projects loaded fine and still show.
    expect(screen.getByText('acme')).toBeInTheDocument()

    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  it('shows the issues that loaded plus a line naming the project whose issues failed', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [projectA, projectB] })
    mockedGetPublicProjectIssues.mockImplementation(async (projectId: string) => {
      if (projectId === 'proj-a') {
        return { issues: [makeApiIssue({ github_issue_id: 101, title: 'Fix crash on startup' })] }
      }
      throw new ApiError('internal_error', 500, { error: 'internal_error' })
    })

    renderWithProviders(<DiscoverPage />, { withAuth: true })

    expect(await screen.findByText('Fix crash on startup')).toBeInTheDocument()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Couldn't load issues from globex")

    consoleWarnSpy.mockRestore()
  })

  it('does not tell the user to verify KYC when their profile (and so KYC status) failed to load', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockedGetUserProfile.mockRejectedValue(
      new ApiError('internal_error', 500, { error: 'internal_error' }),
    )
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [] })

    renderWithProviders(<DiscoverPage />, { withAuth: true })

    await screen.findByText('No recommended projects found')
    await waitFor(() => expect(mockedGetUserProfile).toHaveBeenCalled())
    expect(screen.queryByText(/Verify KYC/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Finish setup/i)).not.toBeInTheDocument()

    consoleWarnSpy.mockRestore()
  })

  it('falls back to an initial-letter gradient avatar when the project image fails to load', async () => {
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [projectA] })
    mockedGetPublicProjectIssues.mockResolvedValue({ issues: [] })

    renderWithProviders(<DiscoverPage />, { withAuth: true })

    const avatarImg = await screen.findByAltText('acme')
    expect(avatarImg).toBeInTheDocument()

    fireEvent.error(avatarImg)

    await waitFor(() => {
      expect(screen.queryByAltText('acme')).not.toBeInTheDocument()
    })
    // Initial-letter fallback: first character of the org name, uppercased, on a
    // getOnBrandGradient-colored chip (DiscoverProjectCard.tsx).
    expect(screen.getByText('A')).toBeInTheDocument()

    // Let the background issues fetch settle so no state update lands after the test.
    await waitFor(() => {
      expect(screen.getByText('No recommended issues found')).toBeInTheDocument()
    })
  })

  it('renders in both light and dark theme without crashing', async () => {
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [] })

    const { unmount } = renderWithProviders(<DiscoverPage />, { theme: 'light', withAuth: true })
    expect(screen.getByText(/Here's what's most active today/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('No recommended projects found')).toBeInTheDocument()
    })
    unmount()

    renderWithProviders(<DiscoverPage />, { theme: 'dark', withAuth: true })
    expect(screen.getByText(/Here's what's most active today/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('No recommended projects found')).toBeInTheDocument()
    })
  })

  it('shows one card per org, not one per repo, when an org has multiple recommended repos', async () => {
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [projectA, projectAA, projectB] })
    mockedGetPublicProjectIssues.mockResolvedValue({ issues: [] })

    renderWithProviders(<DiscoverPage />, { withAuth: true })

    await waitFor(() => expect(screen.getByText('Recommended Projects (2)')).toBeInTheDocument())
    expect(screen.getByText('acme')).toBeInTheDocument()
    expect(screen.getByText('globex')).toBeInTheDocument()
    // The org card uses projectA's own fields (it's listed first) - confirms
    // projectAA didn't silently overwrite or duplicate it.
    expect(screen.getByText('A great widget kit for building things')).toBeInTheDocument()
    expect(screen.queryByText('A second acme repo')).not.toBeInTheDocument()
  })

  it('hides the Show more issues button when there are no recommended issues', async () => {
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [] })

    renderWithProviders(<DiscoverPage />, { withAuth: true })
    await waitFor(() => expect(screen.getByText('No recommended projects found')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Show more issues/i })).not.toBeInTheDocument()
  })

  // Regression coverage: this control used to navigate to
  // MaintainersPage's Issues tab (see Dashboard.tsx's old onViewAllIssues
  // wiring) - a contributor who doesn't own any repos landed on an
  // owner-only "Add a repository" empty state, losing the personalized
  // issues they came from. It must instead expand this same list in place.
  it('expands the recommended issues list in place when "Show more issues" is clicked, instead of navigating away', async () => {
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [projectA, projectB, projectC] })
    // github_issue_id must be unique ACROSS projects here, not just within
    // one - it becomes the React key for every rendered IssueCard
    // (issue.id = String(github_issue_id)), and real GitHub issue ids are
    // globally unique, unlike per-repo issue *numbers*. A per-project
    // offset avoids colliding keys silently dropping/misrendering cards.
    const projectOffsets: Record<string, number> = { 'proj-a': 100, 'proj-b': 200, 'proj-c': 300 }
    mockedGetPublicProjectIssues.mockImplementation(async (projectId: string) => ({
      issues: Array.from({ length: 5 }, (_, i) =>
        makeApiIssue({ github_issue_id: projectOffsets[projectId] + i + 1, title: `${projectId} issue ${i + 1}` }),
      ),
      total: 5,
    }))
    const user = userEvent.setup()

    renderWithProviders(<DiscoverPage />, { withAuth: true })

    // Default view: capped at 2 issues/project x 3 projects = 6.
    await waitFor(() => {
      expect(screen.getAllByText(/^(proj-a|proj-b|proj-c) issue \d$/)).toHaveLength(6)
    })

    await user.click(screen.getByRole('button', { name: /Show more issues/i }))

    // Expanded view: up to 5 issues/project x 3 projects = 15, well under
    // the higher cap - and the button disappears once fully expanded.
    await waitFor(() => {
      expect(screen.getAllByText(/^(proj-a|proj-b|proj-c) issue \d$/)).toHaveLength(15)
    })
    expect(screen.queryByRole('button', { name: /Show more issues/i })).not.toBeInTheDocument()
  })

  // Regression test for a real infinite-loop bug (found and fixed
  // 2026-08-09, same day the feature above was built): the issues-fetch
  // effect included `fetchIssues` in its own dependency array while also
  // calling it with forceRefresh=showAllIssues. useOptimisticData's
  // fetchData closes over its own `data` state, so its identity changes on
  // every successful fetch - once showAllIssues was true, every resolved
  // fetch recreated fetchIssues, which re-triggered this same effect,
  // which fetched again, forever. A plain waitFor-based assertion (like the
  // test above) does NOT catch this: waitFor stops polling the instant its
  // condition is met once, even while the effect keeps looping in the
  // background afterward - this test instead explicitly checks the call
  // count has stabilized, not just that the right content appeared once.
  it('does not keep re-fetching after "Show more issues" settles (no infinite loop)', async () => {
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [projectA, projectB, projectC] })
    const projectOffsets: Record<string, number> = { 'proj-a': 100, 'proj-b': 200, 'proj-c': 300 }
    mockedGetPublicProjectIssues.mockImplementation(async (projectId: string) => ({
      issues: Array.from({ length: 5 }, (_, i) =>
        makeApiIssue({ github_issue_id: projectOffsets[projectId] + i + 1, title: `${projectId} issue ${i + 1}` }),
      ),
      total: 5,
    }))
    const user = userEvent.setup()

    renderWithProviders(<DiscoverPage />, { withAuth: true })
    await waitFor(() => {
      expect(screen.getAllByText(/^(proj-a|proj-b|proj-c) issue \d$/)).toHaveLength(6)
    })

    await user.click(screen.getByRole('button', { name: /Show more issues/i }))
    await waitFor(() => {
      expect(screen.getAllByText(/^(proj-a|proj-b|proj-c) issue \d$/)).toHaveLength(15)
    })

    const callsRightAfterExpansion = mockedGetPublicProjectIssues.mock.calls.length
    expect(callsRightAfterExpansion).toBeGreaterThan(0)

    // Give any runaway effect a real window to keep firing in the
    // background. A healthy effect makes zero further calls once
    // showAllIssues/projects/isLoadingProjects have all stopped changing;
    // a looping one would keep incrementing this count indefinitely.
    await new Promise((resolve) => setTimeout(resolve, 300))

    expect(mockedGetPublicProjectIssues.mock.calls.length).toBe(callsRightAfterExpansion)
  })

  it('fires onGoToBilling and onGoToGrainHack when their call-to-action buttons are clicked', async () => {
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [] })
    const onGoToBilling = vi.fn()
    const onGoToGrainHack = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <DiscoverPage onGoToBilling={onGoToBilling} onGoToGrainHack={onGoToGrainHack} />,
      { withAuth: true },
    )

    await waitFor(() => {
      expect(screen.getByText('No recommended projects found')).toBeInTheDocument()
    })

    await user.click(await screen.findByRole('button', { name: /Continue setup/i }))
    expect(onGoToBilling).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /Let's go/i }))
    expect(onGoToGrainHack).toHaveBeenCalledTimes(1)
  })

  describe('overlay URL persistence', () => {
    // Rewritten, not deleted: the premise it asserted is gone on purpose.
    //
    // This page used to own a SECOND issue overlay behind ?dIssue=/?dProject=,
    // parallel to the one Dashboard drives from ?issue=/?project= for Browse,
    // Ecosystems, OSW, Search and Profile. The same issue opened from Discover
    // and from a repo page were different screens with different URLs, and only
    // one of them was the shared one.
    //
    // Discover now reports the click upward and Dashboard owns the selection,
    // so what needs asserting is that it does NOT open anything itself.
    // Shared links keep working. Anyone who copied a Discover issue URL before
    // the overlay moved has one in a chat somewhere; nothing server-side ever
    // generated them, so they cannot be found and fixed. Removing the read
    // without this turned a working shared link into a page that silently
    // opens nothing - worse than the inconsistency being fixed.
    it('translates a legacy ?dIssue= link into the shared selection', async () => {
      const onOpenIssue = vi.fn()
      mockedGetRecommendedProjects.mockResolvedValue({ projects: [] })

      renderWithProviders(<DiscoverPage onOpenIssue={onOpenIssue} />, {
        route: '/dashboard?tab=discover&dIssue=issue-1&dProject=proj-a',
        withAuth: true,
      })

      await waitFor(() =>
        expect(
          onOpenIssue,
          'a legacy ?dIssue= link opened nothing; those URLs are already shared and cannot be recalled',
        ).toHaveBeenCalledWith('issue-1', 'proj-a'),
      )
    })

    it('does not open its own issue overlay for ?dIssue= any more', async () => {
      mockedGetRecommendedProjects.mockResolvedValue({ projects: [] })

      // ?dIssue= alone, with no ?dProject=: this isolates issue selection.
      // The project overlay is still this page's own and still URL-backed, so
      // including ?dProject= here would open that instead and prove nothing
      // about issues.
      renderWithProviders(<DiscoverPage />, { route: '/dashboard?tab=discover&dIssue=issue-1', withAuth: true })

      // Wait for the page to settle, so an overlay would have rendered by now
      // if this page still owned one.
      await waitFor(() => expect(mockedGetRecommendedProjects).toHaveBeenCalled())
      expect(
        screen.queryByTestId('issue-detail-page'),
        'DiscoverPage rendered its own issue detail view; selection belongs to Dashboard so ' +
          'there is one detail screen and one URL for it',
      ).not.toBeInTheDocument()
    })

    it('opens the project overlay named by ?dProject= (with no ?dIssue=) after a reload', async () => {
      mockedGetRecommendedProjects.mockResolvedValue({ projects: [] })

      renderWithProviders(<DiscoverPage />, { route: '/dashboard?tab=discover&dProject=proj-b', withAuth: true })

      const overlay = await screen.findByTestId('project-detail-page')
      expect(overlay.getAttribute('data-project-id')).toBe('proj-b')
    })

  })

  describe('issue selection belongs to Dashboard', () => {
    // The property that actually moved. Removing this page's overlay is only
    // half of it: if the click still wrote ?dIssue= and nobody rendered it,
    // clicking an issue would do nothing at all. This asserts the click is
    // reported upward, which is what makes the shared detail view open.
    it('reports an issue click upward instead of opening its own view', async () => {
      const user = userEvent.setup()
      const onOpenIssue = vi.fn()

      mockedGetRecommendedProjects.mockResolvedValue({ projects: [projectA] })
      mockedGetPublicProjectIssues.mockResolvedValue({
        issues: [
          makeApiIssue({
            github_issue_id: 101,
            title: 'Fix crash on startup',
            description: 'Steps to reproduce the crash',
            labels: ['bug'],
          }),
        ],
      })

      renderWithProviders(<DiscoverPage onOpenIssue={onOpenIssue} />, { withAuth: true })

      await user.click(await screen.findByText('Fix crash on startup'))

      expect(
        onOpenIssue,
        'clicking a recommended issue did not report upward; Dashboard owns the selection, so ' +
          'without this the shared IssueDetailPage never opens and the click does nothing',
      ).toHaveBeenCalled()
      expect(screen.queryByTestId('issue-detail-page')).not.toBeInTheDocument()
    })
  })

  describe('org card navigation', () => {
    // Regression coverage: this card represents a whole org (one card per
    // owner, deduped from potentially many repos - see the "one card per
    // org" test above), but its click handler used to carry the single
    // underlying repo's project.id into ProjectDetailPage instead of
    // opening the org's own page - fixed to navigate to /dashboard?tab=org
    // instead, matching how Browse already shows all of an org's repos.
    it('clicking a recommended project card navigates to that org\'s page, not a single repo\'s ProjectDetailPage', async () => {
      mockedGetRecommendedProjects.mockResolvedValue({ projects: [projectA] })
      mockedGetPublicProjectIssues.mockResolvedValue({ issues: [] })
      const user = userEvent.setup()

      renderWithProviders(<DiscoverPage />, { withAuth: true })

      await user.click(await screen.findByText('acme'))

      expect(window.location.href).toBe('/dashboard?tab=org&org=acme')
      expect(screen.queryByTestId('project-detail-page')).not.toBeInTheDocument()
    })
  })
})
