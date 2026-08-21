import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen } from '../../../../test/renderWithProviders'
import { PayoutReadinessCard } from './PayoutReadinessCard'

const mockGetPayoutReadiness = vi.fn()
vi.mock('../../../../shared/api/client', () => ({
  getPayoutReadiness: (...a: unknown[]) => mockGetPayoutReadiness(...a),
}))

const base = {
  chain_id: 'aptos-testnet',
  may_be_owed: true,
  basis: 'founding_member',
  has_verified_address: false,
  action_required: true,
  excluded_from: [],
}

beforeEach(() => vi.resetAllMocks())

describe('PayoutReadinessCard', () => {
  it('tells a member with no address that a published payout cannot be edited afterwards', async () => {
    mockGetPayoutReadiness.mockResolvedValue({ ...base, state: 'register_now' })
    renderWithProviders(<PayoutReadinessCard />)

    expect(await screen.findByText(/Register a payout address/)).toBeInTheDocument()
    // The urgency is the irreversibility, not a date - we do not know when the
    // next settlement publishes, so the copy must carry the consequence.
    expect(screen.getByText(/cannot be edited afterwards/i)).toBeInTheDocument()
  })

  it('renders nothing at all when no payout is owed', async () => {
    mockGetPayoutReadiness.mockResolvedValue({
      ...base, may_be_owed: false, basis: '', action_required: false, state: 'not_applicable',
    })
    const { container } = renderWithProviders(<PayoutReadinessCard />)

    await vi.waitFor(() => expect(mockGetPayoutReadiness).toHaveBeenCalled())
    await vi.waitFor(() => expect(container.textContent).not.toMatch(/Checking whether/))
    expect(container.textContent).toBe('')
  })

  it('says what waiting means in the ready state', async () => {
    mockGetPayoutReadiness.mockResolvedValue({
      ...base, has_verified_address: true, action_required: false, state: 'ready',
    })
    renderWithProviders(<PayoutReadinessCard />)

    expect(await screen.findByText(/set up for payouts/i)).toBeInTheDocument()
    expect(screen.getByText(/Nothing is owed to you yet/i)).toBeInTheDocument()
  })

  // Exclusion wins over everything server-side. A member who HAS an address and
  // was excluded must still read the exclusion - if this ever re-derives state
  // from the booleans, that person silently gets "you're set up" instead.
  it('shows the exclusion even when an address is registered', async () => {
    mockGetPayoutReadiness.mockResolvedValue({
      ...base,
      has_verified_address: true,
      state: 'excluded_from_published',
      excluded_from: [{ settlement_id: 's1', excluded_reason: 'no_address', remedy: 'contact_support' }],
    })
    renderWithProviders(<PayoutReadinessCard />)

    expect(await screen.findByText(/left out of a payout/i)).toBeInTheDocument()
    expect(screen.getByText(/future payouts will include you/i)).toBeInTheDocument()
  })

  // §6: no per-person figure reaches a UI, and an exclusion amount is the
  // sharpest case - money that will not arrive, with no path to honour it.
  it('never shows an amount on an exclusion', async () => {
    mockGetPayoutReadiness.mockResolvedValue({
      ...base,
      state: 'excluded_from_published',
      excluded_from: [{ settlement_id: 's1', excluded_reason: 'no_github_account', remedy: 'contact_support' }],
    })
    const { container } = renderWithProviders(<PayoutReadinessCard />)

    await screen.findByText(/left out of/i)
    expect(container.textContent).not.toMatch(/\$|USDC|\d+\.\d{2}/)
  })

  // A failed read is not "nothing to do". Rendering not_applicable here would
  // tell somebody who must register that they need not, which is the one wrong
  // answer with a deadline attached.
  it('does not fall back to "nothing to do" when the check fails', async () => {
    mockGetPayoutReadiness.mockRejectedValue(new Error('network'))
    renderWithProviders(<PayoutReadinessCard />)

    expect(await screen.findByText(/Couldn't check your payout status/i)).toBeInTheDocument()
    expect(screen.queryByText(/set up for payouts/i)).toBeNull()
  })
})
