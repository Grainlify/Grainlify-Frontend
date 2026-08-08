import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { ProjectDetailPage } from './ProjectDetailPage'
import { getPublicProject, getPublicProjectIssues, getPublicProjectPRs } from '../../../shared/api/client'

vi.mock('../../../shared/api/client', () => ({
  getPublicProject: vi.fn(),
  getPublicProjectIssues: vi.fn(),
  getPublicProjectPRs: vi.fn(),
}))

// NOTE: a blanket `new Proxy({}, { get: () => () => null })` mock (as one
// might reach for to stub out every icon at once) breaks under this repo's
// installed Vitest: vi.mock's manual-mock resolution duck-types the
// factory's return value by checking `typeof result.then === 'function'`,
// and a catch-all Proxy returns a function for `.then` too, so Vitest
// mistakes the module for a thenable, awaits it, and crashes. Stub the
// specific icons ProjectDetailPage actually imports instead.
vi.mock('lucide-react', () => ({
  ExternalLink: () => null,
  Copy: () => null,
  Circle: () => null,
  ArrowLeft: () => null,
  GitPullRequest: () => null,
  ChevronDown: () => null,
}))

vi.mock('react-markdown', () => ({
  // Real react-markdown parses the readme string into a component tree;
  // for these tests we only care that the raw content is handed through.
  default: ({ children }: any) => <div data-testid="markdown">{children}</div>,
}))

type PublicProject = Awaited<ReturnType<typeof getPublicProject>>
type PublicIssuesResponse = Awaited<ReturnType<typeof getPublicProjectIssues>>
type PublicPRsResponse = Awaited<ReturnType<typeof getPublicProjectPRs>>

function buildProject(overrides: Partial<PublicProject> = {}): PublicProject {
  return {
    id: 'proj-123',
    github_full_name: 'acme/widget',
    language: 'TypeScript',
    tags: ['web'],
    category: 'Tooling',
    stars_count: 42,
    forks_count: 5,
    contributors_count: 3,
    open_issues_count: 2,
    open_prs_count: 1,
    ecosystem_name: 'Acme Ecosystem',
    ecosystem_slug: 'acme-ecosystem',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-06-01T00:00:00.000Z',
    languages: [
      { name: 'TypeScript', percentage: 80 },
      { name: 'JavaScript', percentage: 20 },
    ],
    readme: '# Widget\n\nA great widget project.',
    repo: {
      full_name: 'acme/widget',
      html_url: 'https://github.com/acme/widget',
      homepage: 'https://widget.example.com',
      description: 'A widget for acme',
      open_issues_count: 2,
      owner_login: 'acme',
      owner_avatar_url: 'https://github.com/acme.png',
    },
    ...overrides,
  }
}

const mockIssues: PublicIssuesResponse = {
  issues: [
    {
      github_issue_id: 111,
      number: 1,
      state: 'open',
      title: 'Fix bug in parser',
      description: 'desc',
      author_login: 'alice',
      labels: [{ name: 'bug' }],
      url: 'https://github.com/acme/widget/issues/1',
      updated_at: '2024-06-01T00:00:00.000Z',
      last_seen_at: '2024-06-01T00:00:00.000Z',
    },
    {
      github_issue_id: 112,
      number: 2,
      state: 'open',
      title: 'Improve docs',
      description: null,
      author_login: 'bob',
      labels: [{ name: 'docs' }],
      url: 'https://github.com/acme/widget/issues/2',
      updated_at: '2024-06-02T00:00:00.000Z',
      last_seen_at: '2024-06-02T00:00:00.000Z',
    },
  ],
}

const mockPRs: PublicPRsResponse = {
  prs: [
    {
      github_pr_id: 222,
      number: 3,
      state: 'open',
      title: 'Add new feature',
      author_login: 'carol',
      url: 'https://github.com/acme/widget/pull/3',
      merged: false,
      created_at: '2024-06-03T00:00:00.000Z',
      updated_at: null,
      closed_at: null,
      merged_at: null,
      last_seen_at: '2024-06-03T00:00:00.000Z',
    },
  ],
}

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getPublicProject).mockResolvedValue(buildProject())
    vi.mocked(getPublicProjectIssues).mockResolvedValue(mockIssues)
    vi.mocked(getPublicProjectPRs).mockResolvedValue(mockPRs)
    // The component logs verbosely (including via console.error on the
    // deliberate silent-failure path) — keep test output clean.
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders project data fetched via the projectId prop', async () => {
    renderWithProviders(<ProjectDetailPage projectId="proj-123" />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'widget' })).toBeInTheDocument()
    })

    expect(screen.getByText('A widget for acme')).toBeInTheDocument()
    expect(getPublicProject).toHaveBeenCalledWith('proj-123')
    expect(getPublicProjectIssues).toHaveBeenCalledWith('proj-123')
    expect(getPublicProjectPRs).toHaveBeenCalledWith('proj-123')
  })

  it('shows a loading indicator synchronously before data resolves', () => {
    // Never-resolving promises keep the component in its initial isLoading
    // state deterministically, independent of microtask flush timing.
    vi.mocked(getPublicProject).mockReturnValue(new Promise<PublicProject>(() => {}))
    vi.mocked(getPublicProjectIssues).mockReturnValue(new Promise<PublicIssuesResponse>(() => {}))
    vi.mocked(getPublicProjectPRs).mockReturnValue(new Promise<PublicPRsResponse>(() => {}))

    const { container } = renderWithProviders(<ProjectDetailPage projectId="proj-123" />)

    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { level: 1, name: 'widget' })).not.toBeInTheDocument()
  })

  it('does not crash when the fetch fails, and keeps showing the loading skeleton', async () => {
    vi.mocked(getPublicProject).mockRejectedValue(new Error('network error'))

    const { container } = renderWithProviders(<ProjectDetailPage projectId="proj-123" />)

    await waitFor(() => expect(console.error).toHaveBeenCalled())

    // Source deliberately leaves isLoading=true forever on failure (see the
    // "Keep loading state true to show skeleton forever" comment) instead of
    // surfacing an error UI — assert that graceful (if unusual) behavior.
    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0)
    expect(screen.getByText('Community')).toBeInTheDocument()
  })

  const backLabelCases = [
    'Back to Browse',
    'Back to Profile',
    'Back to Leaderboard',
    'Back to Ecosystems',
    'Back to Discover',
  ]

  for (const label of backLabelCases) {
    it(`renders backLabel="${label}" verbatim as the back button text`, async () => {
      renderWithProviders(<ProjectDetailPage projectId="proj-123" onBack={vi.fn()} backLabel={label} />)

      expect(screen.getByText(label)).toBeInTheDocument()
      await waitFor(() => expect(getPublicProject).toHaveBeenCalled())
    })
  }

  it('defaults the back button text to "Back" when backLabel is not provided', async () => {
    renderWithProviders(<ProjectDetailPage projectId="proj-123" onBack={vi.fn()} />)

    expect(screen.getByText('Back')).toBeInTheDocument()
    await waitFor(() => expect(getPublicProject).toHaveBeenCalled())
  })

  it('calls onBack when the back button is clicked', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    renderWithProviders(<ProjectDetailPage projectId="proj-123" onBack={onBack} />)

    await user.click(screen.getByText('Back'))

    expect(onBack).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(getPublicProject).toHaveBeenCalled())
  })

  it('calls onIssueClick with the stringified issue id and project id when an issue is clicked', async () => {
    const user = userEvent.setup()
    const onIssueClick = vi.fn()
    renderWithProviders(<ProjectDetailPage projectId="proj-123" onIssueClick={onIssueClick} />)

    // "Fix bug in parser" also appears in the Recent Activity feed (issues
    // flow into that combined feed too), so scope the query to the Issues
    // section specifically to find the clickable issue row's title.
    const issuesHeading = await screen.findByRole('heading', { name: 'Issues' })
    const issuesSection = issuesHeading.parentElement as HTMLElement
    const issueTitle = within(issuesSection).getByText('Fix bug in parser')
    await user.click(issueTitle)

    expect(onIssueClick).toHaveBeenCalledTimes(1)
    expect(onIssueClick).toHaveBeenCalledWith('111', 'proj-123')
  })

  it('renders README content through the react-markdown wrapper when present', async () => {
    renderWithProviders(<ProjectDetailPage projectId="proj-123" />)

    await waitFor(() => expect(screen.getByTestId('markdown')).toBeInTheDocument())
    expect(screen.getByTestId('markdown')).toHaveTextContent('A great widget project.')
  })

  it('falls back to the plain description when there is no README', async () => {
    vi.mocked(getPublicProject).mockResolvedValue(buildProject({ readme: undefined }))

    renderWithProviders(<ProjectDetailPage projectId="proj-123" />)

    await waitFor(() => expect(getPublicProject).toHaveBeenCalled())
    expect(screen.queryByTestId('markdown')).not.toBeInTheDocument()
    // Renders once in the header and once in the Overview section.
    expect(screen.getAllByText('A widget for acme').length).toBeGreaterThan(0)
  })

  it('does not show a Show more toggle for a short README', async () => {
    renderWithProviders(<ProjectDetailPage projectId="proj-123" />)

    await waitFor(() => expect(screen.getByTestId('markdown')).toBeInTheDocument())
    expect(screen.queryByText('Show more')).not.toBeInTheDocument()
  })

  it('collapses a long README behind a Show more toggle, expanding on click', async () => {
    const longReadme = '# Widget\n\n' + 'A great widget project. '.repeat(40) // well over 600 chars
    vi.mocked(getPublicProject).mockResolvedValue(buildProject({ readme: longReadme }))
    const user = userEvent.setup()

    renderWithProviders(<ProjectDetailPage projectId="proj-123" />)

    await waitFor(() => expect(screen.getByTestId('markdown')).toBeInTheDocument())
    const toggle = screen.getByText('Show more')
    expect(toggle).toBeInTheDocument()
    // Collapsed: the markdown content's wrapper is height-clamped.
    expect(screen.getByTestId('markdown').parentElement).toHaveClass('max-h-[280px]')

    await user.click(toggle)

    expect(screen.getByText('Show less')).toBeInTheDocument()
    expect(screen.getByTestId('markdown').parentElement).not.toHaveClass('max-h-[280px]')

    await user.click(screen.getByText('Show less'))

    expect(screen.getByText('Show more')).toBeInTheDocument()
  })

  it('falls back to a GitHub link when there is no README and no description', async () => {
    vi.mocked(getPublicProject).mockResolvedValue(
      buildProject({
        readme: undefined,
        repo: {
          full_name: 'acme/widget',
          html_url: 'https://github.com/acme/widget',
          homepage: '',
          description: '',
          open_issues_count: 2,
          owner_login: 'acme',
          owner_avatar_url: 'https://github.com/acme.png',
        },
      })
    )

    renderWithProviders(<ProjectDetailPage projectId="proj-123" />)

    await waitFor(() => expect(screen.queryByTestId('markdown')).not.toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'GitHub repository' })).toBeInTheDocument()
  })
})
