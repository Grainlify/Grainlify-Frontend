import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { LandingPage } from './LandingPage'
import { getLandingStats } from '../../../shared/api/client'
import { ApiError } from '../../../shared/api/apiError'
import { getBountyLedger } from '../../../shared/api/bountyAgent'

// LandingPage itself fetches nothing directly, but two of the sections it
// renders (Hero and WhyChooseUs) each call the shared useLandingStats() hook,
// which in turn calls getLandingStats() - confirmed by reading LandingPage.tsx,
// Hero.tsx, WhyChooseUs (inside LandingPage.tsx), and useLandingStats.ts.
// LandingPage also renders Navbar, which calls useAuth() - that requires an
// AuthProvider ancestor and AuthContext's checkAuth() reads getAuthToken()
// unconditionally on mount, so this suite renders with `withAuth: true` and the
// client mock below covers every export the mounted tree actually touches
// (confirmed by reading Navbar.tsx and AuthContext.tsx). No token is ever
// placed in localStorage, so checkAuth()'s `if (token)` branch is never
// entered and getCurrentUser() is never called.
vi.mock('../../../shared/api/client', () => ({
  getLandingStats: vi.fn(),
  getAuthToken: vi.fn(() => null),
  setAuthToken: vi.fn(),
  removeAuthToken: vi.fn(),
  getCurrentUser: vi.fn(),
}))

// The payout panel, the Bounties section, Built/Planned and the right-hand
// tiles all read the bounty agent's public ledger, through one provider.
vi.mock('../../../shared/api/bountyAgent', () => ({
  getBountyLedger: vi.fn(),
}))

const mockedGetLandingStats = vi.mocked(getLandingStats)
const mockedGetBountyLedger = vi.mocked(getBountyLedger)

const ledger = (paidMainnet: number) =>
  ({
    status: { network: 'solana-mainnet', mainnetLive: true, inferenceMode: 'live', statusLine: '' },
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

const STUB_STATS = {
  active_projects: 1,
  contributors: 1,
  grants_distributed_usd: 1,
}

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetBountyLedger.mockResolvedValue(ledger(0))
  })

  it('renders the hero and main sections, replacing the placeholder dashes with the real fetched stats', async () => {
    mockedGetLandingStats.mockResolvedValue({
      active_projects: 342,
      contributors: 15890,
      grants_distributed_usd: 1250000,
    })

    renderWithProviders(<LandingPage />, { withAuth: true })

    expect(screen.getByText(/assign work by a weighted\s+draw, under rules published before anyone applies/i)).toBeInTheDocument()
    expect(screen.getByText('Not Tied to One Network')).toBeInTheDocument()
    expect(screen.getByText('Bounties, run by an agent')).toBeInTheDocument()
    // The mechanism and the built/planned split are what the page leads with
    // for a reviewer; if either disappears the page is a feature list again.
    expect(screen.getByText('How a GrainHack event allocates')).toBeInTheDocument()
    expect(screen.getByText('Built, and planned')).toBeInTheDocument()
    // The status note tracks what has actually happened: one event ran on
    // the Base Sepolia testnet and its contributors were paid there.
    expect(screen.getByText(/The first GrainHack event has run, on the Base Sepolia testnet/i)).toBeInTheDocument()
    expect(screen.queryByText(/have not been sent|not sent yet/i)).not.toBeInTheDocument()
    const status = screen.getByText('Built, and planned').closest('section')?.textContent ?? ''
    expect(status).toContain('judged accepted')
    expect(status).toMatch(/paid 4 USDC each on that\s+testnet/)
    expect(status).toMatch(/No GrainHack payout has been made on mainnet/)
    // Soroban is not built: its configuration was deleted.
    expect(status).not.toMatch(/Soroban/)
    expect(screen.getByText('Everything You Need to Succeed')).toBeInTheDocument()
    expect(screen.getByText('How It Works')).toBeInTheDocument()
    expect(screen.getByText('Why Choose Grainlify?')).toBeInTheDocument()
    // No testimonials section: the quotes it carried were invented, and the
    // page must not claim social proof the platform has not earned.
    expect(screen.queryByText('What Builders Say')).not.toBeInTheDocument()
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument()

    // Placeholder dashes render before the two independent useLandingStats()
    // fetches (one in Hero, one in WhyChooseUs) resolve.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getAllByText('342').length).toBeGreaterThan(0)
    })
    // contributors and active_projects each render twice (Hero's stat grid and
    // WhyChooseUs's summary tiles). grants_distributed_usd is not shown at
    // all: the API hard-codes it to 0.
    expect(screen.queryByText('$1,250,000')).not.toBeInTheDocument()
    expect(screen.getAllByText('15,890').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('—').length).toBe(0)
  })

  it('makes none of the claims it used to make without backing', async () => {
    mockedGetLandingStats.mockResolvedValue(STUB_STATS)
    renderWithProviders(<LandingPage />, { withAuth: true })
    await waitFor(() => expect(screen.getAllByText('Live. No bounty has been paid yet.').length).toBeGreaterThan(0))

    const body = document.body.textContent ?? ''
    for (const gone of [
      /98%/, /Satisfaction Rate/, /24\/7/, /Support Available/, /\+45%/, /Growing Ecosystem/,
      /Grants Distributed/, /Projects Funded/, /Active Users/, /Stellar/, /Soroban/, /points balance/,
      /Monthly Hackathons/, /mentorship/i, /grant distribution/i,
    ]) {
      expect(body, String(gone)).not.toMatch(gone)
    }
    // No link to the retired docs host, or to raw JSON.
    const hrefs = [...document.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '')
    expect(hrefs.filter((h) => h.includes('docs.grainlify.com') || h.includes('api.grainlify.com'))).toEqual([])
  })

  it('moves the first bounty payout from Planned to Built once the ledger shows one', async () => {
    mockedGetLandingStats.mockResolvedValue(STUB_STATS)
    mockedGetBountyLedger.mockResolvedValue(ledger(1))
    renderWithProviders(<LandingPage />, { withAuth: true })
    await waitFor(() => expect(screen.getByText('1 bounty paid in USDC on Solana mainnet')).toBeInTheDocument())
    expect(screen.queryByText('The first bounty payout on Solana mainnet')).not.toBeInTheDocument()
  })

  it('lists the first bounty payout as planned while the ledger shows none', async () => {
    mockedGetLandingStats.mockResolvedValue(STUB_STATS)
    renderWithProviders(<LandingPage />, { withAuth: true })
    await waitFor(() => expect(screen.getByText('The first bounty payout on Solana mainnet')).toBeInTheDocument())
  })

  it('links the Bounties section to the Bounties page, which signs a visitor in first', async () => {
    mockedGetLandingStats.mockResolvedValue(STUB_STATS)
    renderWithProviders(<LandingPage />, { withAuth: true })
    expect(screen.getByRole('link', { name: /See open bounties/ })).toHaveAttribute('href', '/dashboard?tab=bounties')
    expect(screen.getAllByRole('link', { name: 'The bounty rules' })[0]).toHaveAttribute('href', '/bounties/rules')
    await waitFor(() => expect(mockedGetLandingStats).toHaveBeenCalled())
  })

  it('says the stats are unavailable, instead of leaving the loading dash up forever, when the stats fetch fails', async () => {
    mockedGetLandingStats.mockRejectedValue(
      new ApiError('internal_error', 500, { error: 'internal_error' }),
    )

    renderWithProviders(<LandingPage />, { withAuth: true })

    await waitFor(() => {
      expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0)
    })
    expect(screen.queryAllByText('—').length).toBe(0)
  })

  it('renders Get Started links that point to /signin', async () => {
    mockedGetLandingStats.mockResolvedValue(STUB_STATS)

    renderWithProviders(<LandingPage />, { withAuth: true })

    const links = screen.getAllByRole('link', { name: /get started/i })
    expect(links.length).toBeGreaterThan(0)
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', '/signin')
    })

    await waitFor(() => {
      expect(mockedGetLandingStats).toHaveBeenCalled()
    })
  })

  it('renders in both light and dark theme without crashing', async () => {
    mockedGetLandingStats.mockResolvedValue(STUB_STATS)

    const { unmount } = renderWithProviders(<LandingPage />, { theme: 'light', withAuth: true })
    expect(screen.getByText('Everything You Need to Succeed')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockedGetLandingStats).toHaveBeenCalled()
    })
    unmount()

    renderWithProviders(<LandingPage />, { theme: 'dark', withAuth: true })
    expect(screen.getByText('Everything You Need to Succeed')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockedGetLandingStats).toHaveBeenCalled()
    })
  })
})
