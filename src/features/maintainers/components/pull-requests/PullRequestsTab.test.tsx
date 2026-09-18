import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../../test/renderWithProviders'
import { PullRequestsTab } from './PullRequestsTab'
import { getProjectPRs } from '../../../../shared/api/client'
import { ApiError } from '../../../../shared/api/apiError'

vi.mock('../../../../shared/api/client', () => ({
  getProjectPRs: vi.fn(),
}))

const PROJECT = { id: 'proj-1', github_full_name: 'acme/widgets', status: 'verified' }
const OTHER = { id: 'proj-2', github_full_name: 'acme/gadgets', status: 'verified' }

const serverError = () => new ApiError('internal_error', 500, { error: 'internal_error' })

function makePR(overrides: Record<string, unknown> = {}) {
  return {
    github_pr_id: 5001,
    number: 12,
    state: 'open',
    title: 'Add the feature',
    author_login: 'octocat',
    url: 'https://github.com/acme/widgets/pull/12',
    merged: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    closed_at: null,
    merged_at: null,
    last_seen_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('PullRequestsTab - load failures', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows LoadFailed, not "No pull requests found", when the PR fetch fails', async () => {
    // The per-project catch used to return [], so the existing error branch
    // was unreachable and a failed fetch read as "no pull requests".
    vi.mocked(getProjectPRs).mockRejectedValue(serverError())

    renderWithProviders(<PullRequestsTab selectedProjects={[PROJECT]} />)

    expect(await screen.findByText("Couldn't load the pull requests")).toBeInTheDocument()
    expect(screen.getByText(/internal_error/)).toBeInTheDocument()
    expect(screen.queryByText('No pull requests found in selected repositories')).not.toBeInTheDocument()
  })

  it('shows the loaded PRs plus a line naming the repo that failed when only some fetches fail', async () => {
    vi.mocked(getProjectPRs).mockImplementation(async (id: string) => {
      if (id === OTHER.id) throw serverError()
      return { prs: [makePR({ title: 'Loaded PR' })] }
    })

    renderWithProviders(<PullRequestsTab selectedProjects={[PROJECT, OTHER]} />)

    expect(await screen.findByText('Loaded PR')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load pull requests from acme/gadgets")
    expect(screen.queryByText("Couldn't load the pull requests")).not.toBeInTheDocument()
  })

  it('retries from LoadFailed and renders the PRs once the fetch succeeds', async () => {
    vi.mocked(getProjectPRs)
      .mockRejectedValueOnce(serverError())
      .mockResolvedValue({ prs: [makePR({ title: 'Back again' })] })
    const user = userEvent.setup()

    renderWithProviders(<PullRequestsTab selectedProjects={[PROJECT]} />)

    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Back again')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('still shows the real empty state when the fetch succeeds with no PRs', async () => {
    vi.mocked(getProjectPRs).mockResolvedValue({ prs: [] })

    renderWithProviders(<PullRequestsTab selectedProjects={[PROJECT]} />)

    expect(await screen.findByText('No pull requests found in selected repositories')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
