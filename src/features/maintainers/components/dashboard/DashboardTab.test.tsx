import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../../test/renderWithProviders'
import { DashboardTab } from './DashboardTab'
import { getProjectIssues, getProjectPRs } from '../../../../shared/api/client'
import { ApiError } from '../../../../shared/api/apiError'

vi.mock('../../../../shared/api/client', () => ({
  getProjectIssues: vi.fn(),
  getProjectPRs: vi.fn(),
}))

// ApplicationsChart renders recharts' ResponsiveContainer, which needs
// ResizeObserver - not available in jsdom and not polyfilled anywhere in
// this repo's test setup. Left unmocked, it throws inside a passive effect
// and corrupts subsequent event handling in the same test (observed: click
// simulation silently stops reaching handlers). Unrelated to what this file
// tests, so stub it out rather than adding a global polyfill for one file.
vi.mock('./ApplicationsChart', () => ({
  ApplicationsChart: () => <div data-testid="chart-stub" />,
}))

const PROJECT = { id: 'proj-42', github_full_name: 'acme/widgets', status: 'verified' }

function makeIssue(overrides: Record<string, unknown> = {}) {
  return {
    github_issue_id: 9001,
    number: 7,
    state: 'open',
    title: 'Fix the thing',
    description: null,
    author_login: 'octocat',
    assignees: [],
    labels: [],
    comments_count: 0,
    comments: [],
    url: 'https://github.com/acme/widgets/issues/7',
    updated_at: '2026-01-01T00:00:00Z',
    last_seen_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('DashboardTab - Review button navigation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getProjectPRs).mockResolvedValue({ prs: [] })
  })

  it('calls onNavigateToIssue with the issue id and its real project id when Review is clicked', async () => {
    vi.mocked(getProjectIssues).mockResolvedValue({ issues: [makeIssue()] })
    const onNavigateToIssue = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <DashboardTab selectedProjects={[PROJECT]} onNavigateToIssue={onNavigateToIssue} />
    )

    const reviewButton = await screen.findByRole('button', { name: 'Review' })
    await user.click(reviewButton)

    // This is the regression this test guards: previously activity.projectId
    // was never populated (only projectName was), so the onClick condition
    // in DashboardTab's activity row never passed and Review was inert for
    // every issue, regardless of which project it came from.
    expect(onNavigateToIssue).toHaveBeenCalledTimes(1)
    expect(onNavigateToIssue).toHaveBeenCalledWith('9001', 'proj-42')
  })

  it('does not crash and does not navigate when there are no issues', async () => {
    vi.mocked(getProjectIssues).mockResolvedValue({ issues: [] })
    const onNavigateToIssue = vi.fn()

    renderWithProviders(
      <DashboardTab selectedProjects={[PROJECT]} onNavigateToIssue={onNavigateToIssue} />
    )

    await waitFor(() => expect(getProjectIssues).toHaveBeenCalledWith('proj-42'))
    expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument()
    expect(onNavigateToIssue).not.toHaveBeenCalled()
  })
})

describe('DashboardTab - closed issue state in Last activity', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getProjectPRs).mockResolvedValue({ prs: [] })
  })

  it('shows the checkmark indicator for a closed issue, not the open-issue dot', async () => {
    // Regression coverage: a closed issue's `state` was fetched but dropped
    // when building the Activity list, so every issue rendered identically
    // regardless of open/closed - a closed issue looked exactly like an open
    // one in this widget.
    vi.mocked(getProjectIssues).mockResolvedValue({
      issues: [makeIssue({ github_issue_id: 721, number: 721, state: 'closed', title: 'A finished issue' })],
    })

    const { container } = renderWithProviders(<DashboardTab selectedProjects={[PROJECT]} />)

    await screen.findByText('A finished issue')
    expect(container.querySelector('.lucide-check')).toBeInTheDocument()
    expect(container.querySelector('.lucide-circle')).not.toBeInTheDocument()
  })

  it('shows the open-issue dot for an open issue', async () => {
    vi.mocked(getProjectIssues).mockResolvedValue({
      issues: [makeIssue({ state: 'open', title: 'A fresh issue' })],
    })

    const { container } = renderWithProviders(<DashboardTab selectedProjects={[PROJECT]} />)

    await screen.findByText('A fresh issue')
    expect(container.querySelector('.lucide-circle')).toBeInTheDocument()
    expect(container.querySelector('.lucide-check')).not.toBeInTheDocument()
  })
})

describe('DashboardTab - load failures', () => {
  const OTHER = { id: 'proj-43', github_full_name: 'acme/gadgets', status: 'verified' }
  const serverError = () => new ApiError('internal_error', 500, { error: 'internal_error' })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows LoadFailed, not zero counts or "No recent activity found.", when every fetch fails', async () => {
    // Previously each per-project catch returned [], so this rendered the
    // stats at 0 and "No recent activity found." as if the repo were idle.
    vi.mocked(getProjectIssues).mockRejectedValue(serverError())
    vi.mocked(getProjectPRs).mockRejectedValue(serverError())

    renderWithProviders(<DashboardTab selectedProjects={[PROJECT]} />)

    expect(await screen.findByText("Couldn't load the dashboard")).toBeInTheDocument()
    expect(screen.getByText(/internal_error/)).toBeInTheDocument()
    expect(screen.queryByText('No recent activity found.')).not.toBeInTheDocument()
    expect(screen.queryByText('Pull Requests Opened')).not.toBeInTheDocument()
  })

  it('shows loaded data plus a line naming the repo that failed when only some fetches fail', async () => {
    vi.mocked(getProjectIssues).mockImplementation(async (id: string) => {
      if (id === OTHER.id) throw serverError()
      return { issues: [makeIssue({ title: 'Loaded issue' })] }
    })
    vi.mocked(getProjectPRs).mockResolvedValue({ prs: [] })

    renderWithProviders(<DashboardTab selectedProjects={[PROJECT, OTHER]} />)

    expect(await screen.findByText('Loaded issue')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load all dashboard data from acme/gadgets")
    expect(screen.queryByText("Couldn't load the dashboard")).not.toBeInTheDocument()
  })

  it('retries from LoadFailed and renders the data once the fetch succeeds', async () => {
    vi.mocked(getProjectIssues)
      .mockRejectedValueOnce(serverError())
      .mockResolvedValue({ issues: [makeIssue({ title: 'Back again' })] })
    vi.mocked(getProjectPRs)
      .mockRejectedValueOnce(serverError())
      .mockResolvedValue({ prs: [] })
    const user = userEvent.setup()

    renderWithProviders(<DashboardTab selectedProjects={[PROJECT]} />)

    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Back again')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
