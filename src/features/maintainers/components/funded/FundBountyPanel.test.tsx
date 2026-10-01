import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../../test/renderWithProviders'
import { registerFakeWallet } from '../../../../test/fakeSolanaWallet'
import { FundBountyPanel, fromMinor, toMinor } from './FundBountyPanel'
import { confirmFundedBounty, getFundedQuote, getMyProjects, prepareFundedBounty, type FundedStatus } from '../../../../shared/api/client'

vi.mock('../../../../shared/api/client', async (orig) => {
  const real = await orig<typeof import('../../../../shared/api/client')>()
  return { ...real, getMyProjects: vi.fn(), getFundedQuote: vi.fn(), prepareFundedBounty: vi.fn(), confirmFundedBounty: vi.fn() }
})

const status: FundedStatus = {
  available: true, network: 'solana-devnet', currencies: [{ currency: 'USDC', decimals: 6, maxMinor: '50000000' }],
  minDeadlineDays: 7, maxDeadlineDays: 120, respondDays: 7, attestorReady: true,
}

let unregister: (() => void) | null = null
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getMyProjects).mockResolvedValue([
    { id: 'p1', github_full_name: 'acme/widgets', verified_at: '2026-09-01T00:00:00Z' },
    { id: 'p2', github_full_name: 'acme/unverified', verified_at: null },
  ] as never)
  vi.mocked(getFundedQuote).mockImplementation(async (minor: string) => {
    const fee = BigInt(minor) * 250n / 10_000n > 250_000n ? BigInt(minor) * 250n / 10_000n : 250_000n
    return { amountMinor: minor, feeBps: 250, feeMinimumMinor: '250000', feeAmountMinor: fee.toString(), totalMinor: (BigInt(minor) + fee).toString(), effectiveRate: Number(fee) / Number(minor), flooredByMinimum: fee === 250_000n }
  })
})
afterEach(() => { unregister?.(); unregister = null })

describe('amounts', () => {
  it('reads what a person types into minor units, and refuses what is not an amount', () => {
    expect(toMinor('50', 6)).toBe('50000000')
    expect(toMinor('0.25', 6)).toBe('250000')
    expect(toMinor('1.0000001', 6)).toBeNull()
    expect(toMinor('0', 6)).toBeNull()
    expect(toMinor('ten', 6)).toBeNull()
    expect(fromMinor('51250000', 6)).toBe('51.25')
  })
})

describe('funding a bounty', () => {
  it('offers only verified projects', async () => {
    renderWithProviders(<FundBountyPanel status={status} onFunded={() => {}} onClose={() => {}} />)
    expect(await screen.findByRole('option', { name: 'acme/widgets' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'acme/unverified' })).not.toBeInTheDocument()
  })

  it('offers the draw and self-assign as two equal choices, neither chosen for them', async () => {
    renderWithProviders(<FundBountyPanel status={status} onFunded={() => {}} onClose={() => {}} />)
    const draw = screen.getByRole('button', { name: /Weighted draw/ })
    const self = screen.getByRole('button', { name: /I'll assign it myself/ })
    expect(draw).toHaveAttribute('aria-pressed', 'false')
    expect(self).toHaveAttribute('aria-pressed', 'false')
  })

  it('says the draw-mode trust assumption and what signing commits them to, in the approved words', async () => {
    renderWithProviders(<FundBountyPanel status={status} onFunded={() => {}} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /Weighted draw/ }))
    expect(screen.getByText("In draw mode, Grainlify picks who gets assigned. You can refund yourself after the deadline without us. Choose self-assign if you'd rather keep that control.")).toBeInTheDocument()
    expect(screen.getByText(/Funding is the release: after you sign, Grainlify can pay the assigned contributor when the work is merged, without asking you again\./)).toBeInTheDocument()
  })

  it('shows live numbers from the quote, and says when the 25¢ minimum is doing the work', async () => {
    renderWithProviders(<FundBountyPanel status={status} onFunded={() => {}} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText('Amount the contributor receives'), '1')
    expect(await screen.findByText(/The 25¢ minimum applies: 25% of this bounty/)).toBeInTheDocument()
    expect(screen.getByText('1.25 test USDC')).toBeInTheDocument()
  })

  it('refuses an amount over the cap before asking for anything', async () => {
    renderWithProviders(<FundBountyPanel status={status} onFunded={() => {}} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText('Amount the contributor receives'), '51')
    expect(await screen.findByRole('alert')).toHaveTextContent('capped at 50.00 test USDC')
  })

  it('locks the funds from the funder\'s own wallet, then waits for the chain', async () => {
    const w = registerFakeWallet({ name: 'Phantom', canSend: true })
    unregister = w.unregister
    vi.mocked(prepareFundedBounty).mockResolvedValue({
      bountyId: 'b1', escrow: 'E', transaction: btoa('tx'), amountMinor: '50000000', feeAmountMinor: '1250000', totalMinor: '51250000', decimals: 6, network: 'solana-devnet',
    })
    vi.mocked(confirmFundedBounty).mockResolvedValue({ bountyId: 'b1', state: 'funded', already: false })
    const onFunded = vi.fn()
    renderWithProviders(<FundBountyPanel status={status} onFunded={onFunded} onClose={() => {}} />)
    await userEvent.selectOptions(await screen.findByLabelText('Repository'), 'acme/widgets')
    await userEvent.type(screen.getByLabelText('Issue number'), '41')
    await userEvent.type(screen.getByLabelText('Amount the contributor receives'), '50')
    await userEvent.click(screen.getByRole('button', { name: /I'll assign it myself/ }))
    await userEvent.click(await screen.findByRole('button', { name: /Phantom/ }))
    const lock = screen.getByRole('button', { name: 'Lock the funds' })
    await waitFor(() => expect(lock).toBeEnabled())
    await userEvent.click(lock)
    await waitFor(() => expect(onFunded).toHaveBeenCalledWith('b1'))
    expect(prepareFundedBounty).toHaveBeenCalledWith(expect.objectContaining({ repo: 'acme/widgets', issueNumber: 41, amountMinor: '50000000', mode: 'self_assign', funderWallet: w.address }))
    expect(w.sent).toHaveLength(1)
    expect(w.sent[0]!.chain).toBe('solana:devnet')
    expect(confirmFundedBounty).toHaveBeenCalledWith('b1', expect.any(String))
  })
})
