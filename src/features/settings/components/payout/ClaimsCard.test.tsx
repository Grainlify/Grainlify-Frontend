import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen } from '../../../../test/renderWithProviders'
import { ClaimsCard } from './ClaimsCard'

const mockGetClaims = vi.fn()
vi.mock('../../../../shared/api/client', () => ({
  getClaims: (...a: unknown[]) => mockGetClaims(...a),
}))

const CLAIM = {
  settlement_id: 'a81a583b-1111-2222-3333-444444444444',
  chain_id: 'aptos-testnet',
  pool: 'contributor',
  escrow_address: '0xe5ffaaaabbbbccccddddeeeeffff00001111222233334444555566667777822bc',
  contract_address: '0xc0117aaaabbbbccccddddeeeeffff000011112222333344445555666677778899',
  network: 'testnet',
  explorer_url_template: 'https://explorer.aptoslabs.com/txn/%s?network=testnet',
  asset: { symbol: 'USDC', decimals: 6 },
  amount_minor: '250000',
  amount: '0.250000',
  claim_address: '0x1b41aaaabbbbccccddddeeeeffff000011112222333344445555666677778899',
  claim_address_verified_at: '2026-07-03T09:15:00Z',
  address_status: 'current' as const,
  current_address: null,
  identity_hash: '0xaa',
  leaf_hash: '0xbb',
  leaf_index: 0,
  proof: ['0xcc'],
  root: '0x9a7d',
  published_tx: '0x91e4bbbb',
}

beforeEach(() => vi.resetAllMocks())

describe('ClaimsCard', () => {
  it('renders the server-formatted amount verbatim and never a parsed one', async () => {
    mockGetClaims.mockResolvedValue({ claims: [CLAIM] })
    const { container } = renderWithProviders(<ClaimsCard />)

    // "0.250000", not "0.25". amount_minor is a string so nobody parses it into
    // a float64; amount is pre-formatted so the client never divides. Rendering
    // a trimmed value would mean somebody had done arithmetic on money.
    // Mechanism: the untrimmed value reaches the screen at all.
    expect((await screen.findAllByText(/0\.250000/)).length).toBeGreaterThan(0)

    // Inverse, and the half that matters. "At least one element shows
    // 0.250000" passes when the heading is right and the BUTTON reads 0.25 -
    // the exact disagreement worth catching, on the element people press.
    //
    // So: every decimal number anywhere on this card must be the server's
    // value. Nothing else here renders one - addresses are hex, leaf_index is
    // an integer, the settlement id is sliced - so any other match is
    // arithmetic somebody did on money.
    const decimals = container.textContent?.match(/\d+\.\d+/g) ?? []
    expect(decimals.length).toBeGreaterThan(0)
    for (const d of decimals) {
      expect(d).toBe('0.250000')
    }
  })

  // The specified fail-open. An absent or failed chain read is not evidence of
  // a claim; the contract rejects a double claim and gas is sponsored, so a
  // wrong "Claim" costs an error message and a wrong "Claimed" costs money that
  // looks collected and is not.
  it('shows the Claim button, because nothing here has evidence of a prior claim', async () => {
    mockGetClaims.mockResolvedValue({ claims: [CLAIM] })
    renderWithProviders(<ClaimsCard />)

    expect(await screen.findByRole('button', { name: /Claim 0\.250000 USDC/i })).toBeInTheDocument()
    expect(screen.queryByText(/already claimed|claimed on/i)).toBeNull()
  })

  it('names the frozen address, its date and the lock when the address is superseded', async () => {
    mockGetClaims.mockResolvedValue({
      claims: [{
        ...CLAIM,
        address_status: 'superseded',
        current_address: '0xb33bffffeeeeddddccccbbbbaaaa999988887777666655554444333322224022',
      }],
    })
    renderWithProviders(<ClaimsCard />)

    expect(await screen.findByText(/previous address/i)).toBeInTheDocument()
    expect(screen.getByText(/3 July 2026/)).toBeInTheDocument()
    expect(screen.getByText(/cannot be moved/i)).toBeInTheDocument()
    // The remedy must reach the screen, not just the copy module.
    expect(screen.getByText(/not lost/i)).toBeInTheDocument()
  })

  it('tells a user with no live address that registering one will not redirect this payout', async () => {
    mockGetClaims.mockResolvedValue({
      claims: [{ ...CLAIM, address_status: 'no_live_address', current_address: null }],
    })
    renderWithProviders(<ClaimsCard />)

    expect(await screen.findByText(/will not redirect this payout/i)).toBeInTheDocument()
  })

  // Classified on the error NAME. Matching the server's human `detail` would be
  // parsing prose for control flow, and prose gets reworded.
  it('renders the duplicate-claim state without blaming the contributor', async () => {
    mockGetClaims.mockRejectedValue(new Error('{"error":"multiple_claims_for_settlement","count":2}'))
    renderWithProviders(<ClaimsCard />)

    expect(await screen.findByText(/need to check this payout/i)).toBeInTheDocument()
    expect(screen.getByText(/nothing is wrong with your account/i)).toBeInTheDocument()
  })

  it('builds the explorer link from the served template, not a hardcoded host', async () => {
    mockGetClaims.mockResolvedValue({ claims: [CLAIM] })
    renderWithProviders(<ClaimsCard />)

    const link = await screen.findByRole('link', { name: /published payout/i })
    expect(link).toHaveAttribute('href', 'https://explorer.aptoslabs.com/txn/0x91e4bbbb?network=testnet')
  })

  // A template whose placeholder we do not understand gets no link. Guessing
  // where the hash goes produces a link to the wrong place, which is worse than
  // no link on a screen about money.
  it('renders no link rather than a guessed one when the template has no placeholder', async () => {
    mockGetClaims.mockResolvedValue({
      claims: [{ ...CLAIM, explorer_url_template: 'https://explorer.example/' }],
    })
    renderWithProviders(<ClaimsCard />)

    await screen.findByRole('button', { name: /Claim/i })
    expect(screen.queryByRole('link', { name: /published payout/i })).toBeNull()
  })

  // The permanence sentence, and the two things it must not do: promise the
  // link can be removed, or sit above the button where it reads as a barrier.
  it('says the claim is public and permanent, without promising it can be undone', async () => {
    mockGetClaims.mockResolvedValue({ claims: [CLAIM] })
    const { container } = renderWithProviders(<ClaimsCard />)

    await screen.findByRole('button', { name: /Claim/i })
    expect(screen.getByText(/public and permanent/i)).toBeInTheDocument()
    expect(screen.getByText(/anyone can see that this address claimed/i)).toBeInTheDocument()
    // No suggestion it is reversible or removable. It is on a ledger nobody can
    // edit, and implying otherwise would be a promise we cannot keep.
    expect(container.textContent).not.toMatch(/you can (remove|delete|undo)|we can remove/i)
  })

  // TEMPORARY, paired with Grainlify-Backend#536. When a fee payer ships this
  // test is deleted along with the copy - it exists so the sentence cannot be
  // quietly dropped while claimants are still paying, and so deleting it is a
  // deliberate act rather than a tidy-up.
  it('tells the claimant they pay the network fee, while that is true', async () => {
    mockGetClaims.mockResolvedValue({ claims: [CLAIM] })
    renderWithProviders(<ClaimsCard />)

    await screen.findByRole('button', { name: /Claim/i })
    expect(screen.getByText(/small network fee in APT from this wallet/i)).toBeInTheDocument()
    // The first-claim difference is the actionable half: it is why somebody's
    // first attempt needs more APT than the number they were quoted elsewhere.
    expect(screen.getByText(/first claim costs a little more/i)).toBeInTheDocument()
    // And it must not claim the opposite, which is what the flow spec says and
    // what is not true yet.
    expect(screen.queryByText(/we cover the network/i)).toBeNull()
  })

  it('renders nothing when there is nothing published', async () => {
    mockGetClaims.mockResolvedValue({ claims: [] })
    const { container } = renderWithProviders(<ClaimsCard />)

    await vi.waitFor(() => expect(container.textContent).not.toMatch(/Loading/))
    expect(container.textContent).toBe('')
  })
})
