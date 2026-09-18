import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../test/renderWithProviders'
import { ApiError } from '../../../shared/api/apiError'
import { MyApplications } from './MyApplications'

const mockGetMyHackathonIssueApplications = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getMyHackathonIssueApplications: (...args: unknown[]) => mockGetMyHackathonIssueApplications(...args),
}))

const application = {
  id: 'app-1',
  hackathon_name: 'GrainHack Spring 2026',
  repo_full_name: 'acme/widgets',
  issue_number: 42,
  status: 'lost',
  fit: null,
  gate_failure_reason: null,
  application_window_closes_at: null,
  created_at: new Date(Date.now() - 3600_000).toISOString(),
}

describe('MyApplications', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows an empty state when there are no applications', async () => {
    mockGetMyHackathonIssueApplications.mockResolvedValue({ applications: [] })
    renderWithProviders(<MyApplications />)

    expect(await screen.findByText("You haven't applied to any GrainHack issues yet.")).toBeInTheDocument()
  })

  // Used to toast and fall through to the empty state above.
  it('says it could not load instead of claiming there are none, and retries', async () => {
    mockGetMyHackathonIssueApplications.mockRejectedValueOnce(new ApiError('internal_error', 500, { error: 'internal_error' }))
    mockGetMyHackathonIssueApplications.mockResolvedValueOnce({ applications: [application] })
    const user = userEvent.setup()
    renderWithProviders(<MyApplications />)

    expect(await screen.findByText("Couldn't load your applications")).toBeInTheDocument()
    expect(screen.getByText(/internal_error/)).toBeInTheDocument()
    expect(screen.queryByText("You haven't applied to any GrainHack issues yet.")).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('acme/widgets#42')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
