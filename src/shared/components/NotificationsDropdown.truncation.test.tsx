import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../test/renderWithProviders'
import { NotificationsDropdown } from './NotificationsDropdown'

const mockGet = vi.fn()
const mockCount = vi.fn()
vi.mock('../api/client', () => ({
  getNotificationCount: (...a: unknown[]) => mockCount(...a),
  getNotifications: (...a: unknown[]) => mockGet(...a),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

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

describe('NotificationsDropdown does not truncate a feedback message', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCount.mockResolvedValue({ count: 1 })
    mockGet.mockResolvedValue({
      notifications: [{
        id: 'n1', type: 'kyc_reset',
        title: 'Your verification was reset — here is what to fix',
        body: LONG_BODY,
        link_path: '/dashboard?tab=settings&subtab=billing',
        read_at: null, created_at: new Date().toISOString(),
      }],
    })
  })

  // NOTE ON WHAT THIS CAN AND CANNOT CATCH.
  //
  // A test asserting the text is in the DOM passes WITH the bug: line-clamp is
  // purely visual, so the full string is present in jsdom either way, and jsdom
  // computes no layout to reveal the clipping. That is exactly why this shipped
  // and why nothing caught it.
  //
  // So the assertion has to be structural - on the classes that do the clipping.
  // It is more brittle than a text assertion and it is the only kind that can
  // fail here.
  it('renders the whole body, and carries no clamping class', async () => {
    renderWithProviders(<NotificationsDropdown showMobileNav={false} closeMobileNav={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /notification/i }))
    const body = await screen.findByText(LONG_BODY)
    expect(body).toBeInTheDocument()
    expect(body.className).not.toMatch(/line-clamp/)
    expect(body.className).not.toMatch(/\btruncate\b/)
    expect(body.className).not.toMatch(/text-ellipsis/)
  })

  it('does not clip the title either', async () => {
    renderWithProviders(<NotificationsDropdown showMobileNav={false} closeMobileNav={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /notification/i }))
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
    await userEvent.click(screen.getByRole('button', { name: /notification/i }))
    const el = await screen.findByText(/First line/)
    expect(el.className).toMatch(/whitespace-pre-line/)
  })
})
