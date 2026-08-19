import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { KYCReview } from './KYCReview'

const mockGetPending = vi.fn()
const mockGetReasonCodes = vi.fn()
const mockReset = vi.fn()
vi.mock('../../../shared/api/client', () => ({
  getKYCPendingReviews: (...a: unknown[]) => mockGetPending(...a),
  getKYCReasonCodes: (...a: unknown[]) => mockGetReasonCodes(...a),
  resetKYCWithReason: (...a: unknown[]) => mockReset(...a),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }))
vi.mock('lucide-react', () => ({
  Loader2: () => null, Copy: () => null, Check: () => null, AlertCircle: () => null,
  Clock: () => null, RotateCcw: () => null, X: () => null, ChevronDown: () => null,
}))

/** The production crash, pinned.
 *
 *  `suggested_reason_codes` arrives as null, not [], because Go marshals a nil
 *  slice as null and the suggestion builder returned nil whenever nothing
 *  mapped. Reading `.length` off it threw during render, and with no error
 *  boundary above the admin tab that unmounted the entire application - the
 *  navbar with it. The admin saw white and could not tell whether the reset
 *  they had just clicked had gone through.
 *
 *  Fixed at both ends: the server now sends [], and every call site here treats
 *  the field as possibly absent. This test pins the client half, because the
 *  client is what has to survive an older server, a cached response, or the
 *  next nil slice somebody adds.
 */
describe('KYCReview with no suggestions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetReasonCodes.mockResolvedValue({
      reason_codes: [
        { code: 'document_unreadable', label: "Couldn't be read", message: 'm', needs_note: false },
        { code: 'other', label: 'Something else', message: '', needs_note: true },
      ],
    })
  })

  const rowWith = (suggestions: string[] | null) => ({
    pending: [{
      user_id: 'u1', github_login: 'someone', avatar_url: '', kyc_status: 'in_review',
      waiting_since: new Date().toISOString(), previous_resets: 0,
      kyc_session_id: 's1', session_number: '7',
      suggested_reason_codes: suggestions,
    }],
  })

  it('opens the reset modal when the server sends null, instead of blanking the page', async () => {
    mockGetPending.mockResolvedValue(rowWith(null))
    renderWithProviders(<KYCReview />)
    expect(await screen.findByText('someone')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /send feedback/i }))

    // The modal renders at all - this threw before.
    expect(await screen.findByText(/What should they fix/i)).toBeInTheDocument()
    // And says so plainly rather than showing an empty picker.
    expect(screen.getByText(/No suggestion for this one/i)).toBeInTheDocument()
  })

  it('treats null and [] identically, since the server has sent both', async () => {
    mockGetPending.mockResolvedValue(rowWith([]))
    renderWithProviders(<KYCReview />)
    expect(await screen.findByText('someone')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /send feedback/i }))
    expect(await screen.findByText(/No suggestion for this one/i)).toBeInTheDocument()
  })

  it('still preselects a lone suggestion when there is one', async () => {
    mockGetPending.mockResolvedValue(rowWith(['document_unreadable']))
    renderWithProviders(<KYCReview />)
    expect(await screen.findByText('someone')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /send feedback/i }))
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Couldn't be read/i })).toBeChecked()
    )
  })
})
