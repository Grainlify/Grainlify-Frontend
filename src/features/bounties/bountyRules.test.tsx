import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { BountyRulesPage } from './pages/BountyRulesPage'
import { getBountyRules, type BountyRules } from '../../shared/api/bountyAgent'

vi.mock('../../shared/api/bountyAgent', async (orig) => {
  const real = await orig<typeof import('../../shared/api/bountyAgent')>()
  return { ...real, getBountyRules: vi.fn() }
})

const rules = (over: Partial<BountyRules> = {}): BountyRules => ({
  status: { network: 'solana-mainnet', mainnetLive: true, inferenceMode: 'live', statusLine: '' },
  structural: {
    priorCompletionCap: 2,
    priorCompletionCapNote: 'It is a constant in the code, not a setting, so nobody can raise it mid-programme.',
    neverWeighted: ['follower count', 'stars', 'merge rate', 'how well the application is written'],
    neverWeightedNote: 'They are absent by omission: there is no code path in the draw that can read them.',
  },
  sections: ['Weights'],
  settings: [
    { key: 'weight_fit_strong', type: 'float', section: 'Weights', description: 'Strong match.', default: '2.0', value: '2.0', overridden: false, updatedAt: null, updatedBy: null },
    { key: 'weight_fit_weak', type: 'float', section: 'Weights', description: 'Weak match.', default: '0.25', value: '0.4', overridden: true, updatedAt: '2026-09-27T10:00:00Z', updatedBy: 'Jagadeeshftw' },
  ],
  ...over,
})

beforeEach(() => vi.resetAllMocks())

describe('the published bounty rules', () => {
  it('shows every weight with its live value', async () => {
    vi.mocked(getBountyRules).mockResolvedValue(rules())
    renderWithProviders(<BountyRulesPage />)
    expect(await screen.findByText('weight_fit_strong')).toBeInTheDocument()
    expect(screen.getByText('2.0')).toBeInTheDocument()
  })

  it('shows a changed weight as changed, with the default and who changed it', async () => {
    // A weight that moved and looks like it was always that way is the thing
    // that makes a result arguable instead of answerable.
    vi.mocked(getBountyRules).mockResolvedValue(rules())
    renderWithProviders(<BountyRulesPage />)
    expect(await screen.findByText(/changed from the default of 0.25 by Jagadeeshftw/i)).toBeInTheDocument()
  })

  it('headlines the prior-win cap and says it is not a setting', async () => {
    vi.mocked(getBountyRules).mockResolvedValue(rules())
    renderWithProviders(<BountyRulesPage />)
    expect(await screen.findByText(/prior wins are capped at 2/i)).toBeInTheDocument()
    expect(screen.getByText(/not a setting/i)).toBeInTheDocument()
  })

  it('lists what the draw cannot see', async () => {
    vi.mocked(getBountyRules).mockResolvedValue(rules())
    renderWithProviders(<BountyRulesPage />)
    expect(await screen.findByText(/what the draw cannot see/i)).toBeInTheDocument()
    expect(screen.getByText('follower count')).toBeInTheDocument()
    expect(screen.getByText(/no code path in the draw that can read them/i)).toBeInTheDocument()
  })

  it('says the values are live rather than a copy', async () => {
    vi.mocked(getBountyRules).mockResolvedValue(rules())
    renderWithProviders(<BountyRulesPage />)
    expect(await screen.findByText(/reads them from the service that runs the draw, not from a copy/i)).toBeInTheDocument()
  })

  it('reports a failure instead of showing an empty rulebook', async () => {
    vi.mocked(getBountyRules).mockRejectedValue(new Error('agent down'))
    renderWithProviders(<BountyRulesPage />)
    expect(await screen.findByText(/bounty rules/i)).toBeInTheDocument()
  })
})
