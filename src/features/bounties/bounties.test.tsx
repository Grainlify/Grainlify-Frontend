import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BountiesProgramPage } from './pages/BountiesProgramPage'
import { BountyLedger } from './components/BountyLedger'
import { WalletLinkPage } from './pages/WalletLinkPage'
import { BountyAgentError, getBounties, getBounty, getBountyLedger, type BountyLedger as Ledger, type PublicBounty } from '../../shared/api/bountyAgent'
import { ApiError, createBountyWalletChallenge, postBountyWalletLink } from '../../shared/api/client'
import { registerFakeWallet } from '../../test/fakeSolanaWallet'
import { base58 } from '../../shared/wallet/solana'

vi.mock('../../shared/api/bountyAgent', async (orig) => {
  const real = await orig<typeof import('../../shared/api/bountyAgent')>()
  return { ...real, getBounties: vi.fn(), getBounty: vi.fn(), getBountyLedger: vi.fn() }
})
vi.mock('../../shared/api/client', async (orig) => {
  const real = await orig<typeof import('../../shared/api/client')>()
  return { ...real, createBountyWalletChallenge: vi.fn(), postBountyWalletLink: vi.fn() }
})
vi.mock('../../shared/contexts/AuthContext', async (orig) => {
  const real = await orig<typeof import('../../shared/contexts/AuthContext')>()
  return { ...real, useAuth: () => ({ user: { id: 'u1', role: 'contributor', github: { login: 'Octocat' } }, isAuthenticated: true, isLoading: false }) }
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
  currency: 'USDC', network: 'solana-devnet', status: 'posted', postedAt: '2026-09-18T20:48:00.000Z', payout: null,
  isTest: false, waivedRules: [], applicationsOpenAt: null, applicationsCloseAt: null, applicationState: 'none',
  assignedTo: null, assignmentStaleAt: null, applicantBucket: null, applicantCount: null, reservedForNewcomers: false, ...o,
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
    // The heading states the currencies; the body states, plainly, that no
    // mainnet payout has happened. "Mainnet is switched on" and "a mainnet
    // payout has settled" are different claims and the page must not blur them.
    expect(screen.getByText('Bounties pay real USDC on Solana')).toBeInTheDocument()
    expect(screen.getByText(/No mainnet payout has happened yet/)).toBeInTheDocument()
    expect(screen.queryByText('Devnet test run')).not.toBeInTheDocument()
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

  it('keeps saying no payout has happened while mainnet is on but nothing has settled', async () => {
    // The trap this pins: mainnetLive true with no paid mainnet bounty is the
    // state we are actually in, and the page must not imply otherwise.
    vi.mocked(getBounties).mockResolvedValue({ status: { ...devnet, network: 'solana-mainnet', mainnetLive: true, statusLine: 'Live on Solana mainnet.' }, bounties: [bounty({ network: 'solana-mainnet' })] })
    renderWithProviders(<BountiesProgramPage ledgerHref="/bounties/ledger" />)
    expect(await screen.findByText(/No mainnet payout has happened yet/)).toBeInTheDocument()
    expect(screen.queryByText('Live on Solana mainnet.')).not.toBeInTheDocument()
    expect(screen.getByText('20 USDC')).toBeInTheDocument()
  })

  it('switches to the agent’s own line once a mainnet payout has settled', async () => {
    vi.mocked(getBounties).mockResolvedValue({
      status: { ...devnet, network: 'solana-mainnet', mainnetLive: true, statusLine: 'Live on Solana mainnet.' },
      bounties: [bounty({ status: 'paid', network: 'solana-mainnet', payout: { txSignature: 'sig', txUrl: 'https://solscan.io/tx/sig', paidAt: '2026-09-26T10:00:00.000Z', recipientLogin: 'someone' } })],
    })
    renderWithProviders(<BountiesProgramPage ledgerHref="/bounties/ledger" />)
    expect(await screen.findByText('Live on Solana mainnet.')).toBeInTheDocument()
    expect(screen.queryByText(/No mainnet payout has happened yet/)).not.toBeInTheDocument()
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

  // An erasure is an event of its own, so the change in what the ledger shows
  // (an erased account's login) is on the record rather than silent.
  it('lists an account erasure as an event, naming nobody', async () => {
    vi.mocked(getBountyLedger).mockResolvedValue({
      ...ledger,
      events: [
        { at: '2026-10-10T10:00:00.000Z', kind: 'erasure', bountyId: null, test: false, detail: "An account was erased at its owner's request. Entries are unchanged, except that its GitHub login is now shown as \"erased account\".", amount: null, proof: { label: 'owner request', url: null } },
        ...ledger.events,
      ],
    })
    renderWithProviders(<BountyLedger />)
    const table = await screen.findByLabelText('Ledger events')
    expect(within(table).getByText('Account erased')).toBeInTheDocument()
    expect(within(table).getByText(/erased at its owner's request/)).toBeInTheDocument()
  })
})

describe('WalletLinkPage', () => {
  const WALLET = 'H4AbmvyPav1oLUgcKGQUpsSdk1Uh7EkYLQX7qHJdUCmu'
  const message = (nonce = 'a'.repeat(32)) =>
    `Grainlify: link this wallet to my GitHub account\nGitHub: Octocat (id 583231)\nWallet: ${WALLET}\nNonce: ${nonce}\nIssued: 2026-09-19T14:02:11Z\nExpires: 2026-09-19T14:12:11Z`
  const challenge = (over: Partial<{ message: string; expires_at: string }> = {}) => ({
    message: message(),
    countersignature: 'Q09VTlRFUlNJR04=',
    expires_at: new Date(Date.now() + 9 * 60_000).toISOString(),
    ...over,
  })
  const cleanup: (() => void)[] = []

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getBounty).mockResolvedValue({ status: devnet, bounty: bounty() })
    vi.mocked(createBountyWalletChallenge).mockResolvedValue(challenge())
    vi.mocked(postBountyWalletLink).mockResolvedValue({ linked: true, wallet: WALLET, githubLogin: 'Octocat', replaced: null, unchanged: false })
  })
  afterEach(() => {
    cleanup.splice(0).forEach((f) => f())
    vi.restoreAllMocks()
  })

  it('names the signed-in account and asks for no username', async () => {
    renderWithProviders(<WalletLinkPage />, { route: '/bounties/link' })
    expect(await screen.findByText('@Octocat')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    // The real logo (src/assets/grainlify_log.svg), not the old placeholder square.
    const logo = document.querySelector('img.w-10.h-10')
    expect(logo?.getAttribute('src')).toMatch(/grainlify_log|^data:image\/svg/)
    expect(document.querySelector('div.w-10.h-10.rounded-lg')).toBeNull()
  })

  it('on a computer, lists detected wallets first and install links for the rest, including ones that load late', async () => {
    cleanup.push(registerFakeWallet({ name: 'Phantom' }).unregister)
    renderWithProviders(<WalletLinkPage />, { route: '/bounties/link' })
    expect(await screen.findByText('Found in this browser')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Phantom\s*Detected/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Solflare\s*Install/ })).toHaveAttribute('href', 'https://solflare.com/download')
    expect(screen.getByRole('link', { name: /Backpack\s*Install/ })).toHaveAttribute('href', 'https://backpack.app/download')
    // Solflare's extension registering after the page rendered still shows up.
    cleanup.push(registerFakeWallet({ name: 'Solflare' }).unregister)
    expect(await screen.findByRole('button', { name: /Solflare\s*Detected/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Solflare\s*Install/ })).not.toBeInTheDocument()
  })

  it('connects, signs exactly Grainlify\u2019s message, and stores the link', async () => {
    const fake = registerFakeWallet({ name: 'Phantom' })
    cleanup.push(fake.unregister)
    renderWithProviders(<WalletLinkPage />, { route: '/bounties/link?bounty=b1' })
    expect(await screen.findByText(/20 test USDC/)).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: /Phantom\s*Detected/ }))
    expect(createBountyWalletChallenge).toHaveBeenCalledWith(WALLET)
    expect(await screen.findByRole('heading', { name: 'Sign to confirm' })).toBeInTheDocument()
    expect(screen.getByText(/Nonce: a{32}/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sign message' }))
    expect(await screen.findByRole('heading', { name: 'Wallet linked' })).toBeInTheDocument()
    expect(fake.signed).toEqual([message()])
    expect(postBountyWalletLink).toHaveBeenCalledWith({ message: message(), countersignature: 'Q09VTlRFUlNJR04=', walletSignature: base58(new Uint8Array(64).fill(7)) })
    expect(screen.getByRole('link', { name: 'Back to Bounties' })).toHaveAttribute('href', '/dashboard?tab=bounties')
    expect(screen.getByRole('link', { name: 'Open the ledger' })).toHaveAttribute('href', '/dashboard?tab=bounties&subtab=ledger')
  })

  it('says so plainly when the person declines in the wallet, and lets them try again', async () => {
    let decline = true
    cleanup.push(registerFakeWallet({ name: 'Phantom', signMessage: async () => (decline ? Promise.reject(Object.assign(new Error('User rejected'), { code: 4001 })) : new Uint8Array(64).fill(7)) }).unregister)
    renderWithProviders(<WalletLinkPage />, { route: '/bounties/link' })
    await userEvent.click(await screen.findByRole('button', { name: /Phantom\s*Detected/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Sign message' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('You declined the request in Phantom, so nothing was linked.')
    expect(postBountyWalletLink).not.toHaveBeenCalled()
    decline = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Wallet linked' })).toBeInTheDocument()
  })

  it('shows the agent\u2019s refusal, such as a wallet already on another account', async () => {
    vi.mocked(postBountyWalletLink).mockRejectedValue(new BountyAgentError(409, 'That wallet is already linked to another GitHub account. Use a different wallet, or unlink it from the other account first.'))
    cleanup.push(registerFakeWallet({ name: 'Phantom' }).unregister)
    renderWithProviders(<WalletLinkPage />, { route: '/bounties/link' })
    await userEvent.click(await screen.findByRole('button', { name: /Phantom\s*Detected/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Sign message' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already linked to another GitHub account')
    expect(screen.queryByRole('heading', { name: 'Wallet linked' })).not.toBeInTheDocument()
  })

  it('fetches a fresh request instead of signing one about to expire', async () => {
    vi.mocked(createBountyWalletChallenge)
      .mockResolvedValueOnce(challenge({ expires_at: new Date(Date.now() + 5_000).toISOString() }))
      .mockResolvedValueOnce(challenge({ message: message('b'.repeat(32)) }))
    const fake = registerFakeWallet({ name: 'Phantom' })
    cleanup.push(fake.unregister)
    renderWithProviders(<WalletLinkPage />, { route: '/bounties/link' })
    await userEvent.click(await screen.findByRole('button', { name: /Phantom\s*Detected/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Sign message' }))
    expect(await screen.findByRole('heading', { name: 'Wallet linked' })).toBeInTheDocument()
    expect(fake.signed).toEqual([message('b'.repeat(32))])
  })

  it('explains an account with no GitHub attached', async () => {
    vi.mocked(createBountyWalletChallenge).mockRejectedValue(new ApiError('github_not_linked', 409, { error: 'github_not_linked' }))
    cleanup.push(registerFakeWallet({ name: 'Phantom' }).unregister)
    renderWithProviders(<WalletLinkPage />, { route: '/bounties/link' })
    await userEvent.click(await screen.findByRole('button', { name: /Phantom\s*Detected/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('no GitHub account attached')
  })

  it('on an iPhone outside any wallet, opens the page inside Phantom or Solflare', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')
    renderWithProviders(<WalletLinkPage />, { route: '/bounties/link?bounty=b1' })
    expect(await screen.findByText('Open this page inside your wallet app')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open in Phantom/ }).getAttribute('href')).toMatch(/^https:\/\/phantom\.app\/ul\/browse\/http/)
    expect(screen.getByRole('link', { name: /Open in Solflare/ }).getAttribute('href')).toMatch(/^https:\/\/solflare\.com\/ul\/v1\/browse\/http/)
    expect(screen.getByRole('link', { name: /Get Backpack/ })).toBeInTheDocument()
    expect(screen.queryByText('Use a wallet app on this phone')).not.toBeInTheDocument()
  })

  it('inside a wallet\u2019s own browser on a phone, connects directly', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Phantom')
    cleanup.push(registerFakeWallet({ name: 'Phantom' }).unregister)
    renderWithProviders(<WalletLinkPage />, { route: '/bounties/link' })
    expect(await screen.findByRole('button', { name: /Phantom\s*Detected/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Open in Phantom/ })).not.toBeInTheDocument()
  })
})
