import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'

const mockGetAdminEcosystems = vi.fn()
const mockGetAdminOpenSourceWeekEvents = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getAdminEcosystems: (...a: unknown[]) => mockGetAdminEcosystems(...a),
  getAdminOpenSourceWeekEvents: (...a: unknown[]) => mockGetAdminOpenSourceWeekEvents(...a),
  createEcosystem: vi.fn(),
  getAdminEcosystem: vi.fn(),
  deleteEcosystem: vi.fn(),
  updateEcosystem: vi.fn(),
  createOpenSourceWeekEvent: vi.fn(),
  deleteOpenSourceWeekEvent: vi.fn(),
}))

vi.mock('react-intl', () => ({
  IntlProvider: ({ children }: { children: React.ReactNode }) => children,
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
  FormattedMessage: ({ id }: { id: string }) => id,
  defineMessages: (msgs: Record<string, unknown>) => msgs,
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

beforeEach(() => {
  mockGetAdminEcosystems.mockReset()
  mockGetAdminOpenSourceWeekEvents.mockReset()
})

describe('AdminPage — icon-only button aria-labels', () => {
  it('renders ecosystem edit/delete buttons with aria-label', async () => {
    mockGetAdminEcosystems.mockResolvedValue({
      ecosystems: [
        {
          id: 'eco-1',
          slug: 'test-eco',
          name: 'Test Ecosystem',
          description: 'A test ecosystem',
          logo_url: null,
          website_url: null,
          status: 'active',
          project_count: 0,
          user_count: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    })
    mockGetAdminOpenSourceWeekEvents.mockResolvedValue({ events: [] })

    const { AdminPage } = await import('./AdminPage')

    render(
      <ThemeProvider>
        <AdminPage />
      </ThemeProvider>
    )

    // Wait for the ecosystem to render and check aria-labels
    const editButton = await screen.findByRole('button', { name: 'Edit ecosystem' })
    expect(editButton).toBeInTheDocument()
    expect(editButton).toHaveAttribute('aria-label', 'Edit ecosystem')

    const deleteButton = screen.getByRole('button', { name: 'Delete ecosystem' })
    expect(deleteButton).toBeInTheDocument()
    expect(deleteButton).toHaveAttribute('aria-label', 'Delete ecosystem')
  })

  it('renders event delete button with aria-label', async () => {
    mockGetAdminEcosystems.mockResolvedValue({ ecosystems: [] })
    mockGetAdminOpenSourceWeekEvents.mockResolvedValue({
      events: [
        {
          id: 'evt-1',
          title: 'Test Event',
          description: null,
          location: null,
          status: 'upcoming',
          start_at: '2026-07-01T00:00:00Z',
          end_at: '2026-07-07T00:00:00Z',
        },
      ],
    })

    const { AdminPage } = await import('./AdminPage')

    render(
      <ThemeProvider>
        <AdminPage />
      </ThemeProvider>
    )

    // Wait for the event to render and check aria-label
    const deleteEventButton = await screen.findByRole('button', { name: 'Delete event' })
    expect(deleteEventButton).toBeInTheDocument()
    expect(deleteEventButton).toHaveAttribute('aria-label', 'Delete event')
  })
})