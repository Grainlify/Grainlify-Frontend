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

const toastSuccess = vi.fn()
const toastWarning = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    warning: (...a: unknown[]) => toastWarning(...a),
    error: (...a: unknown[]) => toastError(...a),
  },
}))

vi.mock('lucide-react', () => ({
  Loader2: () => null,
  Copy: () => null,
  Check: () => null,
  AlertCircle: () => null,
  Clock: () => null,
  RotateCcw: () => null,
  X: () => null,
  ChevronDown: () => null,
}))

const REASONS = [
  {
    code: 'document_is_a_screen_photo',
    label: 'Photo of a screen, not the document',
    message: 'The upload looked like a photo of a screen. Photograph the original physical document directly.',
    needs_note: false,
  },
  {
    code: 'document_unreadable',
    label: "Document couldn't be read",
    message: 'Some details could not be read. Take the photo in bright, even light.',
    needs_note: false,
  },
  { code: 'other', label: 'Something else (write a note)', message: '', needs_note: true },
]

function pendingRow(over: Record<string, unknown> = {}) {
  return {
    user_id: 'u1',
    github_login: 'teethaking',
    avatar_url: '',
    kyc_status: 'rejected',
    waiting_since: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    previous_resets: 0,
    kyc_session_id: 'sess-11111111-2222-3333-4444-555555555555',
    suggested_reason_codes: ['document_is_a_screen_photo'],
    ...over,
  }
}

describe('KYCReview', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetReasonCodes.mockResolvedValue({ reason_codes: REASONS })
  })

  it('lists who is waiting, without any of the provider decision', async () => {
    mockGetPending.mockResolvedValue({
      pending: [pendingRow(), pendingRow({ user_id: 'u2', github_login: 'yusstyle', kyc_status: 'in_review' })],
    })
    renderWithProviders(<KYCReview />)

    expect(await screen.findByText('teethaking')).toBeInTheDocument()
    expect(screen.getByText('yusstyle')).toBeInTheDocument()
    expect(screen.getByText('Refused')).toBeInTheDocument()
    expect(screen.getByText('In review')).toBeInTheDocument()
  })

  // The reason picker shows the exact message before the choice is made.
  // A picker that hides the resulting message asks somebody to choose blind,
  // which defeats the point of wording the list in advance.
  it('shows the exact message the contributor will read, before choosing', async () => {
    mockGetPending.mockResolvedValue({ pending: [pendingRow()] })
    const user = userEvent.setup()
    renderWithProviders(<KYCReview />)

    await user.click(await screen.findByRole('button', { name: /Send feedback/i }))
    expect(await screen.findByText(/Photograph the original physical document/i)).toBeInTheDocument()
    expect(screen.getByText(/Take the photo in bright, even light/i)).toBeInTheDocument()
  })

  // The two fields that were once one column. The admin's justification went
  // to the contributor verbatim; the labels have to make the split obvious.
  it('separates what the contributor reads from the internal reason', async () => {
    mockGetPending.mockResolvedValue({ pending: [pendingRow()] })
    const user = userEvent.setup()
    renderWithProviders(<KYCReview />)

    await user.click(await screen.findByRole('button', { name: /Send feedback/i }))
    expect(await screen.findByText(/they read this/i)).toBeInTheDocument()
    expect(screen.getByText(/internal — they never see this/i)).toBeInTheDocument()
  })

  it('sends the chosen code, the note and the internal reason as separate fields', async () => {
    mockGetPending.mockResolvedValue({ pending: [pendingRow()] })
    mockReset.mockResolvedValue({ ok: true, notified: true, message_sent: 'x', reason_code: 'document_is_a_screen_photo' })
    const user = userEvent.setup()
    renderWithProviders(<KYCReview />)

    await user.click(await screen.findByRole('button', { name: /Send feedback/i }))
    await user.type(screen.getByPlaceholderText(/Optional, added after/i), 'both uploads were screenshots')
    await user.type(screen.getByPlaceholderText(/Recorded against the reset/i), 'second attempt, escalated')
    await user.click(screen.getByRole('button', { name: /Send & reset/i }))

    await waitFor(() => expect(mockReset).toHaveBeenCalledTimes(1))
    expect(mockReset).toHaveBeenCalledWith('u1', {
      reason_code: 'document_is_a_screen_photo',
      note: 'both uploads were screenshots',
      reason: 'second attempt, escalated',
    })
  })

  // A reset whose notification failed is a reset the contributor does not know
  // about. Reporting it as sent would rebuild the silence this removed.
  it('does not claim the contributor was told when they were not', async () => {
    mockGetPending.mockResolvedValue({ pending: [pendingRow()] })
    mockReset.mockResolvedValue({ ok: true, notified: false, message_sent: 'x', reason_code: 'document_unreadable' })
    const user = userEvent.setup()
    renderWithProviders(<KYCReview />)

    await user.click(await screen.findByRole('button', { name: /Send feedback/i }))
    await user.type(screen.getByPlaceholderText(/Recorded against the reset/i), 'internal')
    await user.click(screen.getByRole('button', { name: /Send & reset/i }))

    await waitFor(() => expect(mockReset).toHaveBeenCalled())
    expect(toastWarning).toHaveBeenCalledWith(expect.stringMatching(/did not reach them/i))
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("says so plainly when there is no suggestion, rather than showing an empty picker", async () => {
    // The commonest cause: a refusal whose only warnings are fraud signals,
    // which are deliberately never mapped to anything a contributor is told.
    mockGetPending.mockResolvedValue({ pending: [pendingRow({ suggested_reason_codes: [] })] })
    const user = userEvent.setup()
    renderWithProviders(<KYCReview />)

    await user.click(await screen.findByRole('button', { name: /Send feedback/i }))
    expect(await screen.findByText(/No suggestion for this one/i)).toBeInTheDocument()
    // And nothing is pre-selected, so no reason is chosen on the admin's behalf.
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked()
    }
  })

  it('pre-selects a lone suggestion but never chooses between two', async () => {
    mockGetPending.mockResolvedValue({
      pending: [pendingRow({ suggested_reason_codes: ['document_is_a_screen_photo', 'document_unreadable'] })],
    })
    const user = userEvent.setup()
    renderWithProviders(<KYCReview />)

    await user.click(await screen.findByRole('button', { name: /Send feedback/i }))
    await screen.findByText(/Photograph the original physical document/i)
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked()
    }
  })

  it('will not send "other" without a note, or anything without an internal reason', async () => {
    mockGetPending.mockResolvedValue({ pending: [pendingRow({ suggested_reason_codes: [] })] })
    const user = userEvent.setup()
    renderWithProviders(<KYCReview />)

    await user.click(await screen.findByRole('button', { name: /Send feedback/i }))
    const send = await screen.findByRole('button', { name: /Send & reset/i })

    await user.click(screen.getByRole('radio', { name: /Something else/i }))
    await user.type(screen.getByPlaceholderText(/Recorded against the reset/i), 'internal only')
    expect(send).toBeDisabled() // 'other' still needs the note the contributor reads

    await user.type(screen.getByPlaceholderText(/Required — this is all they will have/i), 'we could not read the expiry date')
    expect(send).toBeEnabled()
  })

  it('tells the admin the message is in-app, not an email', async () => {
    mockGetPending.mockResolvedValue({ pending: [pendingRow()] })
    const user = userEvent.setup()
    renderWithProviders(<KYCReview />)

    await user.click(await screen.findByRole('button', { name: /Send feedback/i }))
    expect(await screen.findByText(/in their\s+notifications on Grainlify/i)).toBeInTheDocument()
    expect(screen.queryByText(/email/i)).not.toBeInTheDocument()
  })

  it('cannot send when the reason list failed to load', async () => {
    mockGetPending.mockResolvedValue({ pending: [pendingRow()] })
    mockGetReasonCodes.mockRejectedValue(new Error('boom'))
    renderWithProviders(<KYCReview />)

    const btn = await screen.findByRole('button', { name: /Send feedback/i })
    await waitFor(() => expect(btn).toBeDisabled())
    expect(toastError).toHaveBeenCalled()
  })
})

describe('KYCReview: matching a row to a provider session', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetReasonCodes.mockResolvedValue({ reason_codes: REASONS })
  })

  // Without this, a reviewer matches a queue row to a session in the provider
  // console by GitHub username - which the console does not index by.
  it('shows the session id on the row, with a copy control', async () => {
    mockGetPending.mockResolvedValue({ pending: [pendingRow()] })
    const user = userEvent.setup()
    // After setup(), deliberately: userEvent installs its own clipboard stub,
    // so a spy defined before it is replaced and never called. jsdom also
    // exposes navigator.clipboard as getter-only, hence defineProperty.
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    renderWithProviders(<KYCReview />)

    expect(await screen.findByText('sess-11111111-2222-3333-4444-555555555555')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /copy session id for teethaking/i }))
    expect(writeText).toHaveBeenCalledWith('sess-11111111-2222-3333-4444-555555555555')
  })

  it('says "no live session" rather than showing a blank when it has been reset', async () => {
    mockGetPending.mockResolvedValue({ pending: [pendingRow({ kyc_session_id: '' })] })
    renderWithProviders(<KYCReview />)
    expect(await screen.findByText(/no live session/i)).toBeInTheDocument()
  })

  // The two systems do not talk. A reviewer who resets here without declining
  // in Didit leaves a session sitting in the provider's own queue.
  it('warns that a reset does not reach Didit, before the reset is sent', async () => {
    mockGetPending.mockResolvedValue({ pending: [pendingRow()] })
    const user = userEvent.setup()
    renderWithProviders(<KYCReview />)

    await user.click(await screen.findByRole('button', { name: /Send feedback/i }))
    expect(await screen.findByText(/does not reach Didit/i)).toBeInTheDocument()
    expect(screen.getByText(/Decline the session there first/i)).toBeInTheDocument()
  })
})
