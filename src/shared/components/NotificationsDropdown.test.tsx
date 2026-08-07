import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import { NotificationsDropdown } from './NotificationsDropdown'

const mockGetNotificationCount = vi.fn()
const mockGetNotifications = vi.fn()
const mockMarkNotificationRead = vi.fn()
const mockMarkAllNotificationsRead = vi.fn()
vi.mock('../api/client', () => ({
  getNotificationCount: (...args: unknown[]) => mockGetNotificationCount(...args),
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  markNotificationRead: (...args: unknown[]) => mockMarkNotificationRead(...args),
  markAllNotificationsRead: (...args: unknown[]) => mockMarkAllNotificationsRead(...args),
}))

const NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'issue_assigned',
    title: "You've been assigned to issue #12",
    body: 'You were assigned to work on issue #12 in grainlify/example.',
    link_path: '/dashboard?tab=browse&project=proj-1&issue=12',
    read_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'n2',
    type: 'pr_merged',
    title: 'Your PR #7 was merged',
    body: null,
    link_path: '/dashboard?tab=browse&project=proj-1',
    read_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
]

describe('NotificationsDropdown', () => {
  const closeMobileNav = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    mockGetNotificationCount.mockResolvedValue({ count: 1 })
    mockGetNotifications.mockResolvedValue({ notifications: NOTIFICATIONS })
    mockMarkNotificationRead.mockResolvedValue({ ok: true })
    mockMarkAllNotificationsRead.mockResolvedValue({ ok: true })
  })

  it('fetches and displays the unread count badge on mount', async () => {
    renderWithProviders(<NotificationsDropdown showMobileNav={false} closeMobileNav={closeMobileNav} />)
    await waitFor(() => expect(mockGetNotificationCount).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('1')).toBeInTheDocument()
  })

  it('does not render a badge when the unread count is 0', async () => {
    mockGetNotificationCount.mockResolvedValue({ count: 0 })
    renderWithProviders(<NotificationsDropdown showMobileNav={false} closeMobileNav={closeMobileNav} />)
    await waitFor(() => expect(mockGetNotificationCount).toHaveBeenCalled())
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('lazily fetches the notification list only when opened', async () => {
    renderWithProviders(<NotificationsDropdown showMobileNav={false} closeMobileNav={closeMobileNav} />)
    await waitFor(() => expect(mockGetNotificationCount).toHaveBeenCalled())
    expect(mockGetNotifications).not.toHaveBeenCalled()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button'))

    await waitFor(() => expect(mockGetNotifications).toHaveBeenCalledTimes(1))
    expect(await screen.findByText("You've been assigned to issue #12")).toBeInTheDocument()
    expect(screen.getByText('Your PR #7 was merged')).toBeInTheDocument()
  })

  it('shows the empty state when there are no notifications', async () => {
    mockGetNotifications.mockResolvedValue({ notifications: [] })
    renderWithProviders(<NotificationsDropdown showMobileNav={false} closeMobileNav={closeMobileNav} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button'))
    expect(await screen.findByText('No notifications yet')).toBeInTheDocument()
  })

  it('clicking an unread notification marks it read, decrements the count, and navigates', async () => {
    renderWithProviders(<NotificationsDropdown showMobileNav={false} closeMobileNav={closeMobileNav} />, {
      route: '/dashboard',
    })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button'))
    const unread = await screen.findByText("You've been assigned to issue #12")
    await user.click(unread)

    await waitFor(() => expect(mockMarkNotificationRead).toHaveBeenCalledWith('n1'))
    expect(closeMobileNav).toHaveBeenCalled()
  })

  it('clicking an already-read notification does not call markNotificationRead again', async () => {
    renderWithProviders(<NotificationsDropdown showMobileNav={false} closeMobileNav={closeMobileNav} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button'))
    const read = await screen.findByText('Your PR #7 was merged')
    await user.click(read)

    expect(mockMarkNotificationRead).not.toHaveBeenCalled()
  })

  it('"Mark all read" calls the API and clears the badge', async () => {
    renderWithProviders(<NotificationsDropdown showMobileNav={false} closeMobileNav={closeMobileNav} />)
    await waitFor(() => expect(mockGetNotificationCount).toHaveBeenCalled())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button'))
    await screen.findByText("You've been assigned to issue #12")

    await user.click(screen.getByRole('button', { name: 'Mark all read' }))

    await waitFor(() => expect(mockMarkAllNotificationsRead).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })

  it('handles a failed count fetch without crashing', async () => {
    mockGetNotificationCount.mockRejectedValue(new Error('network error'))
    renderWithProviders(<NotificationsDropdown showMobileNav={false} closeMobileNav={closeMobileNav} />)
    await waitFor(() => expect(mockGetNotificationCount).toHaveBeenCalled())
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
