import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { MaintainersPage } from './MaintainersPage'
import { getMyProjects, getPendingSetupProjects, getAuthToken } from '../../../shared/api/client'

vi.mock('../../../shared/api/client', () => ({
  getMyProjects: vi.fn(),
  getPendingSetupProjects: vi.fn(),
  getAuthToken: vi.fn(),
}))

// Covered in their own test suites — stub them so MaintainersPage tests focus on
// tab switching, the repo dropdown, and the post-GitHub-App-install flow.
vi.mock('../components/dashboard/DashboardTab', () => ({
  DashboardTab: () => <div data-testid="dashboard-tab">Dashboard Tab Stub</div>,
}))

vi.mock('../components/issues/IssuesTab', () => ({
  IssuesTab: () => <div data-testid="issues-tab">Issues Tab Stub</div>,
}))

vi.mock('../components/pull-requests/PullRequestsTab', () => ({
  PullRequestsTab: () => <div data-testid="pull-requests-tab">Pull Requests Tab Stub</div>,
}))

vi.mock('../components/NewProjectSetupModal', () => ({
  NewProjectSetupModal: ({
    isOpen,
    project,
  }: {
    isOpen: boolean
    project: { github_full_name?: string } | null
  }) =>
    isOpen ? (
      <div data-testid="new-project-setup-modal">{project?.github_full_name ?? 'unknown'}</div>
    ) : null,
}))

type MaintainerProject = Awaited<ReturnType<typeof getMyProjects>>[number]
type PendingProject = Awaited<ReturnType<typeof getPendingSetupProjects>>[number]

function makeProject(overrides: Partial<MaintainerProject> = {}): MaintainerProject {
  return {
    id: 'project-1',
    github_full_name: 'acme/widgets',
    github_repo_id: 1,
    status: 'verified',
    ecosystem_name: 'Acme',
    language: 'TypeScript',
    tags: [],
    category: 'tooling',
    verification_error: null,
    verified_at: null,
    webhook_created_at: null,
    webhook_id: null,
    webhook_url: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makePendingProject(overrides: Partial<PendingProject> = {}): PendingProject {
  return {
    id: 'pending-1',
    github_full_name: 'acme/widgets',
    description: null,
    ecosystem_id: 'eco-1',
    ecosystem_name: 'Acme',
    language: null,
    tags: [],
    category: null,
    ...overrides,
  }
}

describe('MaintainersPage', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    vi.mocked(getMyProjects).mockResolvedValue([])
    vi.mocked(getPendingSetupProjects).mockResolvedValue([])
    vi.mocked(getAuthToken).mockReturnValue(null)
  })

  it('renders the Dashboard tab by default', async () => {
    renderWithProviders(<MaintainersPage onNavigate={vi.fn()} />)

    expect(await screen.findByTestId('dashboard-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('issues-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('pull-requests-tab')).not.toBeInTheDocument()
  })

  it('opens directly on the Issues tab when initialTab="Issues" is passed (e.g. from Discover\'s "View all issues")', async () => {
    renderWithProviders(<MaintainersPage onNavigate={vi.fn()} initialTab="Issues" />)

    expect(await screen.findByTestId('issues-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-tab')).not.toBeInTheDocument()
  })

  it("switches tabs so only the active tab's mocked child renders", async () => {
    const user = userEvent.setup()
    renderWithProviders(<MaintainersPage onNavigate={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Issues' }))
    expect(screen.getByTestId('issues-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-tab')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pull Requests' }))
    expect(screen.getByTestId('pull-requests-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('issues-tab')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dashboard' }))
    expect(screen.getByTestId('dashboard-tab')).toBeInTheDocument()
    expect(screen.queryByTestId('pull-requests-tab')).not.toBeInTheDocument()
  })

  it('shows the repository dropdown without crashing while the projects request is in flight', async () => {
    vi.mocked(getMyProjects).mockReturnValue(new Promise<MaintainerProject[]>(() => {}))
    const user = userEvent.setup()
    renderWithProviders(<MaintainersPage onNavigate={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Select repositories' }))

    expect(screen.getByRole('heading', { name: 'Select repositories' })).toBeInTheDocument()
    expect(screen.queryByText('No repositories found')).not.toBeInTheDocument()
  })

  it('lists grouped repositories in the dropdown once the projects request resolves', async () => {
    vi.mocked(getMyProjects).mockResolvedValue([
      makeProject({ id: '1', github_full_name: 'acme/widgets' }),
      makeProject({ id: '2', github_full_name: 'acme/gadgets' }),
      makeProject({ id: '3', github_full_name: 'other-org/tool' }),
    ])
    const user = userEvent.setup()
    renderWithProviders(<MaintainersPage onNavigate={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Select repositories' }))

    expect(await screen.findByText('acme')).toBeInTheDocument()
    expect(screen.getByText('other-org')).toBeInTheDocument()
  })

  it('shows an empty state in the dropdown when there are no repositories', async () => {
    vi.mocked(getMyProjects).mockResolvedValue([])
    const user = userEvent.setup()
    renderWithProviders(<MaintainersPage onNavigate={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Select repositories' }))

    expect(await screen.findByText('No repositories found')).toBeInTheDocument()
  })

  it('surfaces an error message in the dropdown without crashing when the projects request fails', async () => {
    vi.mocked(getMyProjects).mockRejectedValue(new Error('Something went wrong'))
    const user = userEvent.setup()
    renderWithProviders(<MaintainersPage onNavigate={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Select repositories' }))

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('strips the github_app_installed query param immediately and opens the setup modal after the sync delay', async () => {
    window.history.pushState({}, '', '/maintainers?github_app_installed=true')
    vi.mocked(getPendingSetupProjects).mockResolvedValue([
      makePendingProject({ id: 'pending-1', github_full_name: 'acme/widgets' }),
    ])
    vi.mocked(getMyProjects).mockResolvedValue([])

    vi.useFakeTimers()
    try {
      renderWithProviders(<MaintainersPage onNavigate={vi.fn()} />)

      // The redirect-handling effect strips the query param synchronously.
      expect(window.location.search).toBe('')
      // Neither list is re-fetched immediately — only after the delay, to give
      // the backend time to sync the newly installed app before refetching.
      expect(getMyProjects).not.toHaveBeenCalled()
      expect(getPendingSetupProjects).not.toHaveBeenCalled()
      expect(screen.queryByTestId('new-project-setup-modal')).not.toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500)
      })

      expect(getMyProjects).toHaveBeenCalledTimes(1)
      expect(getPendingSetupProjects).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId('new-project-setup-modal')).toHaveTextContent('acme/widgets')
    } finally {
      vi.useRealTimers()
    }
  })
})
