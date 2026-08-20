import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { Link, useLocation } from 'react-router-dom'
import { renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import { Dashboard } from './Dashboard'

/** A3 — "Go to the issue" on a New application notification.
 *
 *  The stored link_path is correct. Production holds
 *    /dashboard?tab=maintainers&view=maintainer&project=<uuid>&issue=<id>
 *  which is exactly what notifications.MaintainerApplicationLink builds, and it
 *  names both the project and the issue.
 *
 *  These two tests separate the three possible causes the report could have
 *  had: wrong data, a route that cannot express the issue, or a route that
 *  resolves and is then overridden. Cold load and in-app click differ, which
 *  identifies which one it is.
 */

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }))
vi.mock('../../shared/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: mockUseAuth,
}))
vi.mock('./pages/DiscoverPage', () => ({ DiscoverPage: () => <div data-testid="discover-page" /> }))
vi.mock('./pages/BrowsePage', () => ({ BrowsePage: () => <div data-testid="browse-page" /> }))
vi.mock('./pages/SearchPage', () => ({ SearchPage: () => <div data-testid="search-page" /> }))
vi.mock('./pages/DataPage', () => ({ DataPage: () => <div data-testid="data-page" /> }))
vi.mock('./pages/IssueDetailPage', () => ({ IssueDetailPage: () => <div data-testid="issue-detail-page" /> }))
vi.mock('../maintainers/pages/MaintainersPage', () => ({ MaintainersPage: () => <div data-testid="maintainers-page" /> }))
vi.mock('./pages/ProjectDetailPage', () => ({ ProjectDetailPage: () => <div data-testid="project-detail-page" /> }))
vi.mock('./pages/ContributorsPage', () => ({ ContributorsPage: () => <div data-testid="contributors-page" /> }))
vi.mock('../settings/pages/SettingsPage', () => ({ SettingsPage: () => <div data-testid="settings-page" /> }))

const { mockGetNotifications, mockGetCount } = vi.hoisted(() => ({
  mockGetNotifications: vi.fn(), mockGetCount: vi.fn(),
}))
vi.mock('../../shared/api/client', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  getNotifications: (...a: unknown[]) => mockGetNotifications(...a),
  getNotificationCount: (...a: unknown[]) => mockGetCount(...a),
  markNotificationRead: vi.fn(() => Promise.resolve({ ok: true })),
  markAllNotificationsRead: vi.fn(() => Promise.resolve({ ok: true })),
}))

const ISSUE_LINK =
  '/dashboard?tab=maintainers&view=maintainer&project=ef89eaf0-c4ba-4a18-8384-27a9b87c8964&issue=5012274583'

function Spy() {
  const l = useLocation()
  return <div data-testid="loc">{l.search}</div>
}

describe('A3: following a New-application notification to the issue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', login: 'someone' }, userId: 'u1', userRole: 'maintainer',
      login: vi.fn(), logout: vi.fn(), isAuthenticated: true,
    })
    mockGetCount.mockResolvedValue({ count: 0 })
    mockGetNotifications.mockResolvedValue({ notifications: [] })
  })

  // Cold load: the useState initialisers read window.location.search once, at
  // mount, so this is the path that works.
  //
  // window.location must be set explicitly. MemoryRouter's initialEntries drive
  // react-router only - they do not touch window.location - and every one of
  // Dashboard's initialisers reads window.location.search directly. Without
  // this the test renders as if the URL were "/", which is a property of the
  // harness and not of the app.
  it('opens the issue on a COLD load of the stored link', async () => {
    window.history.replaceState(null, '', ISSUE_LINK)
    renderWithProviders(<Dashboard />, { route: ISSUE_LINK })
    expect(await screen.findByTestId('issue-detail-page')).toBeInTheDocument()
  })

  // In-app click: Dashboard never unmounts, so nothing re-reads project/issue.
  // This is how the notification is actually followed - the bell and the
  // notifications page both live inside the dashboard.
  it('opens the issue when the SAME link is clicked from inside the dashboard', async () => {
    window.history.replaceState(null, '', '/dashboard?tab=discover')
    renderWithProviders(
      <><Link to={ISSUE_LINK}>Go to the issue</Link><Dashboard /><Spy /></>,
      { route: '/dashboard?tab=discover' }
    )
    await screen.findByTestId('discover-page')
    await userEvent.click(screen.getByRole('link', { name: 'Go to the issue' }))

    await waitFor(() => expect(screen.getByTestId('loc').textContent).toContain('tab=maintainers'))
    expect(await screen.findByTestId('issue-detail-page')).toBeInTheDocument()
  })
})

/** Every distinct link shape in production, followed from inside the dashboard.
 *
 *  Not "does the path parse" and not "does the route exist" - what renders
 *  after the click. Verifying a destination is not verifying the journey, and
 *  these two answers have already differed once.
 *
 *  Shapes taken from the live table (190 rows, 8 types, 6 distinct shapes).
 */
const SHAPES: Array<{ type: string; path: string; expect: string }> = [
  { type: 'founding_position',          path: '/dashboard?tab=settings&subtab=rewards',   expect: 'settings-page' },
  { type: 'social_follow_completed',    path: '/dashboard?tab=settings&subtab=rewards',   expect: 'settings-page' },
  { type: 'referral_completed',         path: '/dashboard?tab=settings&subtab=referrals', expect: 'settings-page' },
  { type: 'kyc_reset',                  path: '/dashboard?tab=settings&subtab=billing',   expect: 'settings-page' },
  { type: 'issue_application_received', path: '/dashboard?tab=contributors',              expect: 'contributors-page' },
  { type: 'pr_merged',                  path: '/dashboard?tab=browse&project=004aa4d0-d9ff-4a43-b17a-cdc57737acfb', expect: 'project-detail-page' },
  { type: 'issue_assigned',             path: '/dashboard?tab=browse&project=7d6d84fe-9ea2-4771-a631-a0775a3e06c8&issue=4887108580', expect: 'issue-detail-page' },
  { type: 'issue_application_submitted', path: ISSUE_LINK,                                expect: 'issue-detail-page' },
]

describe('every notification link, followed from inside the dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', login: 'someone' }, userId: 'u1', userRole: 'maintainer',
      login: vi.fn(), logout: vi.fn(), isAuthenticated: true,
    })
    mockGetCount.mockResolvedValue({ count: 0 })
    mockGetNotifications.mockResolvedValue({ notifications: [] })
  })

  it.each(SHAPES)('$type -> $expect', async ({ path, expect: want }) => {
    window.history.replaceState(null, '', '/dashboard?tab=discover')
    renderWithProviders(
      <><Link to={path}>follow</Link><Dashboard /></>,
      { route: '/dashboard?tab=discover' }
    )
    await screen.findByTestId('discover-page')
    await userEvent.click(screen.getByRole('link', { name: 'follow' }))
    await new Promise((r) => setTimeout(r, 250))
    const got = Array.from(document.querySelectorAll('[data-testid]'))
      .map((e) => e.getAttribute('data-testid'))
      .filter((t) => t && t.endsWith('-page'))
    console.log(`    ${want.padEnd(21)} <- rendered: ${JSON.stringify(got)}`)
    expect(got).toContain(want)
  })
})

describe('the reader and the writer settle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', login: 'someone' }, userId: 'u1', userRole: 'maintainer',
      login: vi.fn(), logout: vi.fn(), isAuthenticated: true,
    })
    mockGetCount.mockResolvedValue({ count: 0 })
    mockGetNotifications.mockResolvedValue({ notifications: [] })
  })

  /** Absence has to CLEAR, or a pr_merged link followed while an issue is open
   *  leaves the issue on screen and answers the wrong question. This is the
   *  behaviour the echo check exists to make safe - without it, the writer's
   *  own output reads as a navigation and clears state mid-write. */
  it('closes an open issue when the next link carries no issue', async () => {
    window.history.replaceState(null, '', '/dashboard?tab=discover')
    renderWithProviders(
      <>
        <Link to={ISSUE_LINK}>to issue</Link>
        <Link to="/dashboard?tab=browse&project=004aa4d0-d9ff-4a43-b17a-cdc57737acfb">to project</Link>
        <Dashboard />
      </>,
      { route: '/dashboard?tab=discover' }
    )
    await screen.findByTestId('discover-page')

    await userEvent.click(screen.getByRole('link', { name: 'to issue' }))
    expect(await screen.findByTestId('issue-detail-page')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: 'to project' }))
    expect(await screen.findByTestId('project-detail-page')).toBeInTheDocument()
    expect(screen.queryByTestId('issue-detail-page')).not.toBeInTheDocument()
  })

  /** The URL must survive its own writer. Following a link and then letting
   *  the writer run has to leave the parameters intact rather than stripping
   *  them back out, which is the original defect. */
  it('leaves the parameters in the URL after following a link', async () => {
    window.history.replaceState(null, '', '/dashboard?tab=discover')
    renderWithProviders(
      <><Link to={ISSUE_LINK}>follow</Link><Dashboard /><Spy /></>,
      { route: '/dashboard?tab=discover' }
    )
    await screen.findByTestId('discover-page')
    await userEvent.click(screen.getByRole('link', { name: 'follow' }))
    await screen.findByTestId('issue-detail-page')

    // Settled, not mid-flight: give the writer every chance to strip them.
    await new Promise((r) => setTimeout(r, 400))
    const search = screen.getByTestId('loc').textContent || ''
    expect(search).toContain('issue=5012274583')
    expect(search).toContain('project=ef89eaf0-c4ba-4a18-8384-27a9b87c8964')
    expect(search).toContain('view=maintainer')
  })
})

/** Kept from an attempt to prove an echo check was needed. It was not - the
 *  reader and writer converge structurally - but these are the two hardest
 *  cases for that convergence, so they stay as regression cover. */
describe('the reader and the writer converge under pressure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', login: 'someone' }, userId: 'u1', userRole: 'maintainer',
      login: vi.fn(), logout: vi.fn(), isAuthenticated: true,
    })
    mockGetCount.mockResolvedValue({ count: 0 })
    mockGetNotifications.mockResolvedValue({ notifications: [] })
  })

  // Two navigations back to back, without waiting for the first to settle -
  // the widest stale-state window the writer can see.
  it('survives two navigations in quick succession', async () => {
    window.history.replaceState(null, '', '/dashboard?tab=discover')
    renderWithProviders(
      <>
        <Link to="/dashboard?tab=browse&project=004aa4d0-d9ff-4a43-b17a-cdc57737acfb">A</Link>
        <Link to={ISSUE_LINK}>B</Link>
        <Dashboard /><Spy />
      </>,
      { route: '/dashboard?tab=discover' }
    )
    await screen.findByTestId('discover-page')
    const user = userEvent.setup({ delay: null })
    await Promise.all([
      user.click(screen.getByRole('link', { name: 'A' })),
      user.click(screen.getByRole('link', { name: 'B' })),
    ])
    await new Promise((r) => setTimeout(r, 500))
    const search = screen.getByTestId('loc').textContent || ''
    console.log('    final search:', search)
    expect(search).toContain('issue=5012274583')
  })

  // A parameter the writer only emits alongside another one.
  it('keeps ?from= through the writer', async () => {
    window.history.replaceState(null, '', '/dashboard?tab=discover')
    renderWithProviders(
      <>
        <Link to="/dashboard?tab=browse&project=004aa4d0-d9ff-4a43-b17a-cdc57737acfb&from=leaderboard">go</Link>
        <Dashboard /><Spy />
      </>,
      { route: '/dashboard?tab=discover' }
    )
    await screen.findByTestId('discover-page')
    await userEvent.click(screen.getByRole('link', { name: 'go' }))
    await new Promise((r) => setTimeout(r, 500))
    const search = screen.getByTestId('loc').textContent || ''
    console.log('    final search:', search)
    expect(search).toContain('from=leaderboard')
  })
})

/** ?view= is why MaintainerApplicationLink carries it: a maintainer following
 *  their own "new application" notification has to land on the surface where
 *  Reject and Assign live, not the contributor view of the same issue.
 *
 *  This needs its own test because the issue overlay renders ABOVE the role
 *  gating - so every assertion about the issue opening passes whether or not
 *  the view synced. Mutation testing is what surfaced that: breaking the view
 *  sync left all eight link-shape tests green.
 */
describe('the maintainer view follows the link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', login: 'someone' }, userId: 'u1', userRole: 'maintainer',
      login: vi.fn(), logout: vi.fn(), isAuthenticated: true,
    })
    mockGetCount.mockResolvedValue({ count: 0 })
    mockGetNotifications.mockResolvedValue({ notifications: [] })
  })

  it('lands in the maintainer view, not on the switch-role interruption', async () => {
    window.history.replaceState(null, '', '/dashboard?tab=discover')
    renderWithProviders(
      <><Link to="/dashboard?tab=maintainers&view=maintainer">go</Link><Dashboard /></>,
      { route: '/dashboard?tab=discover' }
    )
    await screen.findByTestId('discover-page')
    await userEvent.click(screen.getByRole('link', { name: 'go' }))

    expect(await screen.findByTestId('maintainers-page')).toBeInTheDocument()
    // The takeover screen from the role switcher must not be what they get.
    expect(document.body.textContent).not.toMatch(/viewing as a contributor/i)
  })
})
