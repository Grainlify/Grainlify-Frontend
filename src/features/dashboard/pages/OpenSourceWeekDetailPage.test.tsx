import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'
import { OpenSourceWeekDetailPage } from './OpenSourceWeekDetailPage'
import { getOpenSourceWeekEvent } from '../../../shared/api/client'

// Mock the API client
vi.mock('../../../shared/api/client', () => ({
  getOpenSourceWeekEvent: vi.fn(),
}))

const mockOnBack = vi.fn()
const eventId = 'test-event-id'
const eventName = 'Initial Event Name'

const renderPage = () =>
  render(
    <ThemeProvider>
      <OpenSourceWeekDetailPage eventId={eventId} eventName={eventName} onBack={mockOnBack} />
    </ThemeProvider>
  )

describe('OpenSourceWeekDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows skeletons while loading', async () => {
    ;(getOpenSourceWeekEvent as any).mockReturnValue(new Promise(() => {}))
    renderPage()

    const skeletons = document.querySelectorAll('.animate-shimmer')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows error state and allows retry', async () => {
    ;(getOpenSourceWeekEvent as any)
      .mockRejectedValueOnce(new Error('Fetch failed'))
      .mockResolvedValueOnce({
        event: {
          id: eventId,
          title: 'Fetched Event',
          description: 'Fetched Desc',
          location: 'Office',
          status: 'upcoming',
          start_at: '2023-02-01T10:00:00Z',
          end_at: '2023-02-07T10:00:00Z',
        },
      })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Failed to load event/i)).toBeInTheDocument()
      expect(screen.getByText(/Fetch failed/i)).toBeInTheDocument()
    })

    const retryButton = screen.getByRole('button', { name: /retry/i })
    await userEvent.click(retryButton)

    await waitFor(() => {
      expect(screen.getByText('Fetched Event')).toBeInTheDocument()
      expect(screen.getByText('Fetched Desc')).toBeInTheDocument()
      expect(screen.getByText('Office')).toBeInTheDocument()
    })
    expect(getOpenSourceWeekEvent).toHaveBeenCalledTimes(2)
  })

  it('shows "not found" state when API returns no event', async () => {
    ;(getOpenSourceWeekEvent as any).mockResolvedValue({ event: null })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Event not found/i)).toBeInTheDocument()
    })
  })

  it('calls onBack when back button is clicked', async () => {
    ;(getOpenSourceWeekEvent as any).mockResolvedValue({
      event: {
        id: eventId,
        title: 'Fetched Event',
        description: 'Fetched Desc',
        location: 'Office',
        status: 'upcoming',
        start_at: '2023-02-01T10:00:00Z',
        end_at: '2023-02-07T10:00:00Z',
      },
    })
    renderPage()

    const backButton = screen.getByRole('button', { name: /back to open-source week/i })
    await userEvent.click(backButton)

    expect(mockOnBack).toHaveBeenCalled()
  })
})
