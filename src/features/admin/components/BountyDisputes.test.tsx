import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { BountyDisputes } from './BountyDisputes'
import { getBountyDispute, getBountyDisputes, leaveDisputeToDeadline, type BountyDispute } from '../../../shared/api/client'

vi.mock('../../../shared/api/client', async (orig) => {
  const real = await orig<typeof import('../../../shared/api/client')>()
  return { ...real, getBountyDisputes: vi.fn(), getBountyDispute: vi.fn(), leaveDisputeToDeadline: vi.fn(), recordConductNote: vi.fn() }
})

const dispute: BountyDispute = {
  id: 'd1', bountyId: 'b1', repo: 'acme/widgets', issueNumber: 41, issueTitle: 'Add retry budgets', funder: 'owen', contributor: 'jotel-dev',
  prNumber: 58, prUrl: 'https://github.com/acme/widgets/pull/58',
  escrow: { address: 'E', network: 'solana-devnet', currency: 'USDC', amountMinor: '50000000', feeAmountMinor: '1250000', deadlineAt: '2026-10-14T00:00:00Z' },
  proposedBy: 'funder', funderSays: 'going a different direction', contributorSays: 'CI is green and it does what the issue asked',
  refusedAt: '2026-10-09T00:00:00Z', arbitration: null, arbitratedBy: null, arbitratedAt: null, stillHeld: true,
}

beforeEach(() => vi.resetAllMocks())

describe('the dispute view', () => {
  it('says plainly when funded bounties are not set up, rather than reporting a failure', async () => {
    vi.mocked(getBountyDisputes).mockRejectedValue(Object.assign(new Error('escrow_not_configured'), { status: 503 }))
    renderWithProviders(<BountyDisputes />)
    expect(await screen.findByText(/Funded bounties are not set up on this deployment/)).toBeInTheDocument()
  })

  it('states, as a rule, that an admin cannot end a dispute early in the funder\'s favour', async () => {
    vi.mocked(getBountyDisputes).mockResolvedValue({ disputes: [] })
    renderWithProviders(<BountyDisputes />)
    expect(await screen.findByText("An admin cannot end a dispute early in the funder's favour.")).toBeInTheDocument()
    expect(screen.getByText(/No disputes/)).toBeInTheDocument()
  })

  it('shows both positions, what happens if nobody acts, and the funder\'s record', async () => {
    vi.mocked(getBountyDisputes).mockResolvedValue({ disputes: [dispute] })
    vi.mocked(getBountyDispute).mockResolvedValue({
      ...dispute,
      timeline: [{ at: '2026-10-09T00:00:00Z', actor: 'jotel-dev', action: 'unassign.refused', detail: {} }],
      conductNotes: [],
      funderProfile: { login: 'owen', bountiesFunded: 3, unassignedBeforePr: 2, disputesRaised: 1 },
    })
    vi.mocked(leaveDisputeToDeadline).mockResolvedValue({ ok: true })
    renderWithProviders(<BountyDisputes />)
    await userEvent.click(await screen.findByRole('button', { name: /Add retry budgets/ }))
    expect(await screen.findByText('CI is green and it does what the issue asked')).toBeInTheDocument()
    expect(screen.getByText('going a different direction')).toBeInTheDocument()
    expect(screen.getByText(/Neither outcome needs you\./)).toBeInTheDocument()
    expect(screen.getByText('refused — marked disputed')).toBeInTheDocument()
    expect(screen.getByText('dispute raised against them')).toBeInTheDocument()
    // No early refund in the funder's favour exists to press.
    expect(screen.queryByRole('button', { name: /refund/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Leave it to the deadline' }))
    expect(leaveDisputeToDeadline).toHaveBeenCalledWith('d1')
  })
})
