import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../../test/renderWithProviders'
import { FundedBountyControls } from './FundedBountyControls'
import { fundedAnswer, fundedPropose, getFundedView, type FundedView } from '../../../../shared/api/client'

vi.mock('../../../../shared/api/client', async (orig) => {
  const real = await orig<typeof import('../../../../shared/api/client')>()
  return { ...real, getFundedView: vi.fn(), fundedPropose: vi.fn(), fundedAnswer: vi.fn(), fundedDraw: vi.fn() }
})

const future = new Date(Date.now() + 14 * 86_400_000).toISOString()
const view = (o: Partial<FundedView> = {}): FundedView => ({
  bountyId: 'b1', repo: 'acme/widgets', issueNumber: 41, issueTitle: 'Add retry budgets', bountyStatus: 'posted', mode: 'draw',
  escrow: {
    address: '7Qm9xxxxxxxxxxxxkM1s', network: 'solana-devnet', state: 'funded', funderWallet: 'FUNDERxxxxxxxxxxxxx', contributorWallet: null,
    amountMinor: '50000000', feeAmountMinor: '1250000', totalMinor: '51250000', currency: 'USDC', decimals: 6, deadlineAt: future, fundTx: 'sig',
  },
  applicants: [
    { githubLogin: 'jotel-dev', status: 'applied', fit: 'strong', appliedAt: future, completions: 0, abandons: 0, firstApplication: true, assignable: true },
    { githubLogin: 'boluxx123', status: 'applied', fit: 'plausible', appliedAt: future, completions: 2, abandons: 0, firstApplication: false, assignable: true },
  ],
  assignment: null, proposal: null, canDraw: true, drawUnavailableReason: null,
  profile: { login: 'owen', bountiesFunded: 3, unassignedBeforePr: 2, disputesRaised: 1 },
  ...o,
})

beforeEach(() => vi.resetAllMocks())

describe('the funder\'s controls', () => {
  it('draw mode: one button, and says applications stay open until they draw', async () => {
    vi.mocked(getFundedView).mockResolvedValue(view())
    renderWithProviders(<FundedBountyControls bountyId="b1" />)
    expect(await screen.findByRole('button', { name: 'Run the draw' })).toBeEnabled()
    expect(screen.getByText(/Applications stay open until you draw — there is no window running down\./)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Assign' })).not.toBeInTheDocument()
  })

  it('self-assign: an Assign button per applicant, which needs their wallet connected first', async () => {
    vi.mocked(getFundedView).mockResolvedValue(view({ mode: 'self_assign', canDraw: false }))
    renderWithProviders(<FundedBountyControls bountyId="b1" />)
    const assign = await screen.findAllByRole('button', { name: 'Assign' })
    expect(assign).toHaveLength(2)
    for (const b of assign) expect(b).toBeDisabled()
  })

  it('shows the escrow, what the contributor receives, and the refund date on one line', async () => {
    vi.mocked(getFundedView).mockResolvedValue(view())
    renderWithProviders(<FundedBountyControls bountyId="b1" />)
    expect(await screen.findByText('51.25 test USDC')).toBeInTheDocument()
    expect(screen.getByText('50.00 test USDC')).toBeInTheDocument()
    expect(screen.getByText(/Refundable by you from/)).toBeInTheDocument()
  })

  it('states the unassigning rules where they act, and the funder\'s own record', async () => {
    vi.mocked(getFundedView).mockResolvedValue(view())
    renderWithProviders(<FundedBountyControls bountyId="b1" />)
    expect(await screen.findByText(/Before a pull request exists you can unassign at any time, no reason needed\./)).toBeInTheDocument()
    expect(screen.getByText(/If they don't reply within 7 days it goes ahead\./)).toBeInTheDocument()
    expect(screen.getByText(/3 funded · 2 unassigned before a pull request · 1 disputes raised/)).toBeInTheDocument()
  })

  it('once a pull request is open, offers a proposal, never a direct unassign', async () => {
    vi.mocked(getFundedView).mockResolvedValue(view({
      assignment: { githubLogin: 'jotel-dev', status: 'pr_submitted', assignedAt: future, prNumber: 58, prOpen: true, wallet: 'W', onChain: true },
    }))
    vi.mocked(fundedPropose).mockResolvedValue({ proposalId: 'p1', respondBy: future })
    renderWithProviders(<FundedBountyControls bountyId="b1" />)
    expect(await screen.findByText(/Held by jotel-dev, pull request #58 open/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Unassign' })).not.toBeInTheDocument()
    const propose = screen.getByRole('button', { name: 'Propose unassigning' })
    expect(propose).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Why you want to end the assignment'), 'scope changed')
    await userEvent.click(propose)
    expect(fundedPropose).toHaveBeenCalledWith('b1', 'scope changed')
    expect(await screen.findByRole('status')).toHaveTextContent(/counts as agreeing/)
  })

  it('answers the contributor\'s proposal; refusing needs a reason', async () => {
    vi.mocked(getFundedView).mockResolvedValue(view({
      assignment: { githubLogin: 'jotel-dev', status: 'pr_submitted', assignedAt: future, prNumber: 58, prOpen: true, wallet: 'W', onChain: true },
      proposal: { id: 'p1', proposedBy: 'contributor', proposerLogin: 'jotel-dev', reason: 'I cannot finish', status: 'pending', respondBy: future, response: null, respondedAt: null, awaitingFunderSignature: false },
    }))
    vi.mocked(fundedAnswer).mockResolvedValue({ status: 'accepted', carriedOut: true })
    renderWithProviders(<FundedBountyControls bountyId="b1" />)
    expect(await screen.findByRole('button', { name: 'Refuse' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Agree' }))
    expect(fundedAnswer).toHaveBeenCalledWith('p1', 'accept', '')
  })
})
