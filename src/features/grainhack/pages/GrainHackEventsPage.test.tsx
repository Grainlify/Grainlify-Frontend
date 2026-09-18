import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { GrainHackEventsPage } from './GrainHackEventsPage'
import { getHackathons } from '../../../shared/api/client'

// Only calls getHackathons() (the public, unauthenticated list) and useTheme().
vi.mock('../../../shared/api/client', () => ({
  getHackathons: vi.fn(),
}))

const mockedGetHackathons = vi.mocked(getHackathons)

type Hackathon = Awaited<ReturnType<typeof getHackathons>>['hackathons'][number]

function makeHackathon(overrides: Partial<Hackathon> & Pick<Hackathon, 'id' | 'name'>): Hackathon {
  return {
    phase: 'issue_prep',
    announced_at: '2026-09-01T00:00:00.000Z',
    application_period_start: null,
    application_period_end: null,
    issue_prep_start: '2026-09-15T00:00:00.000Z',
    starts_at: null,
    ends_at: null,
    merge_grace_period_hours: 72,
    sponsor_total_usdc: '10',
    platform_fee_usdc: '2',
    platform_fee_rate_pct: '20',
    contributor_prize_pool: '8.000000',  // the shape the API actually returns
    maintainer_prize_pool: '2',
    net_pool_usdc: '10',
    created_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('GrainHackEventsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows a loading skeleton, then the fetched events', async () => {
    const event = makeHackathon({ id: 'hack-1', name: 'KeeperHub Base Sepolia Live Test' })
    mockedGetHackathons.mockResolvedValue({ hackathons: [event] })

    const { container } = renderWithProviders(<GrainHackEventsPage onEventClick={vi.fn()} />)

    expect(screen.getByText('Live events')).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText('KeeperHub Base Sepolia Live Test')).toBeInTheDocument()
    })
    expect(screen.getByText('Issue prep')).toBeInTheDocument()
    expect(screen.getByText('$8.00 contributor pool')).toBeInTheDocument()
    expect(mockedGetHackathons).toHaveBeenCalledTimes(1)
    expect(container.querySelectorAll('.animate-pulse').length).toBe(0)
  })

  it('shows the empty state when there are no events', async () => {
    mockedGetHackathons.mockResolvedValue({ hackathons: [] })

    renderWithProviders(<GrainHackEventsPage onEventClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('No GrainHack events yet')).toBeInTheDocument()
    })
  })

  // This used to assert the empty state on failure - "No GrainHack events
  // yet" while an event was live.
  it('says the events could not be loaded, not that there are none, and retries', async () => {
    mockedGetHackathons
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue({ hackathons: [makeHackathon({ id: 'h1', name: 'First GrainHack Event (Base Sepolia)' })] })

    renderWithProviders(<GrainHackEventsPage onEventClick={vi.fn()} />)

    expect(await screen.findByText("Couldn't load GrainHack events")).toBeInTheDocument()
    expect(screen.queryByText('No GrainHack events yet')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('First GrainHack Event (Base Sepolia)')).toBeInTheDocument()
  })

  it('calls onEventClick with the clicked event id and name', async () => {
    const event = makeHackathon({ id: 'hack-42', name: 'Autumn Sprint' })
    mockedGetHackathons.mockResolvedValue({ hackathons: [event] })
    const onEventClick = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<GrainHackEventsPage onEventClick={onEventClick} />)

    const row = await screen.findByText('Autumn Sprint')
    await user.click(row)

    expect(onEventClick).toHaveBeenCalledTimes(1)
    expect(onEventClick).toHaveBeenCalledWith('hack-42', 'Autumn Sprint')
  })

  it('renders events in the order the API returned them, with no client-side re-sort', async () => {
    const first = makeHackathon({ id: 'hack-a', name: 'Event A' })
    const second = makeHackathon({ id: 'hack-b', name: 'Event B' })
    mockedGetHackathons.mockResolvedValue({ hackathons: [first, second] })

    renderWithProviders(<GrainHackEventsPage onEventClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Event A')).toBeInTheDocument()
    })
    const names = screen.getAllByText(/^Event [AB]$/).map((el) => el.textContent)
    expect(names).toEqual(['Event A', 'Event B'])
  })
})
