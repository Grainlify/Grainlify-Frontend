import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../test/renderWithProviders'
import { ApiError } from '../../../shared/api/apiError'
import { VerdictsReview } from './VerdictsReview'

const mockGetHackathonVerdicts = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getHackathonVerdicts: (...args: unknown[]) => mockGetHackathonVerdicts(...args),
}))

// Rendering of a single verdict and the stats banner are their own suites'
// concern; this one is about the queue's load path.
vi.mock('./VerdictDetail', () => ({ VerdictDetail: () => <div data-testid="verdict-detail" /> }))
vi.mock('./DisagreementRate', () => ({ DisagreementRate: () => <div data-testid="disagreement-rate" /> }))

const verdict = {
  id: 'v-1',
  repo_full_name: 'acme/widgets',
  pr_number: 12,
  github_login: 'octocat',
  final_bucket: 'accepted',
  prefilter_status: 'passed',
  needs_human_review: true,
  duplicate_flagged: false,
}

describe('VerdictsReview', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows an empty queue when there is nothing to review', async () => {
    mockGetHackathonVerdicts.mockResolvedValue({ verdicts: [], shadow_mode: true, stats: null })
    renderWithProviders(<VerdictsReview hackathonId="hack-1" />)

    expect(await screen.findByText(/Nothing here\. Verdicts appear once merged PRs are judged\./)).toBeInTheDocument()
  })

  // Used to toast and fall through to "Nothing here..." - an empty review
  // queue that wasn't.
  it('says it could not load instead of showing an empty queue, and retries', async () => {
    mockGetHackathonVerdicts.mockRejectedValueOnce(new ApiError('internal_error', 500, { error: 'internal_error' }))
    mockGetHackathonVerdicts.mockResolvedValueOnce({ verdicts: [verdict], shadow_mode: true, stats: null })
    const user = userEvent.setup()
    renderWithProviders(<VerdictsReview hackathonId="hack-1" />)

    expect(await screen.findByText("Couldn't load verdicts")).toBeInTheDocument()
    expect(screen.queryByText(/Nothing here/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('acme/widgets#12')).toBeInTheDocument()
    expect(mockGetHackathonVerdicts).toHaveBeenLastCalledWith('hack-1', { status: 'needs_review' })
  })

  it("does not leave the previous filter's rows under a tab whose load failed", async () => {
    mockGetHackathonVerdicts.mockResolvedValueOnce({ verdicts: [verdict], shadow_mode: true, stats: null })
    mockGetHackathonVerdicts.mockRejectedValueOnce(new ApiError('internal_error', 500, { error: 'internal_error' }))
    const user = userEvent.setup()
    renderWithProviders(<VerdictsReview hackathonId="hack-1" />)
    await screen.findByText('acme/widgets#12')

    await user.click(screen.getByRole('button', { name: 'Overridden' }))

    expect(await screen.findByText("Couldn't load verdicts")).toBeInTheDocument()
    expect(screen.queryByText('acme/widgets#12')).not.toBeInTheDocument()
  })
})
