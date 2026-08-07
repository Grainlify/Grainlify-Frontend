import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { AdminPage } from './AdminPage'
import {
  getAdminEcosystems,
  createEcosystem,
  deleteEcosystem,
  getAdminOpenSourceWeekEvents,
  createOpenSourceWeekEvent,
  deleteOpenSourceWeekEvent,
} from '../../../shared/api/client'

vi.mock('../../../shared/api/client', () => ({
  getAdminEcosystems: vi.fn(),
  createEcosystem: vi.fn(),
  getAdminEcosystem: vi.fn(),
  updateEcosystem: vi.fn(),
  deleteEcosystem: vi.fn(),
  getAdminOpenSourceWeekEvents: vi.fn(),
  createOpenSourceWeekEvent: vi.fn(),
  deleteOpenSourceWeekEvent: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Unrelated to what this file tests (ecosystems/OSW CRUD) - covered by their
// own SocialFollowReview.test.tsx / RedemptionsReview.test.tsx.
vi.mock('../components/SocialFollowReview', () => ({
  SocialFollowReview: () => null,
}))
vi.mock('../components/RedemptionsReview', () => ({
  RedemptionsReview: () => null,
}))

// The real DatePicker is a Radix Popover + react-day-picker calendar — driving
// it via click-through-a-calendar-grid is brittle and jsdom lacks the pointer
// APIs Radix Select/Popover reach for. Stub it as a plain labeled input so the
// AdminPage form-wiring (validation, payload construction) is still exercised
// for real, without fighting a third-party calendar's DOM.
vi.mock('../../../shared/components/ui/DatePicker', () => ({
  DatePicker: ({
    label,
    value,
    onChange,
  }: {
    label?: string
    value: string
    onChange: (value: string) => void
  }) => <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />,
}))

type AdminEcosystem = Awaited<ReturnType<typeof getAdminEcosystems>>['ecosystems'][number]
type AdminOswEvent = Awaited<ReturnType<typeof getAdminOpenSourceWeekEvents>>['events'][number]
type CreateEcosystemResult = Awaited<ReturnType<typeof createEcosystem>>

function makeEcosystem(overrides: Partial<AdminEcosystem> = {}): AdminEcosystem {
  return {
    id: 'eco-1',
    slug: 'acme',
    name: 'Acme',
    description: 'An ecosystem',
    logo_url: null,
    website_url: null,
    status: 'active',
    project_count: 3,
    user_count: 10,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    about: null,
    links: null,
    key_areas: null,
    technologies: null,
    ...overrides,
  }
}

function makeOswEvent(overrides: Partial<AdminOswEvent> = {}): AdminOswEvent {
  return {
    id: 'osw-1',
    title: 'Open Source Week',
    description: null,
    location: null,
    status: 'upcoming',
    start_at: '2026-09-01T00:00:00Z',
    end_at: '2026-09-08T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeCreateEcosystemResult(overrides: Partial<CreateEcosystemResult> = {}): CreateEcosystemResult {
  return {
    id: 'eco-new',
    slug: 'new-eco',
    name: 'New Eco',
    description: '',
    website_url: '',
    status: 'active',
    project_count: 0,
    user_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('AdminPage', () => {
  beforeEach(() => {
    vi.mocked(getAdminEcosystems).mockResolvedValue({ ecosystems: [] })
    vi.mocked(getAdminOpenSourceWeekEvents).mockResolvedValue({ events: [] })
  })

  describe('Ecosystems', () => {
    it('renders the ecosystems list from a mocked fetch', async () => {
      vi.mocked(getAdminEcosystems).mockResolvedValue({
        ecosystems: [makeEcosystem({ id: 'eco-1', name: 'Acme' }), makeEcosystem({ id: 'eco-2', name: 'Globex' })],
      })

      renderWithProviders(<AdminPage />)

      expect(await screen.findByText('Acme')).toBeInTheDocument()
      expect(screen.getByText('Globex')).toBeInTheDocument()
    })

    it('shows an empty state when there are no ecosystems', async () => {
      renderWithProviders(<AdminPage />)

      expect(
        await screen.findByText('No ecosystems found. Add your first ecosystem above.')
      ).toBeInTheDocument()
    })

    it('creates an ecosystem: fills the form, submits, calls the create API with the right payload, and refreshes the list', async () => {
      vi.mocked(createEcosystem).mockResolvedValue(
        makeCreateEcosystemResult({ id: 'eco-new', name: 'New Eco' })
      )
      const user = userEvent.setup()
      renderWithProviders(<AdminPage />)

      await screen.findByText('No ecosystems found. Add your first ecosystem above.')

      // Simulate the backend now returning the newly created ecosystem on refresh.
      vi.mocked(getAdminEcosystems).mockResolvedValue({
        ecosystems: [makeEcosystem({ id: 'eco-new', name: 'New Eco' })],
      })

      await user.click(screen.getByRole('button', { name: 'Add New Ecosystem' }))
      await user.type(screen.getByPlaceholderText('e.g., Web3 Ecosystem'), 'New Eco')
      await user.type(
        screen.getByPlaceholderText('Describe the ecosystem...'),
        'A brand new ecosystem for testing purposes.'
      )
      await user.type(screen.getByPlaceholderText('https://example.com'), 'https://new-eco.example.com')

      await user.click(screen.getByRole('button', { name: 'Add Ecosystem' }))

      await waitFor(() => {
        expect(createEcosystem).toHaveBeenCalledWith({
          name: 'New Eco',
          description: 'A brand new ecosystem for testing purposes.',
          website_url: 'https://new-eco.example.com',
          logo_url: undefined,
          status: 'active',
          about: undefined,
          links: undefined,
          key_areas: undefined,
          technologies: undefined,
        })
      })

      // List refreshed: the new ecosystem now shows up, and the create modal closed.
      expect(await screen.findByText('New Eco')).toBeInTheDocument()
      // Verified from source: handleSubmit's success path both awaits
      // fetchEcosystems() directly AND dispatches an 'ecosystems-updated'
      // CustomEvent, which the page's own mount-time listener also handles by
      // calling fetchEcosystems() again — so a create causes two refreshes
      // (three calls total, counting the initial mount fetch), not one.
      expect(getAdminEcosystems).toHaveBeenCalledTimes(3)
    })

    it('deletes an ecosystem only after a two-step confirm', async () => {
      vi.mocked(getAdminEcosystems).mockResolvedValue({
        ecosystems: [makeEcosystem({ id: 'eco-1', name: 'Acme' })],
      })
      vi.mocked(deleteEcosystem).mockResolvedValue({ ok: true })
      const user = userEvent.setup()
      renderWithProviders(<AdminPage />)

      await screen.findByText('Acme')

      // Step 1: clicking the row's delete icon only opens a confirm dialog.
      await user.click(screen.getByRole('button', { name: 'Delete ecosystem' }))

      expect(await screen.findByRole('heading', { name: 'Delete Ecosystem' })).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument()
      expect(deleteEcosystem).not.toHaveBeenCalled()

      // Step 2: confirming actually calls the delete API.
      vi.mocked(getAdminEcosystems).mockResolvedValue({ ecosystems: [] })
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => {
        expect(deleteEcosystem).toHaveBeenCalledWith('eco-1')
      })
      expect(
        await screen.findByText('No ecosystems found. Add your first ecosystem above.')
      ).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Delete Ecosystem' })).not.toBeInTheDocument()
    })

    it('surfaces an error message without crashing when the ecosystems fetch fails', async () => {
      vi.mocked(getAdminEcosystems).mockRejectedValue(new Error('Failed to load ecosystems'))

      renderWithProviders(<AdminPage />)

      expect(await screen.findByText('Failed to load ecosystems')).toBeInTheDocument()
      // The rest of the page still renders fine.
      expect(screen.getByRole('heading', { name: 'Ecosystem Management' })).toBeInTheDocument()
    })
  })

  describe('Open Source Week events', () => {
    it('renders the events list from a mocked fetch', async () => {
      vi.mocked(getAdminOpenSourceWeekEvents).mockResolvedValue({
        events: [makeOswEvent({ id: 'osw-1', title: 'Hack Week' })],
      })

      renderWithProviders(<AdminPage />)

      expect(await screen.findByText('Hack Week')).toBeInTheDocument()
    })

    it('shows an empty state when there are no events', async () => {
      renderWithProviders(<AdminPage />)

      expect(await screen.findByText(/No Open-Source Week events yet/)).toBeInTheDocument()
    })

    it('creates an event: fills the form, submits, calls the create API with the right payload, and refreshes the list', async () => {
      vi.mocked(createOpenSourceWeekEvent).mockResolvedValue({ id: 'osw-new' })
      const user = userEvent.setup()
      renderWithProviders(<AdminPage />)

      await screen.findByText(/No Open-Source Week events yet/)

      vi.mocked(getAdminOpenSourceWeekEvents).mockResolvedValue({
        events: [makeOswEvent({ id: 'osw-new', title: 'Launch Week' })],
      })

      await user.click(screen.getByRole('button', { name: 'Add Event' }))
      await user.type(screen.getByPlaceholderText('Open-Source Week'), 'Launch Week')
      // Start/end time default to 00:00 already, which is valid — only the
      // (stubbed) date pickers need explicit values.
      fireEvent.change(screen.getByLabelText('Start date (UTC)'), { target: { value: '2026-09-01' } })
      fireEvent.change(screen.getByLabelText('End date (UTC)'), { target: { value: '2026-09-08' } })

      await user.click(screen.getByRole('button', { name: 'Create Event' }))

      await waitFor(() => {
        expect(createOpenSourceWeekEvent).toHaveBeenCalledWith({
          title: 'Launch Week',
          description: undefined,
          location: undefined,
          status: 'upcoming',
          start_at: '2026-09-01T00:00:00.000Z',
          end_at: '2026-09-08T00:00:00.000Z',
        })
      })

      expect(await screen.findByText('Launch Week')).toBeInTheDocument()
      expect(getAdminOpenSourceWeekEvents).toHaveBeenCalledTimes(2)
    })

    it('deletes an event only after a two-step confirm', async () => {
      vi.mocked(getAdminOpenSourceWeekEvents).mockResolvedValue({
        events: [makeOswEvent({ id: 'osw-1', title: 'Hack Week' })],
      })
      vi.mocked(deleteOpenSourceWeekEvent).mockResolvedValue({ ok: true })
      const user = userEvent.setup()
      renderWithProviders(<AdminPage />)

      await screen.findByText('Hack Week')

      await user.click(screen.getByRole('button', { name: 'Delete event' }))

      expect(await screen.findByRole('heading', { name: 'Delete Event' })).toBeInTheDocument()
      expect(deleteOpenSourceWeekEvent).not.toHaveBeenCalled()

      vi.mocked(getAdminOpenSourceWeekEvents).mockResolvedValue({ events: [] })
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() => {
        expect(deleteOpenSourceWeekEvent).toHaveBeenCalledWith('osw-1')
      })
      expect(await screen.findByText(/No Open-Source Week events yet/)).toBeInTheDocument()
    })

    // Verified from source (not assumed): unlike the ecosystems list, a failed
    // fetchOswEvents() swallows the error and silently resets to an empty list
    // — it never populates the shared errorMessage banner.
    it('does not crash and falls back to the empty state (without an error banner) when the events fetch fails', async () => {
      vi.mocked(getAdminOpenSourceWeekEvents).mockRejectedValue(new Error('boom'))

      renderWithProviders(<AdminPage />)

      expect(await screen.findByText(/No Open-Source Week events yet/)).toBeInTheDocument()
      expect(screen.queryByText('boom')).not.toBeInTheDocument()
    })

    // Create/delete failures *do* surface through the shared errorMessage banner.
    it('surfaces an error message without crashing when deleting an event fails', async () => {
      vi.mocked(getAdminOpenSourceWeekEvents).mockResolvedValue({
        events: [makeOswEvent({ id: 'osw-1', title: 'Hack Week' })],
      })
      vi.mocked(deleteOpenSourceWeekEvent).mockRejectedValue(new Error('Cannot delete a running event'))
      const user = userEvent.setup()
      renderWithProviders(<AdminPage />)

      await screen.findByText('Hack Week')
      await user.click(screen.getByRole('button', { name: 'Delete event' }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      expect(await screen.findByText('Cannot delete a running event')).toBeInTheDocument()
      // The failed delete did not remove the event from the list — the card
      // heading is still there. (Note: oswDeleteConfirm is only cleared on the
      // success path, so the confirm dialog — which also echoes the event's
      // title in its body text — stays open too; that's why this asserts the
      // heading specifically rather than getByText, which would now match twice.)
      expect(screen.getByRole('heading', { name: 'Hack Week' })).toBeInTheDocument()
    })
  })
})
