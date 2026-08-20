import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { ApplicationSignalsPanel } from './ApplicationSignalsPanel'

const mockGetHackathonApplicationSignals = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getHackathonApplicationSignals: (...args: unknown[]) => mockGetHackathonApplicationSignals(...args),
}))

const FULL_SIGNALS = {
  repo_created_at: { computed: true, value: '2024-01-15T00:00:00Z' },
  had_commits_before_announced: { computed: true, value: true },
  commit_activity_90d: { computed: true, value: 42 },
  distinct_contributors: { computed: true, value: 7 },
  prior_grainhack_participation: { computed: true, value: [] },
  median_time_to_first_review_hours: { computed: true, value: 5.25 },
  prior_flagged_associations: { computed: false, note: 'Not available in this slice.' },
}

describe('ApplicationSignalsPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads signals on mount for the given application and formats each value type', async () => {
    mockGetHackathonApplicationSignals.mockResolvedValue(FULL_SIGNALS)

    renderWithProviders(<ApplicationSignalsPanel applicationId="app-1" />)

    await waitFor(() => expect(mockGetHackathonApplicationSignals).toHaveBeenCalledWith('app-1', false))
    expect(await screen.findByText('Yes')).toBeInTheDocument() // had_commits_before_announced
    expect(screen.getByText('42')).toBeInTheDocument() // commit_activity_90d
    expect(screen.getByText('5.3h')).toBeInTheDocument() // median_time_to_first_review_hours
    expect(screen.getByText('None')).toBeInTheDocument() // empty prior_grainhack_participation array
    expect(screen.getByText('Not available in this slice.')).toBeInTheDocument() // not computed
  })

  // The loading branch had no test at all, so replacing the spinner with a
  // skeleton left the suite green while saying nothing about the change -
  // exactly the shape VERIFICATION-TRAPS.md calls "a test that keeps passing
  // for a different reason", except here there was no test to keep passing.
  //
  // Asserting the ROW COUNT rather than just presence is the point. A spinner
  // and a skeleton both satisfy "something rendered while loading"; only the
  // count distinguishes a placeholder that promises this list's shape from one
  // that promises a shape in general. If SIGNAL_LABELS gains a key and the
  // skeleton stops matching it, this fails.
  it('renders a skeleton row per signal while loading, not a bare spinner', async () => {
    let resolve!: (v: unknown) => void
    mockGetHackathonApplicationSignals.mockReturnValue(new Promise((r) => { resolve = r }))

    const { container } = renderWithProviders(<ApplicationSignalsPanel applicationId="app-1" />)

    const busy = screen.getByLabelText('Loading signals')
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('.animate-spin')).toBeNull()

    // Seven signals in SIGNAL_LABELS, two skeleton bars each (label + value).
    const grid = busy.querySelector('.grid')
    expect(grid?.children).toHaveLength(Object.keys(FULL_SIGNALS).length)

    resolve(FULL_SIGNALS)
    expect(await screen.findByText('42')).toBeInTheDocument()
    expect(screen.queryByLabelText('Loading signals')).toBeNull()
  })

  it('shows an error message when the signals call fails', async () => {
    mockGetHackathonApplicationSignals.mockRejectedValue(new Error('github_rate_limited'))

    renderWithProviders(<ApplicationSignalsPanel applicationId="app-1" />)

    expect(await screen.findByText('github_rate_limited')).toBeInTheDocument()
  })

  it('the refresh button re-fetches with refresh=true', async () => {
    mockGetHackathonApplicationSignals.mockResolvedValue(FULL_SIGNALS)
    const user = userEvent.setup()

    renderWithProviders(<ApplicationSignalsPanel applicationId="app-1" />)
    await screen.findByText('Auto-collected signals')

    await user.click(screen.getByTitle('Refresh signals'))

    await waitFor(() => expect(mockGetHackathonApplicationSignals).toHaveBeenCalledWith('app-1', true))
    expect(mockGetHackathonApplicationSignals).toHaveBeenCalledTimes(2)
  })
})
