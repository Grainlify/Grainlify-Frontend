import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import { Dashboard } from './Dashboard'

/** "See all notifications" must land somewhere that shows notifications.
 *
 *  The earlier verification of this button was done SIGNED OUT: both
 *  /notifications and /dashboard?tab=notifications bounced to /signin, which
 *  proves the routes resolve and proves nothing at all about the link working
 *  once authenticated. A check answering a narrower question than the one asked.
 *
 *  So this is signed in, it clicks the real control, and it asserts the page
 *  RENDERS - not that the link exists, not that the URL changed.
 */
function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location-spy">{location.search}</div>
}

const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }))
vi.mock('../../shared/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: mockUseAuth,
}))

vi.mock('./pages/DiscoverPage', () => ({ DiscoverPage: () => <div data-testid="discover-page" /> }))
vi.mock('./pages/BrowsePage', () => ({ BrowsePage: () => <div data-testid="browse-page" /> }))
vi.mock('./pages/SearchPage', () => ({ SearchPage: () => <div data-testid="search-page" /> }))
vi.mock('./pages/DataPage', () => ({ DataPage: () => <div data-testid="data-page" /> }))
vi.mock('./pages/IssueDetailPage', () => ({ IssueDetailPage: () => <div data-testid="issue-detail-page" /> }))
vi.mock('../notifications/pages/NotificationsPage', () => ({
  NotificationsPage: () => <div data-testid="notifications-page" />,
}))

const { mockGetNotifications, mockGetCount } = vi.hoisted(() => ({
  mockGetNotifications: vi.fn(),
  mockGetCount: vi.fn(),
}))
vi.mock('../../shared/api/client', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  getNotifications: (...a: unknown[]) => mockGetNotifications(...a),
  getNotificationCount: (...a: unknown[]) => mockGetCount(...a),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}))

describe('See all notifications, signed in', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', login: 'someone' }, userId: 'u1', userRole: 'contributor',
      login: vi.fn(), logout: vi.fn(), isAuthenticated: true,
    })
    mockGetCount.mockResolvedValue({ count: 1 })
    mockGetNotifications.mockResolvedValue({
      notifications: [{
        id: 'n1', type: 'founding_position', title: 'Your founding position',
        body: 'b', link_path: '/dashboard?tab=settings&subtab=rewards',
        read_at: null, created_at: new Date().toISOString(),
      }],
    })
  })

  it('lands on a page that shows notifications', async () => {
    const user = userEvent.setup()
    renderWithProviders(<><Dashboard /><LocationSpy /></>)
    expect(await screen.findByTestId('discover-page')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /notifications/i }))
    const seeAll = await screen.findByRole('link', { name: /see all notifications/i })
    await user.click(seeAll)

    // The assertion that matters: something showing notifications is on screen.
    expect(await screen.findByTestId('notifications-page')).toBeInTheDocument()
    expect(screen.queryByTestId('discover-page')).not.toBeInTheDocument()
  })

  // The URL is a weaker claim than the render, and is asserted separately so a
  // failure says which half broke.
  it('and the URL says so', async () => {
    const user = userEvent.setup()
    renderWithProviders(<><Dashboard /><LocationSpy /></>)
    expect(await screen.findByTestId('discover-page')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await user.click(await screen.findByRole('link', { name: /see all notifications/i }))

    await waitFor(() => {
      expect(screen.getByTestId('location-spy').textContent).toContain('tab=notifications')
    })
  })

  // The general defect behind it: an in-dashboard ?tab= link must switch the
  // page. Every repaired notification link is one of these.
  it('any in-dashboard ?tab= link switches the page, not just this one', async () => {
    const user = userEvent.setup()
    renderWithProviders(<><Dashboard /><LocationSpy /></>)
    expect(await screen.findByTestId('discover-page')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await user.click(await screen.findByRole('link', { name: /see all notifications/i }))
    expect(await screen.findByTestId('notifications-page')).toBeInTheDocument()
  })
})
