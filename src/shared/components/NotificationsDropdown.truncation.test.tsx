import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { renderWithProviders, screen, waitFor } from '../../test/renderWithProviders'
import { NotificationsDropdown } from './NotificationsDropdown'

const mockGet = vi.fn()
const mockCount = vi.fn()
vi.mock('../api/client', () => ({
  getNotificationCount: (...a: unknown[]) => mockCount(...a),
  getNotifications: (...a: unknown[]) => mockGet(...a),
  markNotificationRead: vi.fn(() => Promise.resolve({ ok: true })),
  markAllNotificationsRead: vi.fn(() => Promise.resolve({ ok: true })),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function LocationSpy() {
  const l = useLocation()
  return <div data-testid="loc">{l.pathname + l.search}</div>
}

/** The real KYC feedback message, at the length production actually stores.
 *  603 characters is a message an admin genuinely sent. */
const LONG_BODY =
  "Our checks couldn't read your date of birth from the document photo, and the " +
  "machine-readable strip along the bottom didn't scan. Photograph the original " +
  "physical document rather than a screen or a photocopy, in bright and even light, " +
  "with all four corners inside the frame and no fingers covering the strip. Lay it " +
  "flat on a dark surface, hold the camera parallel to it rather than at an angle, " +
  "and take the picture without flash so the laminate doesn't reflect. If the " +
  "document is worn along that strip, a passport works better than a national ID " +
  "card because the strip is printed on a stiffer page and survives handling."

const KYC_LINK = '/dashboard?tab=settings&subtab=billing'

/** WHAT THIS FILE PROTECTS, AND HOW THE RULE CHANGED.
 *
 *  The original bug was never the clamp on its own. It was clipped text PLUS
 *  nowhere to read the rest: the dropdown cut the body at two lines and the
 *  click went to billing settings, which never renders a body, so the sentence
 *  telling somebody what to fix was unreachable anywhere in the product. This
 *  file used to forbid clamping outright, because at the time that was the only
 *  half of the conjunction we could fix.
 *
 *  The page fixed the other half. So clamping is now allowed — but ONLY from a
 *  row that offers a way to the full text, and these assertions are deliberately
 *  written as a conjunction so that neither half can be removed on its own. A
 *  clamp that ships alongside a click-through to link_path reproduces the
 *  original bug exactly, one layer over, and it would still pass a test that
 *  only checked for the clamp.
 *
 *  Note also why the assertions are structural rather than textual: line-clamp
 *  is purely visual, the full string is in the DOM either way, and jsdom
 *  computes no layout. A "the text is present" test passed WITH the original
 *  bug. That is why nothing caught it.
 */
describe('a clamped dropdown body always has a route to the full text', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCount.mockResolvedValue({ count: 1 })
    mockGet.mockResolvedValue({
      notifications: [{
        id: 'n1', type: 'kyc_reset',
        title: 'Your verification was reset — here is what to fix',
        body: LONG_BODY,
        link_path: KYC_LINK,
        read_at: null, created_at: new Date().toISOString(),
      }],
    })
  })

  const open = async () => {
    renderWithProviders(
      <><NotificationsDropdown showMobileNav={false} closeMobileNav={() => {}} /><LocationSpy /></>,
      { route: '/dashboard' }
    )
    await userEvent.click(screen.getByRole('button', { name: /^notifications$/i }))
    return screen.findByText(LONG_BODY)
  }

  it('clamps the body to three lines', async () => {
    const body = await open()
    expect(body.className).toMatch(/line-clamp-3/)
  })

  // The half that makes the clamp above safe. If this fails, the clamp is a bug.
  it('and the row goes to the notifications page, where nothing is clamped', async () => {
    const body = await open()
    await userEvent.click(body)
    await waitFor(() => {
      expect(screen.getByTestId('loc').textContent).toContain('tab=notifications')
    })
    // Emphatically NOT link_path: billing settings never renders a body, and
    // landing there from a clipped message is the original bug.
    expect(screen.getByTestId('loc').textContent).not.toContain('subtab=billing')
  })

  // ...and it carries the notification's id, so the page opens at the message
  // rather than at the top of a list.
  it('and it points at that specific notification', async () => {
    const body = await open()
    await userEvent.click(body)
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toContain('n=n1'))
  })

  // link_path is not lost, it is demoted: an explicit labelled link inside the
  // row, exactly as on the page. Reading and travelling are two intentions.
  it('keeps link_path as a separate labelled link', async () => {
    await open()
    const link = screen.getByRole('link', { name: /Go to verification/i })
    expect(link).toHaveAttribute('href', KYC_LINK)
  })

  it('does not clip the title', async () => {
    await open()
    const title = await screen.findByText('Your verification was reset — here is what to fix')
    expect(title.className).not.toMatch(/\btruncate\b/)
    expect(title.className).not.toMatch(/line-clamp/)
  })

  // Paragraph breaks an admin typed are part of the message.
  it('preserves line breaks the admin wrote', async () => {
    mockGet.mockResolvedValue({
      notifications: [{
        id: 'n2', type: 'kyc_reset', title: 't',
        body: 'First line.\n\nSecond paragraph.',
        link_path: null, read_at: null, created_at: new Date().toISOString(),
      }],
    })
    renderWithProviders(<NotificationsDropdown showMobileNav={false} closeMobileNav={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /^notifications$/i }))
    const el = await screen.findByText(/First line/)
    expect(el.className).toMatch(/whitespace-pre-line/)
  })
})
