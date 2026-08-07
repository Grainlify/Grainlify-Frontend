import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { SocialFollowReview } from './SocialFollowReview'

const mockGetAdminSocialFollowSubmissions = vi.fn()
const mockApproveSocialFollowSubmission = vi.fn()
const mockRejectSocialFollowSubmission = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getAdminSocialFollowSubmissions: (...args: unknown[]) => mockGetAdminSocialFollowSubmissions(...args),
  approveSocialFollowSubmission: (...args: unknown[]) => mockApproveSocialFollowSubmission(...args),
  rejectSocialFollowSubmission: (...args: unknown[]) => mockRejectSocialFollowSubmission(...args),
}))

const SUBMISSIONS = [
  { id: 'sub-1', user_id: 'user-1', login: 'octocat', platform: 'github', screenshot: 'data:image/png;base64,abc', status: 'pending', created_at: new Date().toISOString() },
]

describe('SocialFollowReview', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetAdminSocialFollowSubmissions.mockResolvedValue({ submissions: SUBMISSIONS })
    mockApproveSocialFollowSubmission.mockResolvedValue({ ok: true })
    mockRejectSocialFollowSubmission.mockResolvedValue({ ok: true })
  })

  it('loads and displays pending submissions', async () => {
    renderWithProviders(<SocialFollowReview />)
    await waitFor(() => expect(mockGetAdminSocialFollowSubmissions).toHaveBeenCalledWith('pending'))
    expect(await screen.findByText('@octocat')).toBeInTheDocument()
    expect(screen.getByText('github')).toBeInTheDocument()
  })

  it('shows an empty state when there are no pending submissions', async () => {
    mockGetAdminSocialFollowSubmissions.mockResolvedValue({ submissions: [] })
    renderWithProviders(<SocialFollowReview />)
    expect(await screen.findByText('No pending submissions.')).toBeInTheDocument()
  })

  it('approving a submission calls the API and refreshes the list', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SocialFollowReview />)
    await screen.findByText('@octocat')

    await user.click(screen.getByTitle('Approve'))

    await waitFor(() => expect(mockApproveSocialFollowSubmission).toHaveBeenCalledWith('sub-1'))
    expect(mockGetAdminSocialFollowSubmissions).toHaveBeenCalledTimes(2)
  })

  it('rejecting a submission opens the reason modal and calls the API', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SocialFollowReview />)
    await screen.findByText('@octocat')

    await user.click(screen.getByTitle('Reject'))
    expect(await screen.findByText('Reject Submission')).toBeInTheDocument()

    // Two "Reject"-named buttons exist once the modal is open: the row's
    // icon button (accessible name from its title attribute) and the
    // modal's own submit button, which renders after it in the DOM.
    const rejectButtons = screen.getAllByRole('button', { name: 'Reject' })
    await user.click(rejectButtons[rejectButtons.length - 1])

    await waitFor(() => expect(mockRejectSocialFollowSubmission).toHaveBeenCalledWith('sub-1', ''))
  })
})
