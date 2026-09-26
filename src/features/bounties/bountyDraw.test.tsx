import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BountiesProgramPage } from './pages/BountiesProgramPage'
import { callToAction, timeUntil } from './components/BountyRow'
import { getBounties, type PublicBounty } from '../../shared/api/bountyAgent'
import { ApiError, applyForBounty } from '../../shared/api/client'

vi.mock('../../shared/api/bountyAgent', async (orig) => {
  const real = await orig<typeof import('../../shared/api/bountyAgent')>()
  return { ...real, getBounties: vi.fn(), getBounty: vi.fn(), getBountyLedger: vi.fn() }
})
vi.mock('../../shared/api/client', async (orig) => {
  const real = await orig<typeof import('../../shared/api/client')>()
  return { ...real, applyForBounty: vi.fn(), getBountyWalletLink: vi.fn().mockResolvedValue({ linked: false, wallet: null, linked_at: null }) }
})
vi.mock('../../shared/contexts/AuthContext', async (orig) => {
  const real = await orig<typeof import('../../shared/contexts/AuthContext')>()
  return { ...real, useAuth: () => ({ user: { id: 'u1', role: 'contributor', github: { login: 'Octocat' } }, isAuthenticated: true, isLoading: false }) }
})

const status = { network: 'solana-mainnet', mainnetLive: true, inferenceMode: 'live' as const, statusLine: 'Live on Solana mainnet.' }

const bounty = (o: Partial<PublicBounty> = {}): PublicBounty => ({
  id: 'b1', repo: 'Grainlify/sandbox', issueNumber: 7, issueTitle: 'Fix the flaky test',
  issueUrl: 'https://github.com/Grainlify/sandbox/issues/7', amountMinor: '1000000', decimals: 6,
  currency: 'USDC', network: 'solana-mainnet', status: 'posted', postedAt: '2026-09-27T09:00:00.000Z', payout: null,
  isTest: false, waivedRules: [], applicationsOpenAt: '2026-09-27T09:00:00.000Z',
  applicationsCloseAt: new Date(Date.now() + 5 * 3600_000).toISOString(), applicationState: 'open',
  assignedTo: null, assignmentStaleAt: null, ...o,
})

describe('what a bounty tells a contributor they can do', () => {
  const now = new Date('2026-09-27T12:00:00Z')

  it('an open window invites an application and says when it closes', () => {
    const c = callToAction(bounty({ applicationsCloseAt: '2026-09-27T18:00:00Z' }), now)
    expect(c.kind).toBe('apply')
    expect(c.line).toContain('in 6 hours')
  })

  // These two read the same to a user unless the page distinguishes them, and
  // "closed" looks like a stale page while "never opened" looks like a bug.
  it('separates a window that has closed from one that never opened', () => {
    expect(callToAction(bounty({ applicationState: 'closed' }), now).line).toContain('The draw runs next')
    expect(callToAction(bounty({ applicationState: 'none', applicationsCloseAt: null }), now).line).toContain('Not open for applications yet')
  })

  it('an assigned bounty names who holds it and says it can come back', () => {
    const c = callToAction(bounty({ assignedTo: 'winner', applicationState: 'closed' }), now)
    expect(c.kind).toBe('held')
    expect(c.line).toContain('winner')
    expect(c.line).toContain('drawn again')
  })

  it('a paid bounty names who was paid', () => {
    const c = callToAction(bounty({ status: 'paid', payout: { txSignature: 's', txUrl: 'u', paidAt: 'p', recipientLogin: 'octo' } }), now)
    expect(c).toMatchObject({ kind: 'done' })
    expect(c.line).toContain('octo')
  })

  it('counts down in minutes, hours then days, and stops at zero', () => {
    expect(timeUntil('2026-09-27T12:30:00Z', now)).toBe('in 30 minutes')
    expect(timeUntil('2026-09-27T17:00:00Z', now)).toBe('in 5 hours')
    expect(timeUntil('2026-09-30T12:00:00Z', now)).toBe('in 3 days')
    expect(timeUntil('2026-09-27T11:00:00Z', now)).toBeNull()
    expect(timeUntil(null, now)).toBeNull()
  })
})

describe('applying from the bounties page', () => {
  beforeEach(() => vi.resetAllMocks())

  it('applies and says you are in the draw', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty()] })
    vi.mocked(applyForBounty).mockResolvedValue({ applied: true, applicationId: 'a1', closesAt: null })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)

    const button = await screen.findByRole('button', { name: /apply for this bounty/i })
    await userEvent.click(button)
    expect(vi.mocked(applyForBounty)).toHaveBeenCalledWith('b1')
    expect(await screen.findByText(/you are in the draw/i)).toBeInTheDocument()
  })

  it('shows the reason an application was refused, in words', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty()] })
    vi.mocked(applyForBounty).mockRejectedValue(new ApiError('You already hold a bounty. Finish or release it before applying for another.', 403, { error: 'holding_another_bounty' }))
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)

    await userEvent.click(await screen.findByRole('button', { name: /apply for this bounty/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/already hold a bounty/i)
  })

  it('offers no apply button once a bounty is assigned', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty({ assignedTo: 'someone', applicationState: 'closed' })] })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    expect(await screen.findByText(/assigned to someone/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /apply for this bounty/i })).not.toBeInTheDocument()
  })

  it('marks a test bounty visibly and names what it relaxes', async () => {
    // A test bounty that looked real would be worse than no test at all.
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty({ isTest: true, waivedRules: ['block_org_members'] })] })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    expect(await screen.findByText(/test bounty — not for contributors/i)).toBeInTheDocument()
    expect(screen.getByText(/relaxed for this test: block_org_members/i)).toBeInTheDocument()
  })
})

describe('how to claim, after the draw replaced comment-and-PR claiming', () => {
  beforeEach(() => vi.resetAllMocks())

  it('describes applying and the draw, not claiming by comment or pull request', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [] })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    await screen.findByText(/how to claim a bounty/i)

    expect(screen.getByText(/apply here while the bounty's window is open/i)).toBeInTheDocument()
    expect(screen.getByText(/one applicant is drawn and assigned/i)).toBeInTheDocument()
    // The old instructions told people to open a PR to claim, which under the
    // draw gets them nothing and wastes their work.
    expect(screen.queryByText(/up to \$50 per bounty/i)).not.toBeInTheDocument()
    expect(screen.getByText(/do not open a pull request yet/i)).toBeInTheDocument()
  })

  it('states what the draw cannot see, because that is the claim people check', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [] })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    expect(await screen.findByText(/follower count/i)).toBeInTheDocument()
    expect(screen.getByText(/applying early gives you no advantage/i)).toBeInTheDocument()
    expect(screen.getByText(/not published while a window is open/i)).toBeInTheDocument()
  })
})
