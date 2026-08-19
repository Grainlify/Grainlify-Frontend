import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { NotificationsPage, linkLabel } from './NotificationsPage'
import { CONTROLS_THRESHOLD } from '../../../shared/notifications/lib'

const mockGet = vi.fn()
const mockCount = vi.fn()
const mockRead = vi.fn()
const mockReadAll = vi.fn()
vi.mock('../../../shared/api/client', () => ({
  getNotifications: (...a: unknown[]) => mockGet(...a),
  getNotificationCount: (...a: unknown[]) => mockCount(...a),
  markNotificationRead: (...a: unknown[]) => mockRead(...a),
  markAllNotificationsRead: (...a: unknown[]) => mockReadAll(...a),
}))
const toastError = vi.fn()
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }))
vi.mock('lucide-react', () => ({ Bell: () => null, Check: () => null, Search: () => null }))

// jsdom computes no layout and implements no scrolling.
Element.prototype.scrollIntoView = vi.fn()

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

/** n rows, all unread, all today. */
const rows = (n: number, over: Record<string, unknown> = {}) =>
  Array.from({ length: n }, (_, i) =>
    row({ id: `n${i}`, title: `Notification ${i}`, body: `body ${i}`, ...over })
  )

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGet.mockResolvedValue({ notifications: [row()] })
    mockCount.mockResolvedValue({ count: 1 })
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
    expect(screen.queryByText(/No notifications yet/i)).not.toBeInTheDocument()
  })

  /** The median inbox on this platform holds ONE notification. Controls above a
   *  single row are the same defect as a page of dead space, pointing the other
   *  way. */
  describe('controls appear only when there is enough to control', () => {
    it('shows a header and a list and nothing else below the threshold', async () => {
      mockGet.mockResolvedValue({ notifications: rows(CONTROLS_THRESHOLD) })
      renderWithProviders(<NotificationsPage />)
      await screen.findByText('Notification 0')
      expect(screen.queryByRole('textbox', { name: /search/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Unread' })).not.toBeInTheDocument()
    })

    it('shows search and the All/Unread toggle above it', async () => {
      mockGet.mockResolvedValue({ notifications: rows(CONTROLS_THRESHOLD + 1) })
      renderWithProviders(<NotificationsPage />)
      await screen.findByText('Notification 0')
      expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Unread' })).toBeInTheDocument()
    })

    /** The trap this design has to avoid.
     *
     *  Gate the controls on what is DISPLAYED and filtering to Unread can drop
     *  the list below the threshold, which removes the control that did the
     *  filtering — leaving somebody inside a view with no way back out. So the
     *  gate reads the unfiltered count, and this asserts it directly.
     */
    it('keeps the controls after a filter narrows the list below the threshold', async () => {
      mockGet.mockImplementation((p: { unreadOnly?: boolean }) =>
        Promise.resolve({ notifications: p?.unreadOnly ? rows(2) : rows(CONTROLS_THRESHOLD + 1) })
      )
      renderWithProviders(<NotificationsPage />)
      await screen.findByText('Notification 0')

      await userEvent.click(screen.getByRole('button', { name: 'Unread' }))
      await waitFor(() =>
        expect(mockGet).toHaveBeenCalledWith(expect.objectContaining({ unreadOnly: true }))
      )

      // Two rows are showing now, which is below the threshold — and the way
      // back must still be on screen.
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument()
    })
  })

  it('groups by date rather than running one flat list', async () => {
    const old = new Date(Date.now() - 30 * 864e5).toISOString()
    mockGet.mockResolvedValue({
      notifications: [row({ id: 'a', title: 'Fresh', body: 'b' }), row({ id: 'b', title: 'Ancient', body: 'b', created_at: old })],
    })
    renderWithProviders(<NotificationsPage />)
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Earlier' })).toBeInTheDocument()
  })

  /** An empty list under an active filter that reads "you have none" is the
   *  same class of lie as a blank where a failed load belongs. */
  it('says WHY the list is empty when a filter is what emptied it', async () => {
    mockGet.mockImplementation((p: { unreadOnly?: boolean }) =>
      Promise.resolve({ notifications: p?.unreadOnly ? [] : rows(CONTROLS_THRESHOLD + 1) })
    )
    renderWithProviders(<NotificationsPage />)
    await screen.findByText('Notification 0')
    await userEvent.click(screen.getByRole('button', { name: 'Unread' }))

    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument()
    // And it must NOT claim they have never received anything.
    expect(screen.queryByText(/No notifications yet/i)).not.toBeInTheDocument()
  })

  /** A client-side search reporting "no matches" while unloaded rows sit behind
   *  a button is answering a narrower question than the one asked. */
  it('reports what the search actually covered when more pages exist', async () => {
    mockGet.mockResolvedValue({ notifications: rows(25) })
    renderWithProviders(<NotificationsPage />)
    await screen.findByText('Notification 0')
    await userEvent.type(screen.getByRole('textbox', { name: /search/i }), 'Notification 3')
    expect(await screen.findByText(/loaded so far/i)).toBeInTheDocument()
  })

  /** The dropdown links here by id. The anchor is guaranteed to resolve: the
   *  dropdown lists the newest ten, this page loads the newest twenty-five. */
  it('scrolls to the notification the dropdown pointed at', async () => {
    mockGet.mockResolvedValue({ notifications: rows(5) })
    renderWithProviders(<NotificationsPage />, { route: '/dashboard?tab=notifications&n=n3' })
    await screen.findByText('Notification 3')
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled())
  })
})
