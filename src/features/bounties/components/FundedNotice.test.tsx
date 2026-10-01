import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { FundedAssignmentActions, FundedNotice } from './FundedNotice'
import { callToAction } from './BountyRow'
import { contributorAnswer, type MyBountyAssignment } from '../../../shared/api/client'
import type { PublicBounty } from '../../../shared/api/bountyAgent'

vi.mock('../../../shared/api/client', async (orig) => {
  const real = await orig<typeof import('../../../shared/api/client')>()
  return { ...real, contributorAnswer: vi.fn(), contributorPropose: vi.fn() }
})

const bounty = (mode: 'draw' | 'self_assign'): PublicBounty => ({
  id: 'b1', repo: 'acme/widgets', issueNumber: 41, issueTitle: 'Add retry budgets', issueUrl: 'https://github.com/acme/widgets/issues/41',
  amountMinor: '50000000', decimals: 6, currency: 'USDC', network: 'solana-devnet', status: 'posted', postedAt: '2026-10-02T00:00:00Z',
  payout: null, isTest: false, waivedRules: [], applicationsOpenAt: '2026-10-02T00:00:00Z', applicationsCloseAt: '2026-10-16T00:00:00Z',
  applicationState: 'open', assignedTo: null, assignmentStaleAt: null, reservedForNewcomers: false, applicantBucket: 'few', applicantCount: null,
  funded: {
    by: 'owen', mode, escrow: '7Qm9xxxxxxxxxxxxkM1s', escrowUrl: 'https://solscan.io/account/7Qm9?cluster=devnet', deadlineAt: '2026-10-14T00:00:00Z',
    profile: { bountiesFunded: 3, unassignedBeforePr: 2, disputesRaised: 1 },
  },
})

beforeEach(() => vi.resetAllMocks())

describe('what a contributor reads before applying', () => {
  it('on a self-assign bounty, says the funder can unassign them on-chain, in the approved words', () => {
    renderWithProviders(<FundedNotice bounty={bounty('self_assign')} isDark={false} />)
    expect(screen.getByText('On this bounty the funder can unassign you')).toBeInTheDocument()
    // Approved verbatim. Not to be softened in review.
    expect(screen.getByText(/They assign it, and they can also unassign you directly on-chain, without Grainlify's agreement\. We cannot stop that and we will not pretend\s+otherwise\./)).toBeInTheDocument()
    expect(screen.getByText(/the money cannot leave the escrow before 14 October 2026/)).toBeInTheDocument()
    expect(screen.getByText(/Once your pull\s+request is open, unassigning needs your agreement too\./)).toBeInTheDocument()
  })

  it('on a draw bounty, says how the draw works instead', () => {
    renderWithProviders(<FundedNotice bounty={bounty('draw')} isDark={false} />)
    expect(screen.queryByText('On this bounty the funder can unassign you')).not.toBeInTheDocument()
    expect(screen.getByText(/The funder runs the draw when they choose\./)).toBeInTheDocument()
  })

  it('links the escrow so anybody can read it, and shows the funder\'s three numbers together', () => {
    renderWithProviders(<FundedNotice bounty={bounty('draw')} isDark={false} />)
    expect(screen.getByRole('link', { name: /escrow · 7Qm9…kM1s/ })).toHaveAttribute('href', 'https://solscan.io/account/7Qm9?cluster=devnet')
    expect(screen.getByText(/unassigned before a pull request/)).toBeInTheDocument()
    expect(screen.getByText(/raised against them/)).toBeInTheDocument()
  })

  it('never says applications close on a funded bounty: there is no window', () => {
    expect(callToAction(bounty('draw'), new Date('2026-10-03T00:00:00Z')).line).toBe('Open until the funder runs the draw.')
    expect(callToAction(bounty('self_assign'), new Date('2026-10-03T00:00:00Z')).line).toBe('Open until the funder assigns it.')
  })
})

describe('a contributor holding a funded bounty', () => {
  const held = (o: Partial<NonNullable<MyBountyAssignment['funded']>> = {}): MyBountyAssignment => ({
    status: 'pr_submitted', staleAt: '2026-10-14T00:00:00Z', funded: { wallet: 'WALLETxxxxxxxxxxxx9', prNumber: 58, proposal: null, ...o },
  })

  it('says which wallet the escrow will pay', () => {
    renderWithProviders(<FundedAssignmentActions bountyId="b1" assignment={held()} isDark={false} onChanged={() => {}} />)
    expect(screen.getByText(/The escrow pays/)).toHaveTextContent('WALL…xxx9')
  })

  it('answers the funder\'s proposal; refusing needs a reason, and silence is said to be consent', async () => {
    vi.mocked(contributorAnswer).mockResolvedValue({ status: 'refused' })
    renderWithProviders(<FundedAssignmentActions bountyId="b1" isDark={false} onChanged={() => {}} assignment={held({
      proposal: { id: 'p1', proposedBy: 'funder', proposerLogin: 'owen', reason: 'scope changed', status: 'pending', respondBy: '2026-10-09T10:00:00Z', response: null },
    })} />)
    expect(screen.getByText(/it counts as agreeing/)).toBeInTheDocument()
    const refuse = screen.getByRole('button', { name: 'Refuse' })
    expect(refuse).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Your answer'), 'CI is green')
    await userEvent.click(refuse)
    expect(contributorAnswer).toHaveBeenCalledWith('p1', 'refuse', 'CI is green')
  })
})
