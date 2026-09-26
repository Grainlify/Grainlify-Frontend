import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { BountyDrawControls } from './BountyDrawControls'
import { getBounties, type PublicBounty } from '../../../shared/api/bountyAgent'
import { getBountyDrawState, getDrawSettings, resetDrawSetting, runBountyDraw, setDrawSetting, type DrawResultView } from '../../../shared/api/client'

vi.mock('../../../shared/api/bountyAgent', async (orig) => {
  const real = await orig<typeof import('../../../shared/api/bountyAgent')>()
  return { ...real, getBounties: vi.fn() }
})
vi.mock('../../../shared/api/client', async (orig) => {
  const real = await orig<typeof import('../../../shared/api/client')>()
  return { ...real, getDrawSettings: vi.fn(), setDrawSetting: vi.fn(), resetDrawSetting: vi.fn(), getBountyDrawState: vi.fn(), runBountyDraw: vi.fn() }
})

const setting = (o: Partial<Parameters<typeof settingOf>[0]> = {}) => settingOf(o)
function settingOf(o: Record<string, unknown>) {
  return {
    key: 'application_window_hours', type: 'int' as const, section: 'Window',
    description: 'How long applications stay open.', default: '6', value: '6',
    overridden: false, updatedAt: null, updatedBy: null, ...o,
  }
}

const bounty = (o: Partial<PublicBounty> = {}): PublicBounty => ({
  id: 'b1', repo: 'Grainlify/sandbox', issueNumber: 7, issueTitle: 't',
  issueUrl: 'u', amountMinor: '1000000', decimals: 6, currency: 'USDC', network: 'solana-mainnet',
  status: 'posted', postedAt: '2026-09-27T09:00:00.000Z', payout: null, isTest: false, waivedRules: [],
  applicationsOpenAt: null, applicationsCloseAt: null, applicationState: 'closed', assignedTo: null, assignmentStaleAt: null, applicantBucket: null, applicantCount: null, reservedForNewcomers: false, ...o,
})

const drawResult: DrawResultView = {
  drawId: 'd1', seed: 12345, simulation: false, triggeredBy: 'Jagadeeshftw', poolSize: 2,
  pool: [
    { githubLogin: 'alice', githubUserId: 1, fit: 'strong', tickets: 3, weights: { fit_strong: 2, first_ever_application: 1.5 }, share: 0.75 },
    { githubLogin: 'bob', githubUserId: 2, fit: 'plausible', tickets: 1, weights: { fit_plausible: 1 }, share: 0.25 },
  ],
  winner: { githubLogin: 'alice', githubUserId: 1, tickets: 3 },
  firstComeFallback: false, noWinnerReason: null, assignmentId: 'a1', staleAt: '2026-09-30T10:00:00.000Z',
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getDrawSettings).mockResolvedValue({ settings: [setting()] })
  vi.mocked(getBounties).mockResolvedValue({ status: { network: 'solana-mainnet', mainnetLive: true, inferenceMode: 'live', statusLine: '' }, bounties: [bounty()] })
  vi.mocked(getBountyDrawState).mockResolvedValue({
    applications: {
      total: 2, eligible: 2, refused: 0,
      fitCost: { assessed: 2, totalMicro: 4062, perApplicationMicro: 2031 },
      applications: [
        { githubLogin: 'alice', githubUserId: 1, status: 'applied', gateFailureReason: null, fit: 'strong', difficultyMatch: 'matched', fitEvidence: 'Three TypeScript repos.', fitConcerns: [], fitCostMicro: 2031, appliedAt: 'x' },
        { githubLogin: 'bob', githubUserId: 2, status: 'applied', gateFailureReason: null, fit: 'plausible', difficultyMatch: 'matched', fitEvidence: null, fitConcerns: ['instruction_injection_attempt'], fitCostMicro: 2031, appliedAt: 'x' },
      ],
    },
    draws: [],
  })
})

describe('running a draw by hand', () => {
  it('asks for confirmation before assigning anyone', async () => {
    renderWithProviders(<BountyDrawControls />)
    await userEvent.selectOptions(await screen.findByLabelText('Bounty'), 'b1')
    await userEvent.click(screen.getByRole('button', { name: 'Run draw now' }))

    // Nothing has run yet: a draw assigns a real person to real money.
    expect(vi.mocked(runBountyDraw)).not.toHaveBeenCalled()
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(/cannot be undone from here/i)

    await userEvent.click(screen.getByRole('button', { name: 'Yes, run the draw' }))
    expect(vi.mocked(runBountyDraw)).toHaveBeenCalledWith('b1', false)
  })

  it('can be cancelled without running', async () => {
    renderWithProviders(<BountyDrawControls />)
    await userEvent.selectOptions(await screen.findByLabelText('Bounty'), 'b1')
    await userEvent.click(screen.getByRole('button', { name: 'Run draw now' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(vi.mocked(runBountyDraw)).not.toHaveBeenCalled()
  })

  it('shows the ticket breakdown after it runs', async () => {
    vi.mocked(runBountyDraw).mockResolvedValue(drawResult)
    renderWithProviders(<BountyDrawControls />)
    await userEvent.selectOptions(await screen.findByLabelText('Bounty'), 'b1')
    await userEvent.click(screen.getByRole('button', { name: 'Run draw now' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, run the draw' }))

    expect(await screen.findByText(/winner: alice/i)).toBeInTheDocument()
    // The seed and the shares ARE the explanation; storing them and not
    // showing them is how a result becomes something to argue about.
    expect(screen.getByText(/seed 12345/i)).toBeInTheDocument()
    expect(screen.getByText('75.0%')).toBeInTheDocument()
    expect(screen.getByText(/fit_strong ×2, first_ever_application ×1.5/)).toBeInTheDocument()
  })

  it('simulates without assigning anyone, and says so', async () => {
    vi.mocked(runBountyDraw).mockResolvedValue({ ...drawResult, simulation: true, winner: null, assignmentId: null, staleAt: null })
    renderWithProviders(<BountyDrawControls />)
    await userEvent.selectOptions(await screen.findByLabelText('Bounty'), 'b1')
    await userEvent.click(screen.getByRole('button', { name: 'Simulate' }))
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(/nobody will be assigned/i)
    await userEvent.click(screen.getByRole('button', { name: 'Yes, simulate' }))

    expect(vi.mocked(runBountyDraw)).toHaveBeenCalledWith('b1', true)
    expect(await screen.findByText(/simulated draw/i)).toBeInTheDocument()
    expect(screen.queryByText(/^Winner:/)).not.toBeInTheDocument()
  })

  it('reports what the fit assessment cost, per application and in total', async () => {
    renderWithProviders(<BountyDrawControls />)
    await userEvent.selectOptions(await screen.findByLabelText('Bounty'), 'b1')
    expect(await screen.findByText(/2 assessed/i)).toBeInTheDocument()
    expect(screen.getByText(/\$0.002031 per application/i)).toBeInTheDocument()
    expect(screen.getByText(/same lifetime inference budget/i)).toBeInTheDocument()
  })

  it('shows the fit verdict and any concern the model raised', async () => {
    renderWithProviders(<BountyDrawControls />)
    await userEvent.selectOptions(await screen.findByLabelText('Bounty'), 'b1')
    expect(await screen.findByText(/fit strong/i)).toBeInTheDocument()
    expect(screen.getByText(/instruction_injection_attempt/i)).toBeInTheDocument()
    expect(screen.getByText('Three TypeScript repos.')).toBeInTheDocument()
  })

  it('shows application counts, which the public page shows only coarsely', async () => {
    renderWithProviders(<BountyDrawControls />)
    await userEvent.selectOptions(await screen.findByLabelText('Bounty'), 'b1')
    expect(await screen.findByText(/2 applied · 2 in the pool · 0 refused/i)).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
  })
})

describe('changing the settings', () => {
  it('saves a changed value and shows it as an override', async () => {
    vi.mocked(setDrawSetting).mockResolvedValue({ ok: true, settings: [setting({ value: '12', overridden: true, updatedBy: 'Jagadeeshftw' })] })
    renderWithProviders(<BountyDrawControls />)
    const field = await screen.findByLabelText('application_window_hours')
    await userEvent.clear(field)
    await userEvent.type(field, '12')
    await userEvent.tab()

    expect(vi.mocked(setDrawSetting)).toHaveBeenCalledWith('application_window_hours', '12')
    expect(await screen.findByText(/overridden \(default 6\) by Jagadeeshftw/i)).toBeInTheDocument()
  })

  it('offers reset only on a setting that is actually overridden', async () => {
    renderWithProviders(<BountyDrawControls />)
    await screen.findByLabelText('application_window_hours')
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
  })

  it('clears an override back to the coded default', async () => {
    vi.mocked(getDrawSettings).mockResolvedValue({ settings: [setting({ value: '12', overridden: true })] })
    vi.mocked(resetDrawSetting).mockResolvedValue({ ok: true, settings: [setting()] })
    renderWithProviders(<BountyDrawControls />)
    await userEvent.click(await screen.findByRole('button', { name: 'Reset' }))
    expect(vi.mocked(resetDrawSetting)).toHaveBeenCalledWith('application_window_hours')
  })

  it('reports a refused value instead of pretending it saved', async () => {
    vi.mocked(setDrawSetting).mockRejectedValue(new Error('must be at least 1'))
    renderWithProviders(<BountyDrawControls />)
    const field = await screen.findByLabelText('application_window_hours')
    await userEvent.clear(field)
    await userEvent.type(field, '0')
    await userEvent.tab()
    expect(await screen.findByRole('alert')).toHaveTextContent(/must be at least 1/i)
  })
})
