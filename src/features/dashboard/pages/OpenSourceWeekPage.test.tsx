import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { OpenSourceWeekPage } from './OpenSourceWeekPage'
import { getOpenSourceWeekEvents } from '../../../shared/api/client'

// OpenSourceWeekPage only calls getOpenSourceWeekEvents() (plural - the public
// list endpoint) and useTheme(); it never touches useAuth(), so no withAuth /
// getAuthToken mocking is needed here (confirmed by reading the full source).
vi.mock('../../../shared/api/client', () => ({
  getOpenSourceWeekEvents: vi.fn(),
}))

const mockedGetOpenSourceWeekEvents = vi.mocked(getOpenSourceWeekEvents)

type EventsResponse = Awaited<ReturnType<typeof getOpenSourceWeekEvents>>
type ApiEvent = EventsResponse['events'][number]

// Mirror the component's own formatting helpers so assertions aren't sensitive to
// the test runner's locale/timezone.
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

function makeEvent(overrides: Partial<ApiEvent> & Pick<ApiEvent, 'id' | 'title'>): ApiEvent {
  return {
    description: null,
    location: 'Remote',
    status: 'upcoming',
    start_at: '2025-03-10T09:00:00.000Z',
    end_at: '2025-03-14T18:00:00.000Z',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('OpenSourceWeekPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows a loading skeleton, then the real fetched events once the fetch resolves', async () => {
    const eventA = makeEvent({
      id: 'evt-1',
      title: 'Spring Hack Week',
      status: 'upcoming',
      location: 'Remote',
    })
    const eventB = makeEvent({
      id: 'evt-2',
      title: 'Summer Sprint',
      status: 'running',
      location: null,
      start_at: '2025-06-01T09:00:00.000Z',
      end_at: '2025-06-05T18:00:00.000Z',
    })
    mockedGetOpenSourceWeekEvents.mockResolvedValue({ events: [eventA, eventB] })

    const { container } = renderWithProviders(<OpenSourceWeekPage onEventClick={vi.fn()} />)

    expect(screen.getByText('Open-Source Week')).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText('Spring Hack Week')).toBeInTheDocument()
    })
    expect(screen.getByText('Summer Sprint')).toBeInTheDocument()
    expect(screen.getByText('Upcoming')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByText('Remote')).toBeInTheDocument()
    // Falls back to 'TBA' when location is null.
    expect(screen.getByText('TBA')).toBeInTheDocument()
    expect(screen.getAllByText(fmtDate(eventA.start_at)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(fmtTime(eventA.start_at)).length).toBeGreaterThan(0)

    expect(mockedGetOpenSourceWeekEvents).toHaveBeenCalledTimes(1)
    expect(container.querySelectorAll('.animate-pulse').length).toBe(0)
  })

  it('shows the empty state when there are no events', async () => {
    mockedGetOpenSourceWeekEvents.mockResolvedValue({ events: [] })

    renderWithProviders(<OpenSourceWeekPage onEventClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('No Open-Source Week events yet')).toBeInTheDocument()
    })
    expect(
      screen.getByText('Once an admin creates an event, it will show up here.'),
    ).toBeInTheDocument()
  })

  it('falls back to the empty state instead of crashing when the fetch fails', async () => {
    mockedGetOpenSourceWeekEvents.mockRejectedValue(new Error('network down'))

    renderWithProviders(<OpenSourceWeekPage onEventClick={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('No Open-Source Week events yet')).toBeInTheDocument()
    })
  })

  it('calls onEventClick with the clicked event id and title', async () => {
    const event = makeEvent({ id: 'evt-99', title: 'Winter Jam', location: 'Berlin' })
    mockedGetOpenSourceWeekEvents.mockResolvedValue({ events: [event] })
    const onEventClick = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<OpenSourceWeekPage onEventClick={onEventClick} />)

    const title = await screen.findByText('Winter Jam')
    await user.click(title)

    expect(onEventClick).toHaveBeenCalledTimes(1)
    expect(onEventClick).toHaveBeenCalledWith('evt-99', 'Winter Jam')
  })
})
