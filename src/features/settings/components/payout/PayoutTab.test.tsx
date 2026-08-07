import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '../../../../test/renderWithProviders'
import { BillingProfilesProvider } from '../../contexts/BillingProfilesContext'
import { PayoutTab } from './PayoutTab'

const mockGetProjectsContributed = vi.fn()
vi.mock('../../../../shared/api/client', () => ({
  getProjectsContributed: (...args: unknown[]) => mockGetProjectsContributed(...args),
}))

vi.mock('lucide-react', () => ({
  Info: () => null,
}))

function renderPayoutTab(options?: Parameters<typeof renderWithProviders>[1]) {
  return renderWithProviders(
    <BillingProfilesProvider>
      <PayoutTab />
    </BillingProfilesProvider>,
    options
  )
}

// getProjectsContributed() is the one real backend call this tab makes; the
// billing-profile-to-project mapping itself is local-only state (handleSave
// just console.logs a TODO, per the source), so it isn't exercised here.
const PROJECTS = [
  {
    id: 'p1',
    github_full_name: 'acme/widgets',
    status: 'active',
    ecosystem_name: 'Stellar',
    language: 'TypeScript',
  },
  {
    id: 'p2',
    github_full_name: 'acme/gears',
    status: 'active',
  },
]

describe('PayoutTab', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows a loading state while getProjectsContributed is pending', async () => {
    let resolveFetch: (value: typeof PROJECTS) => void = () => {}
    mockGetProjectsContributed.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      })
    )

    renderPayoutTab()
    // The real header copy only renders once loading finishes; a skeleton stands in for it.
    expect(screen.queryByText('Payout preferences')).not.toBeInTheDocument()

    resolveFetch(PROJECTS)
    expect(await screen.findByText('Payout preferences')).toBeInTheDocument()
  })

  it('renders fetched projects without crashing', async () => {
    mockGetProjectsContributed.mockResolvedValue(PROJECTS)
    renderPayoutTab()

    await waitFor(() => expect(mockGetProjectsContributed).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('widgets')).toBeInTheDocument()
    expect(screen.getByText('gears')).toBeInTheDocument()
    expect(screen.getByText('Stellar')).toBeInTheDocument()
  })

  it('shows an empty state when there are no contributed projects', async () => {
    mockGetProjectsContributed.mockResolvedValue([])
    renderPayoutTab()

    expect(await screen.findByText('No projects found')).toBeInTheDocument()
  })

  it('does not crash and shows an inline error when the fetch fails', async () => {
    mockGetProjectsContributed.mockRejectedValueOnce(new Error('network error'))
    renderPayoutTab()

    expect(
      await screen.findByText('Failed to load projects. Please try again later.')
    ).toBeInTheDocument()
    expect(screen.getByText('No projects found')).toBeInTheDocument()
  })

  it('only offers verified billing profiles (from BillingProfilesContext) in the dropdown', async () => {
    localStorage.setItem(
      'billing_profiles',
      JSON.stringify([
        { id: 1, name: 'My Verified Profile', type: 'individual', status: 'verified' },
        { id: 2, name: 'Unverified Profile', type: 'individual', status: 'missing-verification' },
      ])
    )
    mockGetProjectsContributed.mockResolvedValue(PROJECTS)
    renderPayoutTab()

    await screen.findByText('widgets')
    // Both project rows render their own <select>, so the profile option appears once per row.
    expect(screen.getAllByRole('option', { name: 'My Verified Profile' }).length).toBe(PROJECTS.length)
    expect(screen.queryAllByRole('option', { name: 'Unverified Profile' })).toHaveLength(0)
  })
})
