import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { NotificationsPage, linkLabel } from './NotificationsPage'

const mockGet = vi.fn()
const mockRead = vi.fn()
const mockReadAll = vi.fn()
vi.mock('../../../shared/api/client', () => ({
  getNotifications: (...a: unknown[]) => mockGet(...a),
  markNotificationRead: (...a: unknown[]) => mockRead(...a),
  markAllNotificationsRead: (...a: unknown[]) => mockReadAll(...a),
}))
const toastError = vi.fn()
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }))
vi.mock('lucide-react', () => ({ ArrowLeft: () => null }))

const LONG = 'Line one about the document.\n\nLine two about the lighting, at length. ' + 'x'.repeat(400)
/** Testing Library normalises whitespace, so LONG's blank line makes an exact
 *  text match impossible. Find by a fragment; assert on the node. */
const FRAGMENT = /Line one about the document/

const row = (over: Record<string, unknown> = {}) => ({
  id: 'n1', type: 'kyc_reset',
  title: 'Your verification was reset',
  body: LONG,
  link_path: '/dashboard?tab=settings&subtab=billing',
  read_at: null,
  created_at: new Date().toISOString(),
  ...over,
})

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGet.mockResolvedValue({ notifications: [row()] })
  })

  // The reason the page exists.
  it('shows the whole body, unclamped', async () => {
    renderWithProviders(<NotificationsPage />)
    const body = await screen.findByText(FRAGMENT)
    expect(body.textContent).toBe(LONG)
    expect(body.className).not.toMatch(/line-clamp|truncate|text-ellipsis/)
    expect(body.className).toMatch(/whitespace-pre-line/)
  })

  // Visiting must not clear the badge: a glance is not having seen them.
  it('does not mark anything read on open', async () => {
    renderWithProviders(<NotificationsPage />)
    await screen.findByText(FRAGMENT)
    expect(mockRead).not.toHaveBeenCalled()
  })

  // The click is deliberate and does exactly one thing.
  it('marks read on click without removing or reordering the row', async () => {
    mockRead.mockResolvedValue({ ok: true })
    mockGet.mockResolvedValue({
      notifications: [row(), row({ id: 'n2', title: 'Second', body: 'b', link_path: null })],
    })
    renderWithProviders(<NotificationsPage />)
    await screen.findByText(FRAGMENT)

    // Assert the property directly rather than counting buttons: after the
    // click the clicked row is still present and now reads (read), and the
    // other row is untouched. Counting was fragile - "Mark all as read" is a
    // header control with no aria-label and sits first in the DOM.
    await userEvent.click(screen.getByRole('button', { name: /Mark "Your verification was reset" as read/i }))
    await waitFor(() => expect(mockRead).toHaveBeenCalledWith('n1'))

    // Not removed: its body is still on screen.
    expect(screen.getByText(FRAGMENT)).toBeInTheDocument()
    // Now marked read, in place.
    expect(
      screen.getByRole('button', { name: /Your verification was reset \(read\)/i })
    ).toBeInTheDocument()
    // The other row is untouched, so nothing was reordered or dropped.
    expect(screen.getByRole('button', { name: /Mark "Second" as read/i })).toBeInTheDocument()
  })

  // A failed write must not leave the UI claiming success.
  it('reverts the optimistic read when the write fails', async () => {
    mockRead.mockRejectedValue(new Error('nope'))
    renderWithProviders(<NotificationsPage />)
    await screen.findByText(FRAGMENT)
    await userEvent.click(screen.getByRole('button', { name: /Mark "Your verification was reset" as read/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    // Back to unread, rather than silently pretending.
    expect(await screen.findByRole('button', { name: /Mark "Your verification was reset" as read/i })).toBeInTheDocument()
  })

  // Reading and travelling are two intentions.
  it('offers the destination as a separate link, not as the row', async () => {
    renderWithProviders(<NotificationsPage />)
    await screen.findByText(FRAGMENT)
    const link = screen.getByRole('link', { name: /Go to verification/i })
    expect(link).toHaveAttribute('href', '/dashboard?tab=settings&subtab=billing')
  })

  it('names the destination per type rather than saying View', () => {
    expect(linkLabel('kyc_reset')).toBe('Go to verification')
    expect(linkLabel('pr_merged')).toBe('Go to the project')
    expect(linkLabel('something_new')).toBe('Open')
  })

  // A failed load is not "you have none".
  it('distinguishes a failed load from an empty list', async () => {
    mockGet.mockRejectedValue(new Error('boom'))
    renderWithProviders(<NotificationsPage />)
    expect(await screen.findByText(/Couldn't load your notifications/i)).toBeInTheDocument()
    expect(screen.queryByText(/Nothing here yet/i)).not.toBeInTheDocument()
  })
})
