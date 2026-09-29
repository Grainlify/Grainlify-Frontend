import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { BountiesTab } from './BountiesTab'
import { getBounties, type PublicBounty } from '../../../shared/api/bountyAgent'
import { getMaintainerBounties, getMaintainerBountyView } from '../../../shared/api/client'

vi.mock('../../../shared/api/bountyAgent', async (orig) => {
  const real = await orig<typeof import('../../../shared/api/bountyAgent')>()
  return { ...real, getBounties: vi.fn() }
})
vi.mock('../../../shared/api/client', async (orig) => {
  const real = await orig<typeof import('../../../shared/api/client')>()
  return { ...real, getMaintainerBounties: vi.fn(), getMaintainerBountyView: vi.fn() }
})

const bounty = (o: Partial<PublicBounty> = {}): PublicBounty => ({
  id: 'b1', repo: 'Grainlify/grainlify-agent-sandbox', issueNumber: 3, issueTitle: 'Fix the README',
  issueUrl: 'u', amountMinor: '1000000', decimals: 6, currency: 'USDC', network: 'solana-mainnet',
  status: 'posted', postedAt: 'x', payout: null, isTest: true, waivedRules: [],
  applicationsOpenAt: null, applicationsCloseAt: null, applicationState: 'closed',
  assignedTo: null, assignmentStaleAt: null, applicantBucket: null, applicantCount: null,
  reservedForNewcomers: false, ...o,
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getMaintainerBountyView).mockResolvedValue({
    bountyId: 'b1', repo: 'Grainlify/grainlify-agent-sandbox', issueNumber: 3, windowOpen: false,
    applicationsCloseAt: null, canAssign: false, assignmentIsByDraw: true,
    applicantBucket: null, applicantCount: 0, applications: [], draw: null,
  })
})

describe('the maintainer bounties tab', () => {
  // The bug: the tab filtered the public list against whichever repositories
  // were ticked in the picker, so it showed nothing until you selected
  // something - and it could never show a repository you maintain but have
  // not registered as a Grainlify project, which is exactly the sandbox.
  it('shows a bounty on a repo you maintain without selecting anything first', async () => {
    vi.mocked(getMaintainerBounties).mockResolvedValue({
      bounties: [{ bountyId: 'b1', repo: 'Grainlify/grainlify-agent-sandbox', issueNumber: 3 }],
    })
    vi.mocked(getBounties).mockResolvedValue({
      status: { network: 'solana-mainnet', mainnetLive: true, inferenceMode: 'live', statusLine: '' },
      bounties: [bounty()],
    })
    renderWithProviders(<BountiesTab />)
    expect(await screen.findByText('Fix the README')).toBeInTheDocument()
  })

  it('leaves out a bounty on a repo you do not maintain', async () => {
    vi.mocked(getMaintainerBounties).mockResolvedValue({ bounties: [] })
    vi.mocked(getBounties).mockResolvedValue({
      status: { network: 'solana-mainnet', mainnetLive: true, inferenceMode: 'live', statusLine: '' },
      bounties: [bounty({ id: 'other', repo: 'Someone/else', issueTitle: 'Not yours' })],
    })
    renderWithProviders(<BountiesTab />)
    expect(await screen.findByText(/no bounties on the repositories you maintain/i)).toBeInTheDocument()
    expect(screen.queryByText('Not yours')).not.toBeInTheDocument()
  })

  it('says the list is not affected by the repository picker', async () => {
    vi.mocked(getMaintainerBounties).mockResolvedValue({ bounties: [] })
    vi.mocked(getBounties).mockResolvedValue({
      status: { network: 'solana-mainnet', mainnetLive: true, inferenceMode: 'live', statusLine: '' },
      bounties: [],
    })
    renderWithProviders(<BountiesTab />)
    expect(await screen.findByText(/not affected by the repository picker/i)).toBeInTheDocument()
  })

  it('reports a failure rather than claiming you maintain nothing', async () => {
    vi.mocked(getMaintainerBounties).mockRejectedValue(new Error('agent down'))
    vi.mocked(getBounties).mockResolvedValue({
      status: { network: 'solana-mainnet', mainnetLive: true, inferenceMode: 'live', statusLine: '' },
      bounties: [],
    })
    renderWithProviders(<BountiesTab />)
    expect(await screen.findByText(/bounties on your repositories/i)).toBeInTheDocument()
  })
})
