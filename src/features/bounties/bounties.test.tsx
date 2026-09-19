import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BountiesProgramPage } from './pages/BountiesProgramPage'
import { BountyLedger } from './components/BountyLedger'
import { WalletLinkPage } from './pages/WalletLinkPage'
import { getBounties, getBounty, getBountyLedger, type BountyLedger as Ledger, type PublicBounty } from '../../shared/api/bountyAgent'

vi.mock('../../shared/api/bountyAgent', async (orig) => {
  const real = await orig<typeof import('../../shared/api/bountyAgent')>()
  return { ...real, getBounties: vi.fn(), getBounty: vi.fn(), getBountyLedger: vi.fn() }
})

const devnet = {
  network: 'solana-devnet',
  mainnetLive: false,
  inferenceMode: 'mock' as const,
  statusLine: 'Devnet test run so far. Bounties pay test tokens with no value; mainnet bounties are not live yet.',
}

const bounty = (o: Partial<PublicBounty> = {}): PublicBounty => ({
  id: 'b1', repo: 'Grainlify/grainlify-agent-sandbox', issueNumber: 1, issueTitle: 'Fix the spelling of "Wellcome"',
  issueUrl: 'https://github.com/Grainlify/grainlify-agent-sandbox/issues/1', amountMinor: '20000000', decimals: 6,
  currency: 'USDC', network: 'solana-devnet', status: 'posted', postedAt: '2026-09-18T20:48:00.000Z', payout: null, ...o,
})

describe('BountiesProgramPage', () => {
  beforeEach(() => vi.resetAllMocks())

  it('lists open and paid bounties, calls devnet amounts test tokens, and states the status in the agent’s words', async () => {
    vi.mocked(getBounties).mockResolvedValue({
      status: devnet,
      bounties: [
        bounty({ id: 'open1', issueNumber: 7, issueTitle: 'Add docs' }),
        bounty({ status: 'paid', payout: { txSignature: 'sig', txUrl: 'https://solscan.io/tx/sig?cluster=devnet', paidAt: '2026-09-18T22:05:00.000Z', recipientLogin: 'Baskarayelu' } }),
      ],
    })
    renderWithProviders(<BountiesProgramPage ledgerHref="/dashboard?tab=bounties&subtab=ledger" />)
    expect(await screen.findByText('Add docs')).toBeInTheDocument()
    expect(screen.getByText(/1 bounty open/i)).toBeInTheDocument()
    expect(screen.getAllByText('20 test USDC')).toHaveLength(2)
    expect(screen.getByText(devnet.statusLine)).toBeInTheDocument()
    expect(screen.getByText('Devnet test run')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'transaction' })).toHaveAttribute('href', 'https://solscan.io/tx/sig?cluster=devnet')
    expect(screen.getByRole('link', { name: /Open the ledger/ })).toHaveAttribute('href', '/dashboard?tab=bounties&subtab=ledger')
  })

  it('shows an outage as an outage, not as an empty programme', async () => {
    vi.mocked(getBounties).mockRejectedValue(new Error('down'))
    renderWithProviders(<BountiesProgramPage ledgerHref="/bounties/ledger" />)
    expect(await screen.findByText(/Couldn't load bounties/)).toBeInTheDocument()
    expect(screen.queryByText(/No bounty is open/)).not.toBeInTheDocument()
    expect(screen.getByText('Status unavailable')).toBeInTheDocument()
  })

  it('says mainnet is live only when the agent says so', async () => {
    vi.mocked(getBounties).mockResolvedValue({ status: { ...devnet, network: 'solana-mainnet', mainnetLive: true, statusLine: 'Live on Solana mainnet.' }, bounties: [bounty({ network: 'solana-mainnet' })] })
    renderWithProviders(<BountiesProgramPage ledgerHref="/bounties/ledger" />)
    expect(await screen.findByText('Live on Solana mainnet')).toBeInTheDocument()
    expect(screen.getByText('20 USDC')).toBeInTheDocument()
  })
})

const ledger: Ledger = {
  status: devnet,
  totals: { bountiesPosted: 1, bountiesPaidMainnet: 0, bountiesPaidTest: 1, inferenceCalls: 2, inferenceSpendMicro: null, inferenceCeilingMicro: 5_000_000, feesInMicro: null },
  budget: [{ phase: 'P1', allocationMicro: 500_000, spentMicro: 0 }],
  events: [
    { at: '2026-09-18T22:05:00.000Z', kind: 'payout', bountyId: 'b1', test: true, detail: 'sandbox #1 → Baskarayelu', amount: '20.00 test USDC', proof: { label: '3vLHK…sUTB', url: 'https://solscan.io/tx/x?cluster=devnet' } },
    { at: '2026-09-18T21:52:00.000Z', kind: 'gate_passed', bountyId: 'b1', test: true, detail: 'PR #2', amount: null, proof: { label: 'PR #2', url: 'https://github.com/x/pull/2' } },
    { at: '2026-09-18T21:44:00.000Z', kind: 'inference', bountyId: 'b1', test: true, detail: 'review · claude-sonnet-4-6', amount: null, proof: { label: 'quote 405b7a7f', url: null } },
    { at: '2026-09-18T20:48:00.000Z', kind: 'inference', bountyId: 'b1', test: true, detail: 'price · gpt-oss-120b', amount: null, proof: { label: 'quote c036cae5', url: null } },
    { at: '2026-09-18T20:48:00.000Z', kind: 'bounty_posted', bountyId: 'b1', test: true, detail: 'sandbox #1', amount: '20.00 test USDC', proof: { label: 'issue #1', url: 'https://github.com/x/issues/1' } },
  ],
}

describe('BountyLedger', () => {
  beforeEach(() => vi.resetAllMocks())

  it('reports no real inference spend while inference is mocked, and labels test rows', async () => {
    vi.mocked(getBountyLedger).mockResolvedValue(ledger)
    renderWithProviders(<BountyLedger />)
    expect((await screen.findAllByText('no real spend yet: test gateway')).length).toBeGreaterThan(0)
    expect(screen.getByText('After launch')).toBeInTheDocument()
    const table = screen.getByLabelText('Ledger events')
    expect(within(table).getByText('Payout · test')).toBeInTheDocument()
    expect(within(table).getAllByText('mock')).toHaveLength(2)
  })

  it('shows the latest paid bounty’s receipt chain, oldest first', async () => {
    vi.mocked(getBountyLedger).mockResolvedValue(ledger)
    renderWithProviders(<BountyLedger />)
    const chain = (await screen.findByText(/Receipt chain/)).closest('section')!
    const kinds = within(chain).getAllByText(/^(Bounty posted|Inference|Gate passed|Payout)$/).map((n) => n.textContent)
    expect(kinds).toEqual(['Bounty posted', 'Inference', 'Inference', 'Gate passed', 'Payout'])
  })

  it('filters the events table by type', async () => {
    vi.mocked(getBountyLedger).mockResolvedValue(ledger)
    renderWithProviders(<BountyLedger />)
    await screen.findByLabelText('Ledger events')
    await userEvent.click(screen.getByRole('button', { name: 'Payouts' }))
    const table = screen.getByLabelText('Ledger events')
    expect(within(table).queryByText(/Inference/)).not.toBeInTheDocument()
    expect(within(table).getByText('Payout · test')).toBeInTheDocument()
  })
})

describe('WalletLinkPage', () => {
  beforeEach(() => vi.resetAllMocks())
  afterEach(() => {
    delete window.phantom
    delete window.solflare
  })

  it('outside a wallet, offers to open the page inside Phantom or Solflare', async () => {
    vi.mocked(getBounty).mockResolvedValue({ status: devnet, bounty: bounty() })
    renderWithProviders(<WalletLinkPage />, { route: '/bounties/link?bounty=b1' })
    expect(await screen.findByText(/20 test USDC/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open in Phantom/ }).getAttribute('href')).toMatch(/^https:\/\/phantom\.app\/ul\/browse\//)
    expect(screen.getByRole('link', { name: /Open in Solflare/ }).getAttribute('href')).toMatch(/^https:\/\/solflare\.com\/ul\/v1\/browse\//)
  })

  it('inside Phantom: connects, signs exactly the link message, and hands back the comment', async () => {
    let signed = ''
    window.phantom = {
      solana: {
        isPhantom: true,
        connect: async () => ({ publicKey: { toString: () => 'H4AbmvyPav1oLUgcKGQUpsSdk1Uh7EkYLQX7qHJdUCmu' } }),
        signMessage: async (m: Uint8Array) => {
          signed = new TextDecoder().decode(m)
          return { signature: new Uint8Array([1, 2, 3]) }
        },
      },
    }
    renderWithProviders(<WalletLinkPage />, { route: '/bounties/link' })
    const sign = screen.getByRole('button', { name: 'Sign message' })
    expect(sign).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Your GitHub username'), 'Baskarayelu')
    await userEvent.click(screen.getByRole('button', { name: /Connect Phantom/ }))
    await waitFor(() => expect(screen.getByText('Connected')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Sign message' }))
    expect(await screen.findByText(/Now post it on GitHub/)).toBeInTheDocument()
    expect(signed).toMatch(/^Grainlify bounty agent: link this wallet to my GitHub account\nGitHub: baskarayelu\nWallet: H4AbmvyPav1oLUgcKGQUpsSdk1Uh7EkYLQX7qHJdUCmu\nIssued: /)
    expect(screen.getByText(/^\/grainlify link H4AbmvyPav1oLUgcKGQUpsSdk1Uh7EkYLQX7qHJdUCmu Ldp /)).toBeInTheDocument()
  })

  it('refuses an invalid GitHub username', async () => {
    window.phantom = { solana: { isPhantom: true, connect: async () => ({ publicKey: { toString: () => 'W' } }), signMessage: async () => new Uint8Array() } }
    renderWithProviders(<WalletLinkPage />, { route: '/bounties/link' })
    await userEvent.type(screen.getByLabelText('Your GitHub username'), 'bad--name')
    expect(screen.getByText('That is not a valid GitHub username.')).toBeInTheDocument()
  })
})
