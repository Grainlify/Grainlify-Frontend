/**
 * @file AdminPage.test.tsx
 * @description Tests for AdminPage pagination (issue #744): the ecosystems
 * list and Open Source Week events list must render a bounded first page and
 * reveal more items via "Load more" rather than rendering everything at once.
 */

import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'
import { AdminPage } from './AdminPage'

// ---------------------------------------------------------------------------
// Mock API client — declared BEFORE vi.mock() factory so they are in scope
// ---------------------------------------------------------------------------
const mockGetAdminEcosystems = vi.fn()
const mockGetAdminOpenSourceWeekEvents = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getAdminEcosystems: (...a: unknown[]) => mockGetAdminEcosystems(...a),
  getAdminEcosystem: vi.fn(),
  createEcosystem: vi.fn(),
  deleteEcosystem: vi.fn(),
  updateEcosystem: vi.fn(),
  createOpenSourceWeekEvent: vi.fn(),
  getAdminOpenSourceWeekEvents: (...a: unknown[]) => mockGetAdminOpenSourceWeekEvents(...a),
  deleteOpenSourceWeekEvent: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

// Modals are only relevant to the add/edit flows, not to pagination — mocked
// out (same approach as EcosystemsPage.test.tsx) so they stay closed/inert.
vi.mock('../../../shared/components/ui/Modal', () => ({
  Modal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
    isOpen ? <div role="dialog">{children}</div> : null,
  ModalFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ModalButton: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  ModalInput: () => null,
  ModalSelect: () => null,
}))

vi.mock('../../../shared/components/ui/DatePicker', () => ({
  DatePicker: () => null,
}))

function renderAdminPage() {
  return render(
    <ThemeProvider>
      <AdminPage />
    </ThemeProvider>
  )
}

function makeEcosystem(i: number) {
  return {
    id: `eco-${i}`,
    slug: `eco-${i}`,
    name: `Ecosystem ${i}`,
    description: null,
    logo_url: null,
    website_url: null,
    status: 'active',
    project_count: 0,
    user_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

function makeOswEvent(i: number) {
  return {
    id: `osw-${i}`,
    title: `Event ${i}`,
    description: null,
    location: null,
    status: 'upcoming',
    start_at: '2026-01-01T00:00:00Z',
    end_at: '2026-01-08T00:00:00Z',
  }
}

describe('AdminPage pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders only the first page of ecosystems and reveals the rest on "Load more"', async () => {
    mockGetAdminEcosystems.mockResolvedValue({
      ecosystems: Array.from({ length: 15 }, (_, i) => makeEcosystem(i)),
    })
    mockGetAdminOpenSourceWeekEvents.mockResolvedValue({ events: [] })

    renderAdminPage()

    expect(await screen.findByText('Ecosystem 0')).toBeInTheDocument()
    for (let i = 0; i < 9; i++) {
      expect(screen.getByText(`Ecosystem ${i}`)).toBeInTheDocument()
    }
    // Page size is 9 — item 9 (the 10th) must not be rendered yet.
    expect(screen.queryByText('Ecosystem 9')).not.toBeInTheDocument()
    expect(screen.queryByText('Ecosystem 14')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /load more ecosystems/i }))

    for (let i = 9; i < 15; i++) {
      expect(await screen.findByText(`Ecosystem ${i}`)).toBeInTheDocument()
    }
    // All 15 are now visible — the control disappears once nothing more remains.
    expect(screen.queryByRole('button', { name: /load more ecosystems/i })).not.toBeInTheDocument()
  })

  it('does not show a "Load more" control when every ecosystem already fits on one page', async () => {
    mockGetAdminEcosystems.mockResolvedValue({
      ecosystems: Array.from({ length: 5 }, (_, i) => makeEcosystem(i)),
    })
    mockGetAdminOpenSourceWeekEvents.mockResolvedValue({ events: [] })

    renderAdminPage()

    expect(await screen.findByText('Ecosystem 0')).toBeInTheDocument()
    expect(screen.getByText('Ecosystem 4')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /load more ecosystems/i })).not.toBeInTheDocument()
  })

  it('renders only the first page of Open Source Week events and reveals the rest on "Load more"', async () => {
    mockGetAdminEcosystems.mockResolvedValue({ ecosystems: [] })
    mockGetAdminOpenSourceWeekEvents.mockResolvedValue({
      events: Array.from({ length: 12 }, (_, i) => makeOswEvent(i)),
    })

    renderAdminPage()

    expect(await screen.findByText('Event 0')).toBeInTheDocument()
    for (let i = 0; i < 9; i++) {
      expect(screen.getByText(`Event ${i}`)).toBeInTheDocument()
    }
    expect(screen.queryByText('Event 9')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /load more events/i }))

    for (let i = 9; i < 12; i++) {
      expect(await screen.findByText(`Event ${i}`)).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: /load more events/i })).not.toBeInTheDocument()
  })

  it('resets the visible ecosystems page back to the first page on refetch', async () => {
    mockGetAdminEcosystems.mockResolvedValue({
      ecosystems: Array.from({ length: 15 }, (_, i) => makeEcosystem(i)),
    })
    mockGetAdminOpenSourceWeekEvents.mockResolvedValue({ events: [] })

    renderAdminPage()
    expect(await screen.findByText('Ecosystem 0')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /load more ecosystems/i }))
    expect(await screen.findByText('Ecosystem 14')).toBeInTheDocument()

    // Simulate another page fetching the same 15 ecosystems again (e.g. the
    // ecosystems-updated listener re-fetching after a create/edit/delete).
    fireEvent(window, new CustomEvent('ecosystems-updated'))

    // Back to only the first page being visible.
    expect(await screen.findByRole('button', { name: /load more ecosystems/i })).toBeInTheDocument()
    expect(screen.queryByText('Ecosystem 14')).not.toBeInTheDocument()
  })
})

describe('AdminPage icon-only action buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has an accessible name on the ecosystem edit/delete buttons and event delete button', async () => {
    mockGetAdminEcosystems.mockResolvedValue({ ecosystems: [makeEcosystem(0)] })
    mockGetAdminOpenSourceWeekEvents.mockResolvedValue({ events: [makeOswEvent(0)] })

    renderAdminPage()

    expect(await screen.findByText('Ecosystem 0')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit ecosystem' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete ecosystem' })).toBeInTheDocument()

    expect(await screen.findByText('Event 0')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete event' })).toBeInTheDocument()
  })
})
