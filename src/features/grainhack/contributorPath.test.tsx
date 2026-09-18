import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { renderWithProviders } from '../../test/renderWithProviders'
import { Dashboard } from '../dashboard/Dashboard'
import { ApiError } from '../../shared/api/apiError'

// Every navigation a contributor can make from the GrainHack event page, walked
// through the real Dashboard, event pages, IssueDetailPage, IssuesTab and
// ApplyToIssuePanel. Only the network is faked, and it is faked as production
// actually answered on 2026-09-18: GET /projects/:id for the sandbox repo is a
// 404 project_not_accessible for every caller, and the viewer owns nothing.
//
// Three links today each resolved to a view the viewer could not use, and each
// was patched where it was reported. This walks the whole surface instead.

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location-spy">{location.search}</div>
}

const HACKATHON_ID = 'e11e77b0-8d8d-40c5-a8dd-b525a491374b'
const PROJECT_ID = '690c3ea8-e843-4698-98d6-ecd4b7542b1f'
const REPO = 'Jagadeeshftw/grainhack-sandbox'
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

const ISSUES = [
  {
    id: '4943d183-c4cd-4d0b-8864-05df2999e972',
    number: 1,
    githubIssueId: 5495003205,
    title: 'Fix the flaky retry loop in the sandbox worker',
    tier: 'easy',
    criteria: 'The retry loop backs off exponentially and stops after 5 attempts, with a test proving it.',
    opens: hoursFromNow(-11),
    closes: hoursFromNow(12),
  },
  {
    id: '3141fa6a-d885-468e-959f-35bcaf35662c',
    number: 2,
    githubIssueId: 5499706592,
    title: 'Validate --concurrency instead of silently starting zero workers',
    tier: 'standard',
    criteria: 'A zero or negative --concurrency is rejected at flag-parse time, before the worker pool is constructed, with an error naming the flag and the accepted range.',
    opens: hoursFromNow(-1),
    closes: hoursFromNow(23),
  },
]

const api = vi.hoisted(() => ({
  getHackathons: vi.fn(),
  getHackathon: vi.fn(),
  getHackathonIssues: vi.fn(),
  getPublicProject: vi.fn(),
  getMyProjects: vi.fn(),
  getProjectIssues: vi.fn(),
  getContributorHackathonIssue: vi.fn(),
}))

vi.mock('../../shared/api/client', () => ({
  ...api,
  bootstrapAdmin: vi.fn(),
  getNotificationCount: vi.fn().mockResolvedValue({ count: 0 }),
  applyToHackathonIssue: vi.fn(),
  applyToIssue: vi.fn(),
  postBotComment: vi.fn(),
  withdrawApplication: vi.fn(),
  assignApplicant: vi.fn(),
  unassignApplicant: vi.fn(),
  rejectApplication: vi.fn(),
}))

// Pages this walk never reaches. Stubbed so their own fetches stay out of it.
vi.mock('../dashboard/pages/DiscoverPage', () => ({ DiscoverPage: () => <div data-testid="discover-page" /> }))
vi.mock('../dashboard/pages/BrowsePage', () => ({ BrowsePage: () => <div data-testid="browse-page" /> }))
vi.mock('../dashboard/pages/SearchPage', () => ({ SearchPage: () => <div data-testid="search-page" /> }))
vi.mock('../dashboard/pages/DataPage', () => ({ DataPage: () => <div data-testid="data-page" /> }))
vi.mock('../../shared/components/UserProfileDropdown', () => ({ UserProfileDropdown: () => null }))

vi.mock('../../shared/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    userRole: 'contributor',
    userId: 'user-arisu',
    user: { id: 'user-arisu', github: { login: 'arisu6804' } },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

function apiIssue(i: (typeof ISSUES)[number]) {
  return {
    github_issue_id: i.githubIssueId,
    number: i.number,
    state: 'open',
    title: i.title,
    description: null,
    author_login: 'Jagadeeshftw',
    assignees: [],
    labels: [{ name: 'GrainHack' }],
    comments_count: 0,
    comments: [],
    url: `https://github.com/${REPO}/issues/${i.number}`,
    updated_at: '2026-09-18T12:46:06Z',
    last_seen_at: '2026-09-18T13:59:18Z',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem('grainlify_tour_seen_user-arisu', 'true')
  window.history.pushState({}, '', '/dashboard?tab=osw')

  api.getHackathons.mockResolvedValue({
    hackathons: [{ id: HACKATHON_ID, name: 'First GrainHack Event (Base Sepolia)', phase: 'live', contributor_prize_pool: '8.000000' }],
  })
  api.getHackathon.mockResolvedValue({ id: HACKATHON_ID, name: 'First GrainHack Event (Base Sepolia)', phase: 'live', contributor_prize_pool: '8.000000' })
  api.getHackathonIssues.mockResolvedValue({
    issues: ISSUES.map((i) => ({
      id: i.id,
      project_id: PROJECT_ID,
      repo_full_name: REPO,
      issue_number: i.number,
      issue_title: i.title,
      difficulty_tier: i.tier,
      acceptance_criteria: i.criteria,
      reserved: false,
      application_window_opens_at: i.opens,
      application_window_closes_at: i.closes,
    })),
  })
  // As production answers it, to everyone.
  api.getPublicProject.mockRejectedValue(new ApiError('project_not_accessible', 404, { error: 'project_not_accessible' }))
  api.getMyProjects.mockResolvedValue([])
  api.getProjectIssues.mockResolvedValue({ issues: ISSUES.map(apiIssue) })
  api.getContributorHackathonIssue.mockImplementation(async (_projectId: string, n: number) => {
    const i = ISSUES.find((x) => x.number === n)!
    return {
      issue: {
        id: i.id,
        hackathon_id: HACKATHON_ID,
        hackathon_name: 'First GrainHack Event (Base Sepolia)',
        project_id: PROJECT_ID,
        issue_number: i.number,
        status: 'published',
        acceptance_criteria: i.criteria,
        difficulty_tier: i.tier,
        primary_language: 'Go',
        reserved: false,
        application_window_opens_at: i.opens,
        application_window_closes_at: i.closes,
      },
      applicant_count: null,
      applicant_bucket: '',
      my_application: null,
    }
  })
})

const search = () => new URLSearchParams(screen.getByTestId('location-spy').textContent || '')

async function openEvent(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByText('First GrainHack Event (Base Sepolia)'))
  return screen.findAllByRole('button', { name: 'View issue' })
}

describe('contributor path from the GrainHack event page', () => {
  for (const issue of ISSUES) {
    it(`event → issue #${issue.number} → apply panel with countdown and acceptance criteria → back to the event`, async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <>
          <Dashboard />
          <LocationSpy />
        </>,
      )

      const viewButtons = await openEvent(user)
      await user.click(viewButtons[issue.number - 1])

      // The apply panel, fully populated.
      const panel = (await screen.findByText('Part of First GrainHack Event (Base Sepolia)')).closest('div.rounded-\\[16px\\]') as HTMLElement
      expect(panel).toBeTruthy()
      expect(within(panel).getByText(issue.criteria)).toBeInTheDocument()
      expect(within(panel).getByText(/left to apply/)).toBeInTheDocument()
      expect(within(panel).getByRole('button', { name: /apply/i })).toBeEnabled()
      // Only the draw's button. The generic one posts a GitHub comment and does
      // not enter the draw.
      expect(screen.getAllByRole('button', { name: 'Apply for this issue' })).toHaveLength(1)
      // The right issue is open, not merely the first one in the list.
      expect(screen.getByRole('heading', { level: 1, name: issue.title })).toBeInTheDocument()
      // The project lookup 404s for everybody; the page must not depend on it.
      expect(screen.queryByText('No issues found')).not.toBeInTheDocument()

      // The link a contributor is handed carries the issue and its project,
      // and nothing about anyone's view.
      await waitFor(() => {
        expect(search().get('issue')).toBe(String(issue.number))
        expect(search().get('iproject')).toBe(PROJECT_ID)
      })
      expect(search().has('view')).toBe(false)

      // Back returns to the event, not to an empty page.
      await user.click(screen.getByRole('button', { name: 'Back' }))
      expect(await screen.findAllByRole('button', { name: 'View issue' })).toHaveLength(2)
      expect(search().has('issue')).toBe(false)
    })
  }

  it('"All events" returns to the events list', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <Dashboard />
        <LocationSpy />
      </>,
    )
    await openEvent(user)
    await user.click(screen.getByRole('button', { name: /all events/i }))
    expect(await screen.findByText('First GrainHack Event (Base Sepolia)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View issue' })).not.toBeInTheDocument()
  })

  it('a cold load of the issue link lands on the apply panel', async () => {
    // Both locations: Dashboard's initialisers read window.location and its
    // reader effect reads the router's, which only coincide under BrowserRouter.
    window.history.pushState({}, '', `/dashboard?tab=osw&issue=1&iproject=${PROJECT_ID}`)
    renderWithProviders(<Dashboard />, { route: `/dashboard?tab=osw&issue=1&iproject=${PROJECT_ID}` })

    expect(await screen.findByText(ISSUES[0].criteria)).toBeInTheDocument()
    expect(screen.getByText(/left to apply/)).toBeInTheDocument()
  })

  it('a link that arrives carrying ?view=maintainer still shows a non-owner the apply panel', async () => {
    // The reported URL shape. view= is the viewer's own mode, and ownership is
    // what gates maintainer controls, so a non-owner still gets the apply
    // panel rather than an owner-only view.
    // Both locations: Dashboard's initialisers read window.location and its
    // reader effect reads the router's, which only coincide under BrowserRouter.
    window.history.pushState({}, '', `/dashboard?tab=osw&view=maintainer&issue=2&iproject=${PROJECT_ID}`)
    renderWithProviders(<Dashboard />, { route: `/dashboard?tab=osw&view=maintainer&issue=2&iproject=${PROJECT_ID}` })

    const criteria = await screen.findByText(ISSUES[1].criteria)
    const panel = criteria.closest('div.rounded-\\[16px\\]') as HTMLElement
    expect(within(panel).getByRole('button', { name: /apply/i })).toBeEnabled()
  })
})
