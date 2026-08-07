import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { RedemptionsReview } from './RedemptionsReview'

const mockGetAdminRedemptions = vi.fn()
const mockMarkRedemptionPaid = vi.fn()
const mockRejectRedemption = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getAdminRedemptions: (...args: unknown[]) => mockGetAdminRedemptions(...args),
  markRedemptionPaid: (...args: unknown[]) => mockMarkRedemptionPaid(...args),
  rejectRedemption: (...args: unknown[]) => mockRejectRedemption(...args),
}))

const REDEMPTIONS = [
  {
    id: 'redemption-1',
    user_id: 'user-1',
    login: 'octocat',
    points_spent: 300,
    usdc_amount: '3.000000',
    stellar_wallet_address: 'GABC123DEF456',
    status: 'pending',
    created_at: new Date().toISOString(),
  },
]

describe('RedemptionsReview', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetAdminRedemptions.mockResolvedValue({ redemptions: REDEMPTIONS })
    mockMarkRedemptionPaid.mockResolvedValue({ ok: true })
    mockRejectRedemption.mockResolvedValue({ ok: true })
  })

  it('loads and displays pending redemptions', async () => {
    renderWithProviders(<RedemptionsReview />)
    await waitFor(() => expect(mockGetAdminRedemptions).toHaveBeenCalledWith('pending'))
    expect(await screen.findByText(/@octocat - 300 points/)).toBeInTheDocument()
    expect(screen.getByText('GABC123DEF456')).toBeInTheDocument()
  })

  it('shows an empty state when there are no pending redemptions', async () => {
    mockGetAdminRedemptions.mockResolvedValue({ redemptions: [] })
    renderWithProviders(<RedemptionsReview />)
    expect(await screen.findByText('No pending redemptions.')).toBeInTheDocument()
  })

  it('marking as paid calls the API and refreshes the list', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RedemptionsReview />)
    await screen.findByText(/@octocat/)

    await user.click(screen.getByTitle('Mark as paid'))

    await waitFor(() => expect(mockMarkRedemptionPaid).toHaveBeenCalledWith('redemption-1'))
    expect(mockGetAdminRedemptions).toHaveBeenCalledTimes(2)
  })

  it('rejecting a redemption opens the reason modal and calls the API', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RedemptionsReview />)
    await screen.findByText(/@octocat/)

    await user.click(screen.getByTitle('Reject and refund'))
    expect(await screen.findByText('Reject Redemption')).toBeInTheDocument()

    const rejectButtons = screen.getAllByRole('button', { name: /Reject/ })
    await user.click(rejectButtons[rejectButtons.length - 1])

    await waitFor(() => expect(mockRejectRedemption).toHaveBeenCalledWith('redemption-1', ''))
  })

  it('clicking the wallet address copies it to the clipboard', async () => {
    // user-event's setup() is what creates navigator.clipboard in jsdom in
    // the first place - it must run before it can be spied on.
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    renderWithProviders(<RedemptionsReview />)
    await screen.findByText(/@octocat/)

    await user.click(screen.getByTitle('Copy wallet address'))

    expect(writeText).toHaveBeenCalledWith('GABC123DEF456')
  })
})
