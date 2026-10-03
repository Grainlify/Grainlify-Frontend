import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BountyLedger, grainhackNetworkNote } from './components/BountyLedger'
import { getBountyLedger, type BountyLedger as Ledger, type LedgerEvent } from '../../shared/api/bountyAgent'

vi.mock('../../shared/api/bountyAgent', async (orig) => {
  const real = await orig<typeof import('../../shared/api/bountyAgent')>()
  return { ...real, getBountyLedger: vi.fn() }
})

// Sample hashes and logins: the shapes are what is under test.
const HASH_A = `0x${'a1'.repeat(32)}`
const HASH_B = `0x${'b2'.repeat(32)}`
const SOL_SIG = '5hK2mJ1rX9kP2sT8wY4zA6bC5dE7fG9hJ2kL4mN6pQ8rS1tU3vW5xY7zA9bC2dE4fG6hJ8kL1mN3pQ5rS7'

const ghEvents: LedgerEvent[] = [
  { at: '2026-10-03T15:02:00.000Z', kind: 'grainhack_payout', bountyId: null, test: true, detail: 'GrainHack October → sample-ada', amount: '100.00 test USDC', proof: { label: '5hK2m…pQ5rS7', url: null }, network: 'solana-devnet', hackathonId: 'h-2', txSignature: SOL_SIG },
  { at: '2026-10-03T14:40:00.000Z', kind: 'grainhack_pool_funded', bountyId: null, test: true, detail: 'GrainHack October float funded', amount: '250.00 test USDC', proof: { label: '3vQ7…', url: 'https://explorer.solana.com/tx/3vQ7?cluster=devnet' }, network: 'solana-devnet', hackathonId: 'h-2' },
  { at: '2026-09-19T10:12:00.000Z', kind: 'grainhack_payout', bountyId: null, test: true, history: true, detail: 'GrainHack event 1 → sample-one', amount: '4.00 test USDC', proof: { label: '0xa1a1…a1a1', url: null }, network: 'base-sepolia', hackathonId: 'e11e77b0-8d8d-40c5-a8dd-b525a491374b', txSignature: HASH_A },
  { at: '2026-09-19T10:12:00.000Z', kind: 'grainhack_payout', bountyId: null, test: true, history: true, detail: 'GrainHack event 1 → sample-two', amount: '4.00 test USDC', proof: { label: '0xb2b2…b2b2', url: null }, network: 'base-sepolia', hackathonId: 'e11e77b0-8d8d-40c5-a8dd-b525a491374b', txSignature: HASH_B },
]

const ledger: Ledger = {
  status: { network: 'solana-mainnet', mainnetLive: true, inferenceMode: 'live', statusLine: 'Live on Solana mainnet.' },
  totals: { bountiesPosted: 1, bountiesPaidMainnet: 1, bountiesPaidTest: 0, inferenceCalls: 0, inferenceSpendMicro: 0, inferenceCeilingMicro: 5_000_000, feesInMicro: null },
  budget: [],
  events: [
    ...ghEvents,
    { at: '2026-09-30T20:00:00.000Z', kind: 'payout', bountyId: 'b1', test: false, detail: 'repo #1 → someone', amount: '20 USDC', proof: { label: 'abc', url: 'https://explorer.solana.com/tx/abc' } },
  ],
}

describe('BountyLedger · GrainHack rows', () => {
  beforeEach(() => vi.resetAllMocks())

  it('labels both new kinds and shows only them under the GrainHack tab', async () => {
    vi.mocked(getBountyLedger).mockResolvedValue(ledger)
    renderWithProviders(<BountyLedger />)
    await screen.findByLabelText('Ledger events')
    await userEvent.click(screen.getByRole('button', { name: 'GrainHack' }))
    const table = screen.getByLabelText('Ledger events')
    expect(within(table).getAllByText('GrainHack payout')).toHaveLength(3)
    expect(within(table).getByText('GrainHack pool funded')).toBeInTheDocument()
    expect(within(table).queryByText(/^Payout/)).not.toBeInTheDocument()
  })

  it("says honestly where event 1's history rows were paid, and links them to Base Sepolia", async () => {
    vi.mocked(getBountyLedger).mockResolvedValue(ledger)
    renderWithProviders(<BountyLedger />)
    const table = await screen.findByLabelText('Ledger events')
    const notes = within(table).getAllByTestId('ledger-network-note').map((n) => n.textContent)
    expect(notes).toEqual(['Solana devnet · test', 'Solana devnet · test', 'Base Sepolia testnet · history', 'Base Sepolia testnet · history'])
    expect(within(table).getByRole('link', { name: '0xa1a1…a1a1' })).toHaveAttribute('href', `https://sepolia.basescan.org/tx/${HASH_A}`)
    expect(within(table).getByRole('link', { name: '5hK2m…pQ5rS7' })).toHaveAttribute('href', `https://explorer.solana.com/tx/${SOL_SIG}?cluster=devnet`)
    // The agent's own link wins when it sends one.
    expect(within(table).getByRole('link', { name: '3vQ7…' })).toHaveAttribute('href', 'https://explorer.solana.com/tx/3vQ7?cluster=devnet')
    expect(screen.getByTestId('ledger-grainhack-note')).toHaveTextContent('Base Sepolia testnet on 19 September 2026: test USDC with no value')
  })

  it('leaves the GrainHack note off a ledger with no GrainHack rows', async () => {
    vi.mocked(getBountyLedger).mockResolvedValue({ ...ledger, events: ledger.events.filter((e) => e.kind === 'payout') })
    renderWithProviders(<BountyLedger />)
    await screen.findByLabelText('Ledger events')
    expect(screen.queryByTestId('ledger-grainhack-note')).not.toBeInTheDocument()
  })

  it('shows a kind it does not know by name rather than breaking', async () => {
    vi.mocked(getBountyLedger).mockResolvedValue({ ...ledger, events: [{ ...ledger.events[4], kind: 'maintainer_payout' as LedgerEvent['kind'] }] })
    renderWithProviders(<BountyLedger />)
    const table = await screen.findByLabelText('Ledger events')
    expect(within(table).getByText('maintainer_payout')).toBeInTheDocument()
  })
})

describe('grainhackNetworkNote', () => {
  it('puts no note on a real mainnet payment, or on bounty rows', () => {
    expect(grainhackNetworkNote({ ...ghEvents[0], test: false, network: 'solana-mainnet' })).toBeNull()
    expect(grainhackNetworkNote(ledger.events[4])).toBeNull()
  })

  it('marks a test row even when the network is missing', () => {
    expect(grainhackNetworkNote({ ...ghEvents[0], network: undefined })).toBe('test')
  })
})
