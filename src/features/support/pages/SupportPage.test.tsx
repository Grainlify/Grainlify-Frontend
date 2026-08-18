import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { SupportPage } from './SupportPage'

// These tests are the SIGNED-IN view: the report history only exists for
// somebody with an account. useAuth is mocked rather than mounting the real
// AuthProvider, which fires its own getCurrentUser() against the same fetch
// stub these tests use for the history response.
const mockUseAuth = vi.fn(() => ({ isAuthenticated: true }))
vi.mock('../../../shared/contexts/AuthContext', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useAuth: () => mockUseAuth(),
}))

// The two things 665 passing tests did not catch: a rail button that renders
// wrong, and a handler that opens a modal instead of navigating. Neither is
// asserted here - they belong to the rail - but the page itself is, including
// the property the endpoint exists for.

const reply = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as unknown as Response

describe('SupportPage', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.setItem('patchwork_jwt', 'tok')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  function mount(body: unknown) {
    fetchMock = vi.fn(async () => reply(body))
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<SupportPage />)
  }

  it('shows the report form as the primary section', async () => {
    mount({ support_requests: [], total: 0 })
    expect(await screen.findByRole('radiogroup', { name: /what's this about/i })).toBeInTheDocument()
    // The same categories the modal offers, because it is the same component.
    expect(screen.getByRole('radio', { name: /verification/i })).toBeInTheDocument()
  })

  it('lists past reports with their support IDs', async () => {
    mount({
      support_requests: [
        {
          id: '8c9ad3f4-16b4-4904-a072-f7ef0748218a',
          category: 'bug', message: 'the leaderboard is blank',
          status: 'received', created_at: '2026-08-16T18:04:00Z',
          delivered_to_team: true, has_screenshot: false,
        },
      ],
      total: 1,
    })
    expect(await screen.findByText('8c9ad3f4-16b4-4904-a072-f7ef0748218a')).toBeInTheDocument()
    expect(screen.getByText('the leaderboard is blank')).toBeInTheDocument()
  })

  // Truncation must be visible. A partial history shown as complete is how
  // somebody concludes a report was never received.
  it('says the list is truncated when it is', async () => {
    mount({
      support_requests: Array.from({ length: 50 }, (_, i) => ({
        id: `id-${i}`, category: 'bug', message: `report ${i}`,
        status: 'received', created_at: '2026-08-16T18:04:00Z',
        delivered_to_team: true, has_screenshot: false,
      })),
      total: 53,
    })
    expect(await screen.findByText(/showing your 50 most recent of 53/i)).toBeInTheDocument()
  })

  it('does not claim truncation when the list is complete', async () => {
    mount({
      support_requests: [{
        id: 'id-1', category: 'bug', message: 'only one',
        status: 'received', created_at: '2026-08-16T18:04:00Z',
        delivered_to_team: true, has_screenshot: false,
      }],
      total: 1,
    })
    await screen.findByText('only one')
    expect(screen.queryByText(/most recent of/i)).not.toBeInTheDocument()
  })

  // Nothing in the system records that a report was read or answered.
  it('never claims somebody is working on a report', async () => {
    mount({
      support_requests: [{
        id: 'id-1', category: 'bug', message: 'x',
        status: 'received', created_at: '2026-08-16T18:04:00Z',
        delivered_to_team: true, has_screenshot: false,
      }],
      total: 1,
    })
    await screen.findByText('x')
    expect(screen.getByText('Received')).toBeInTheDocument()
    expect(screen.queryByText(/in progress|being reviewed|assigned/i)).not.toBeInTheDocument()
  })

  // A failed history must not read as "support is broken, don't bother".
  it('keeps the form usable when the history fails to load', async () => {
    fetchMock = vi.fn(async () => reply({ error: 'boom' }, false, 500))
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<SupportPage />)

    await waitFor(() => expect(screen.getByText(/the form above still works/i)).toBeInTheDocument())
    expect(screen.getByRole('radiogroup', { name: /what's this about/i })).toBeInTheDocument()
  })
})

// The route is public, and that is the whole point: somebody who cannot sign
// in is the person most likely to need it. Six of the ten support reports we
// have ever received came from the landing page and /signin, every one
// anonymous.
describe('SupportPage, anonymous', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false } as never)
    localStorage.clear()
  })
  afterEach(() => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true } as never)
    vi.unstubAllGlobals()
  })

  it('shows the form without asking anyone to sign in', async () => {
    const fetchMock = vi.fn(async () => reply({}, false, 401))
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<SupportPage />)

    expect(await screen.findByRole('radiogroup', { name: /what's this about/i })).toBeInTheDocument()
  })

  it('never fetches a history it cannot have', async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) => reply({}, false, 401))
    vi.stubGlobal('fetch', fetchMock)
    renderWithProviders(<SupportPage />)
    await screen.findByRole('radiogroup', { name: /what's this about/i })

    // A 401 here would render "Could not load your past reports" at somebody
    // with no account and no past reports - an error describing a failure that
    // did not happen.
    const calledHistory = fetchMock.mock.calls.some((c: unknown[]) => String(c[0]).includes('support-requests/mine'))
    expect(calledHistory).toBe(false)
  })

  it('says where an anonymous report goes instead of showing an empty history', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({}, false, 401)))
    renderWithProviders(<SupportPage />)

    expect(await screen.findByText(/after you send this/i)).toBeInTheDocument()
    expect(screen.getByText(/support ID on screen/i)).toBeInTheDocument()
    // And must not claim anything about a history it cannot see.
    expect(screen.queryByText(/haven.t sent anything yet/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/could not load your past reports/i)).not.toBeInTheDocument()
  })
})
