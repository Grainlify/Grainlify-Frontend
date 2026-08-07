import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { OpenSourceWeekDetailPage } from './OpenSourceWeekDetailPage'
import { getOpenSourceWeekEvent } from '../../../shared/api/client'

// OpenSourceWeekDetailPage only calls getOpenSourceWeekEvent(id) (singular - the
// public detail endpoint) and useTheme(); it never touches useAuth(), so no
// withAuth / getAuthToken mocking is needed (confirmed by reading the full source).
vi.mock('../../../shared/api/client', () => ({
  getOpenSourceWeekEvent: vi.fn(),
}))

const mockedGetOpenSourceWeekEvent = vi.mocked(getOpenSourceWeekEvent)

type EventResponse = Awaited<ReturnType<typeof getOpenSourceWeekEvent>>
type ApiEvent = EventResponse['event']

// Mirror the component's own formatting helpers so assertions aren't sensitive to
// the test runner's locale/timezone.
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

function makeEvent(overrides: Partial<ApiEvent> = {}): ApiEvent {
  return {
    id: 'evt-42',
    title: 'Fall Fest',
    description: 'Three days of focused contribution sprints.',
    location: 'Lagos',
    status: 'upcoming',
    start_at: '2025-10-10T09:00:00.000Z',
    end_at: '2025-10-12T18:00:00.000Z',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('OpenSourceWeekDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetches the event using the given eventId and renders the real fetched details', async () => {
    const event = makeEvent()
    mockedGetOpenSourceWeekEvent.mockResolvedValue({ event })

    renderWithProviders(
      <OpenSourceWeekDetailPage eventId="evt-42" eventName="Fallback Name" onBack={vi.fn()} />,
    )

    expect(screen.getByText('Back to Open-Source Week')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Fall Fest')).toBeInTheDocument()
    })
    expect(
      screen.getByText('Three days of focused contribution sprints.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Lagos')).toBeInTheDocument()
    expect(screen.getByText(fmtDate(event.start_at))).toBeInTheDocument()
    expect(screen.getByText(fmtTime(event.start_at))).toBeInTheDocument()
    expect(screen.getByText(fmtDate(event.end_at))).toBeInTheDocument()
    expect(screen.getByText(fmtTime(event.end_at))).toBeInTheDocument()

    expect(mockedGetOpenSourceWeekEvent).toHaveBeenCalledWith('evt-42')
  })

  it('falls back to the eventName prop when the fetched event has no title', async () => {
    mockedGetOpenSourceWeekEvent.mockResolvedValue({ event: makeEvent({ title: '' }) })

    renderWithProviders(
      <OpenSourceWeekDetailPage eventId="evt-42" eventName="Legacy Event Name" onBack={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Legacy Event Name')).toBeInTheDocument()
    })
  })

  it('falls back to TBA and the default description when those fields are null', async () => {
    mockedGetOpenSourceWeekEvent.mockResolvedValue({
      event: makeEvent({ location: null, description: null }),
    })

    renderWithProviders(
      <OpenSourceWeekDetailPage eventId="evt-42" eventName="Fallback Name" onBack={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByText('TBA')).toBeInTheDocument()
    })
    expect(
      screen.getByText('Details will appear here once the admin configures this event.'),
    ).toBeInTheDocument()
  })

  it('shows the error message instead of crashing when the fetch fails', async () => {
    mockedGetOpenSourceWeekEvent.mockRejectedValue(new Error('network down'))

    renderWithProviders(
      <OpenSourceWeekDetailPage eventId="evt-42" eventName="Fallback Name" onBack={vi.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByText('network down')).toBeInTheDocument()
    })
  })

  it('calls onBack when the back button is clicked', async () => {
    mockedGetOpenSourceWeekEvent.mockResolvedValue({ event: makeEvent() })
    const onBack = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <OpenSourceWeekDetailPage eventId="evt-42" eventName="Fallback Name" onBack={onBack} />,
    )

    await user.click(screen.getByText('Back to Open-Source Week'))

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
