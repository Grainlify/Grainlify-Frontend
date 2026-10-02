import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { Hero } from './Hero'
import { getLandingStats } from '../../../shared/api/client'
import { getBountyLedger } from '../../../shared/api/bountyAgent'

// Hero calls useLandingStats() for the stat grid, and the payout panel reads
// the bounty agent's public ledger.
vi.mock('../../../shared/api/client', () => ({
  getLandingStats: vi.fn(),
}))
vi.mock('../../../shared/api/bountyAgent', () => ({
  getBountyLedger: vi.fn(),
}))

const mockedGetLandingStats = vi.mocked(getLandingStats)
const mockedGetBountyLedger = vi.mocked(getBountyLedger)

const ledger = (paidMainnet: number, mainnetLive = true) =>
  ({
    status: { network: 'solana-mainnet', mainnetLive, inferenceMode: 'live', statusLine: '' },
    totals: {
      bountiesPosted: 1,
      bountiesPaidMainnet: paidMainnet,
      bountiesPaidTest: 0,
      inferenceCalls: 14,
      inferenceSpendMicro: 120756,
      inferenceCeilingMicro: 5000000,
      feesInMicro: null,
    },
    budget: [],
    events: [],
  }) as Awaited<ReturnType<typeof getBountyLedger>>

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

describe('Hero', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedGetLandingStats.mockResolvedValue({
      active_projects: 468,
      contributors: 2165,
      grants_distributed_usd: 0,
    })
    mockedGetBountyLedger.mockResolvedValue(ledger(0))
  })

  // The heading has been narrowed once (5ebdd2ef) and rewritten once since.
  // Both times the thing that mattered was the same: "Funded issues" scopes
  // the claim, and "them" refers back to it. Separated or dropped, the line
  // becomes the unscoped assertion that the whole platform runs a weighted
  // draw, when the draw is GrainHack-only. These assertions fail if that
  // happens, which a comment asking people not to would not.
  describe('the scoped claim in the heading', () => {
    it('names what the claim is about before making it', () => {
      renderWithProviders(<Hero />)
      const heading = norm(screen.getByRole('heading', { level: 1 }).textContent ?? '')

      expect(heading).toContain('Funded issues')
      expect(heading).toContain('them')

      // Scope first: the subject has to appear before the mechanism, so a
      // reader who stops at the first line has still been told the truth.
      expect(heading.indexOf('Funded issues')).toBeLessThan(heading.indexOf('weighted draw'))
    })

    it('does not lead with the unscoped draw claim', () => {
      renderWithProviders(<Hero />)
      const heading = norm(screen.getByRole('heading', { level: 1 }).textContent ?? '')

      // The exact shape 5ebdd2ef removed, and anything that opens on the
      // mechanism with no subject attached.
      expect(heading).not.toMatch(/^A weighted draw/i)
      expect(heading).not.toMatch(/^Assignment by weighted draw/i)
    })

    it('keeps both halves in one heading, split by an authored break', () => {
      renderWithProviders(<Hero />)
      const h1 = screen.getByRole('heading', { level: 1 })

      // The break is authored rather than left to the container. As a wrap it
      // would move with the font or the width, and the two halves of the
      // scoped claim would stop being a fixed pair.
      expect(h1.querySelectorAll('br')).toHaveLength(1)

      const strip = (html: string) => norm(html.replace(/<[^>]+>/g, ''))
      const [before, after] = h1.innerHTML.split(/<br\s*\/?>/i)
      expect(strip(before)).toBe("Funded issues aren't first-come")
      expect(strip(after)).toBe('A weighted draw assigns them')
    })
  })

  it('says which chain pays what, and only what has happened', async () => {
    renderWithProviders(<Hero />)
    await waitFor(() => expect(screen.getByText('Live. No bounty has been paid yet.')).toBeInTheDocument())

    const panel = norm(screen.getByLabelText('Where payouts happen today').textContent ?? '')
    // GrainHack: the one event paid on testnet, and nothing on mainnet.
    expect(panel).toContain('Base Sepolia testnet')
    expect(panel).toContain('paid 4 USDC each on the testnet')
    expect(panel).toContain('No GrainHack payout has been made on mainnet yet')
    // Bounties: Solana mainnet, USDC.
    expect(panel).toContain('Solana mainnet · USDC')
    // Aptos: built, not live.
    expect(panel).toContain('Built, not live')
    // Stellar has never paid anything, and the old screenshot is gone.
    expect(norm(document.body.textContent ?? '')).not.toMatch(/Stellar/i)
    expect(document.querySelector('img[src*="bounties-open"]')).toBeNull()
  })

  it('reads the bounty payout count from the ledger, so it changes when a bounty is paid', async () => {
    mockedGetBountyLedger.mockResolvedValue(ledger(2))
    renderWithProviders(<Hero />)
    await waitFor(() => expect(screen.getByText('Live. 2 bounties paid so far.')).toBeInTheDocument())
    expect(screen.queryByText(/No bounty has been paid yet/)).not.toBeInTheDocument()
  })

  it('does not guess the bounty count when the ledger cannot be read', async () => {
    mockedGetBountyLedger.mockRejectedValue(new Error('down'))
    renderWithProviders(<Hero />)
    await waitFor(() => expect(screen.getByText(/payout count could not be loaded/)).toBeInTheDocument())
    expect(screen.queryByText(/No bounty has been paid yet/)).not.toBeInTheDocument()
  })

  it('labels the two figures as what the API counts, and drops the hard-coded grants tile', async () => {
    renderWithProviders(<Hero />)
    await waitFor(() => expect(screen.getByText('468')).toBeInTheDocument())
    expect(screen.getByText('Verified projects listed')).toBeInTheDocument()
    expect(screen.getByText('GitHub contributors to those projects')).toBeInTheDocument()
    // /stats/landing returns grants_distributed_usd: 0 from a constant - no
    // grants table exists - so the figure measured nothing.
    expect(screen.queryByText('Grants Distributed')).not.toBeInTheDocument()
    expect(screen.queryByText('$0')).not.toBeInTheDocument()
    expect(screen.queryByText(/Projects Funded|Active Projects/)).not.toBeInTheDocument()
  })

  it('links the rules to the docs on this site, not the retired docs host', () => {
    renderWithProviders(<Hero />)
    expect(screen.getByRole('link', { name: 'Read the rules' })).toHaveAttribute('href', '/docs/contributors/grainhack')
  })
})
