import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BountiesProgramPage } from './pages/BountiesProgramPage'
import { StatusNotice } from './components/StatusNotice'
import { getBounties, type PublicBounty } from '../../shared/api/bountyAgent'
import { getMyBountyState } from '../../shared/api/client'

vi.mock('../../shared/api/bountyAgent', async (orig) => {
  const real = await orig<typeof import('../../shared/api/bountyAgent')>()
  return { ...real, getBounties: vi.fn(), getBountyLedger: vi.fn() }
})
vi.mock('../../shared/api/client', async (orig) => {
  const real = await orig<typeof import('../../shared/api/client')>()
  return {
    ...real,
    applyForBounty: vi.fn(),
    getMyBountyState: vi.fn(),
    getBountyWalletLink: vi.fn().mockResolvedValue({ linked: false, wallet: null, linked_at: null }),
  }
})
vi.mock('../../shared/contexts/AuthContext', async (orig) => {
  const real = await orig<typeof import('../../shared/contexts/AuthContext')>()
  return { ...real, useAuth: () => ({ user: { id: 'u1', role: 'contributor', github: { login: 'Octocat' } }, isAuthenticated: true, isLoading: false }) }
})

const status = { network: 'solana-mainnet', mainnetLive: true, inferenceMode: 'live' as const, statusLine: 'Live.' }
const bounty = (o: Partial<PublicBounty> = {}): PublicBounty => ({
  id: 'b1', repo: 'Grainlify/sandbox', issueNumber: 7, issueTitle: 't', issueUrl: 'u',
  amountMinor: '1000000', decimals: 6, currency: 'USDC', network: 'solana-mainnet', status: 'posted',
  postedAt: '2026-09-27T09:00:00.000Z', payout: null, isTest: false, waivedRules: [],
  applicationsOpenAt: '2026-09-27T09:00:00.000Z', applicationsCloseAt: new Date(Date.now() + 3600_000).toISOString(),
  applicationState: 'open', assignedTo: null, assignmentStaleAt: null, applicantBucket: null, applicantCount: null,
  reservedForNewcomers: false, ...o,
})

const never = <T,>() => new Promise<T>(() => {})

beforeEach(() => vi.resetAllMocks())

describe('nothing claims an answer before it has one', () => {
  it('the status panel does not say the agent is unreachable while it is still being asked', () => {
    // null meant both "not asked yet" and "asked and failed", so every first
    // paint announced an outage and corrected itself a moment later.
    renderWithProviders(<StatusNotice status={null} loading />)
    expect(screen.queryByText(/could not be reached/i)).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
  })

  it('and does say so once the answer really is "unreachable"', () => {
    renderWithProviders(<StatusNotice status={null} loading={false} />)
    expect(screen.getByText(/could not be reached/i)).toBeInTheDocument()
  })

  it('shows no unreachable message on the page while bounties are loading', () => {
    vi.mocked(getBounties).mockReturnValue(never())
    vi.mocked(getMyBountyState).mockReturnValue(never())
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    expect(screen.queryByText(/could not be reached/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/status unavailable/i)).not.toBeInTheDocument()
  })

  it('offers no Apply button until the server has said whether you already applied', async () => {
    // The button appeared, then became a refusal. Offering an action we do
    // not yet know is available is a guess presented as an answer.
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty()] })
    vi.mocked(getMyBountyState).mockReturnValue(never())
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)

    expect(await screen.findByText(/checking whether you have applied/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /apply for this bounty/i })).not.toBeInTheDocument()
  })

  it('shows the button once the answer is known and the answer is "you can"', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty()] })
    vi.mocked(getMyBountyState).mockResolvedValue({ applications: {}, assignments: {} })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    expect(await screen.findByRole('button', { name: /apply for this bounty/i })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(/checking whether you have applied/i)).not.toBeInTheDocument())
  })

  it('goes straight to a refusal rather than flashing a button first', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status, bounties: [bounty()] })
    vi.mocked(getMyBountyState).mockResolvedValue({
      applications: { b1: { status: 'rejected_gate', gateFailureReason: 'holding_another_bounty', appliedAt: 'x' } },
      assignments: {},
    })
    renderWithProviders(<BountiesProgramPage ledgerHref="/ledger" />)
    expect(await screen.findByText(/already hold a bounty/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^apply for this bounty$/i })).not.toBeInTheDocument()
  })
})
