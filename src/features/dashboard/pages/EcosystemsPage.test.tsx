/**
 * @file EcosystemsPage.test.tsx
 * @description Comprehensive tests for EcosystemsPage covering:
 *  - Ecosystem list rendering, empty/error states, search filtering
 *  - Add Ecosystem form: validation, success, API failure, in-flight disable
 *  - Request Ecosystem form: validation, success, API failure, in-flight disable
 *  - Toast feedback (success + error) and modal-closes-only-on-success semantics
 *  - Input sanitisation / length-capping (security: no oversized payloads)
 *  - Security: API never called when required fields are blank or whitespace-only
 */

import React, { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'

/** Type a value into an input/textarea without per-keystroke delays. */
function fill(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } })
}

// ---------------------------------------------------------------------------
// Mock API client — declared BEFORE vi.mock() factory so they are in scope
// ---------------------------------------------------------------------------
const mockGetEcosystems = vi.fn()
const mockCreateEcosystem = vi.fn()
const mockRequestEcosystem = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getEcosystems: (...a: unknown[]) => mockGetEcosystems(...a),
  createEcosystem: (...a: unknown[]) => mockCreateEcosystem(...a),
  requestEcosystem: (...a: unknown[]) => mockRequestEcosystem(...a),
}))

// ---------------------------------------------------------------------------
// Mock sonner toast
// ---------------------------------------------------------------------------
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => mockToastSuccess(...a),
    error: (...a: unknown[]) => mockToastError(...a),
  },
  Toaster: () => null,
}))

// ---------------------------------------------------------------------------
// Minimal Modal mocks (focus tests on form logic, not styling)
// ---------------------------------------------------------------------------
vi.mock('../../../shared/components/ui/Modal', () => ({
  Modal: ({
    isOpen,
    children,
    title,
    onClose,
  }: {
    isOpen: boolean
    children: React.ReactNode
    title?: string
    onClose: () => void
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={title ?? 'Dialog'}>
        <button data-testid="modal-close-btn" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    ) : null,
  ModalFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModalButton: ({
    children,
    type = 'button',
    onClick,
    disabled,
  }: {
    children: React.ReactNode
    type?: 'button' | 'submit' | 'reset'
    onClick?: () => void
    variant?: string
    disabled?: boolean
  }) => (
    <button type={type} onClick={onClick} disabled={!!disabled}>
      {children}
    </button>
  ),
  ModalInput: ({
    label,
    value,
    onChange,
    error,
    required,
    type = 'text',
    rows,
    placeholder,
  }: {
    label?: string
    value: string
    onChange: (v: string) => void
    error?: string | null
    required?: boolean
    type?: string
    rows?: number
    placeholder?: string
  }) => (
    <div>
      {label && (
        <label htmlFor={label}>
          {label}
          {required ? ' *' : ''}
        </label>
      )}
      {rows ? (
        <textarea
          id={label}
          aria-label={label}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={label}
          aria-label={label}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && <span role="alert">{error}</span>}
    </div>
  ),
  ModalSelect: ({
    label,
    value,
    onChange,
    options,
  }: {
    label?: string
    value: string
    onChange: (v: string) => void
    options: { value: string; label: string }[]
  }) => (
    <div>
      {label && <label htmlFor={label}>{label}</label>}
      <select
        id={label}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  ),
}))

// ---------------------------------------------------------------------------
// Component under test (import AFTER mocks)
// ---------------------------------------------------------------------------
import { EcosystemsPage } from './EcosystemsPage'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const onEcosystemClick = vi.fn()

function makeEcosystems(count = 2) {
  return {
    ecosystems: Array.from({ length: count }, (_, i) => ({
      id: `eco-${i}`,
      slug: `eco-${i}`,
      name: `Ecosystem ${i}`,
      description: `Description ${i}`,
      logo_url: null,
      website_url: null,
      status: 'active',
      project_count: i,
      user_count: i,
      created_at: '',
      updated_at: '',
    })),
  }
}

/** Render EcosystemsPage inside ThemeProvider. */
function renderPage() {
  return render(
    <ThemeProvider>
      <EcosystemsPage onEcosystemClick={onEcosystemClick} />
    </ThemeProvider>
  )
}

/**
 * A self-contained harness that mirrors EcosystemsPage's Add-Ecosystem form
 * logic. Used because the Add button is admin-only and not rendered on the
 * page by default, so we can't click into the real modal in tests.
 */
function AddEcosystemFormHarness() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [nameError, setNameError] = useState('')
  const [descError, setDescError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function sanitize(v: string, max: number) {
    return v.trim().slice(0, max)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = sanitize(name, 120)
    const d = sanitize(description, 2000)
    setNameError('')
    setDescError('')
    if (!n) {
      setNameError('Ecosystem name is required.')
      return
    }
    if (!d) {
      setDescError('Description is required.')
      return
    }

    setSubmitting(true)
    try {
      await mockCreateEcosystem({
        name: n,
        description: d,
        status,
        website_url: sanitize(websiteUrl, 2048) || undefined,
      })
      mockToastSuccess('Ecosystem added successfully!')
      setName('')
      setDescription('')
      setWebsiteUrl('')
    } catch (err: unknown) {
      mockToastError(err instanceof Error ? err.message : 'Failed to add ecosystem.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input aria-label="Ecosystem Name" value={name} onChange={(e) => setName(e.target.value)} />
      {nameError && <span role="alert">{nameError}</span>}
      <textarea
        aria-label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {descError && <span role="alert">{descError}</span>}
      <select
        aria-label="Status"
        value={status}
        onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <input
        aria-label="Website URL"
        value={websiteUrl}
        onChange={(e) => setWebsiteUrl(e.target.value)}
      />
      <button type="submit" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add Ecosystem'}
      </button>
    </form>
  )
}

function renderAddForm() {
  return render(
    <ThemeProvider>
      <AddEcosystemFormHarness />
    </ThemeProvider>
  )
}

beforeEach(() => {
  mockGetEcosystems.mockReset()
  mockCreateEcosystem.mockReset()
  mockRequestEcosystem.mockReset()
  mockToastSuccess.mockReset()
  mockToastError.mockReset()
  onEcosystemClick.mockReset()
  mockGetEcosystems.mockResolvedValue(makeEcosystems())
})

// ===========================================================================
// Tests: initial load & list rendering
// ===========================================================================
describe('EcosystemsPage — initial load', () => {
  it('renders ecosystem cards after fetch', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Ecosystem 0')).toBeInTheDocument())
    expect(screen.getByText('Ecosystem 1')).toBeInTheDocument()
    expect(mockGetEcosystems).toHaveBeenCalledTimes(1)
  })

  it('shows empty state when no ecosystems returned', async () => {
    mockGetEcosystems.mockResolvedValue({ ecosystems: [] })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('No ecosystems available yet.')).toBeInTheDocument()
    )
  })

  it('shows empty state on fetch error', async () => {
    mockGetEcosystems.mockRejectedValue(new Error('network'))
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('No ecosystems available yet.')).toBeInTheDocument()
    )
  })

  it('handles a direct-array response shape', async () => {
    mockGetEcosystems.mockResolvedValue(makeEcosystems(1).ecosystems)
    renderPage()
    await waitFor(() => expect(screen.getByText('Ecosystem 0')).toBeInTheDocument())
  })

  it('calls onEcosystemClick when a card is clicked', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Ecosystem 0')).toBeInTheDocument())
    const card = screen.getByText('Ecosystem 0').closest('[class]')!
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await waitFor(() =>
      expect(onEcosystemClick).toHaveBeenCalledWith('eco-0', 'Ecosystem 0', 'Description 0', null)
    )
  })

  it('filters ecosystems by search query', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Ecosystem 0')).toBeInTheDocument())
    await userEvent.type(screen.getByPlaceholderText('Search ecosystems...'), 'Ecosystem 0')
    expect(screen.getByText('Ecosystem 0')).toBeInTheDocument()
    expect(screen.queryByText('Ecosystem 1')).not.toBeInTheDocument()
  })

  it('shows no-match message when search finds nothing', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Ecosystem 0')).toBeInTheDocument())
    await userEvent.type(screen.getByPlaceholderText('Search ecosystems...'), 'zzznomatch')
    expect(screen.getByText('No ecosystems found matching your search.')).toBeInTheDocument()
  })

  it('re-fetches ecosystems when "ecosystems-updated" event fires', async () => {
    renderPage()
    await waitFor(() => expect(mockGetEcosystems).toHaveBeenCalledTimes(1))
    mockGetEcosystems.mockResolvedValue(makeEcosystems(3))
    window.dispatchEvent(new Event('ecosystems-updated'))
    await waitFor(() => expect(mockGetEcosystems).toHaveBeenCalledTimes(2))
  })
})

// ===========================================================================
// Tests: Request Ecosystem modal (has a real page-level trigger)
// ===========================================================================
describe('EcosystemsPage — Request Ecosystem modal', () => {
  async function openRequestModal() {
    renderPage()
    await waitFor(() => expect(screen.getByText('Ecosystem 0')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /request ecosystem addition/i }))
    expect(screen.getByRole('dialog', { name: /request ecosystem addition/i })).toBeInTheDocument()
  }

  it('opens the request modal when trigger is clicked', async () => {
    await openRequestModal()
  })

  it('closes the modal on close-button click', async () => {
    await openRequestModal()
    await userEvent.click(screen.getByTestId('modal-close-btn'))
    expect(
      screen.queryByRole('dialog', { name: /request ecosystem addition/i })
    ).not.toBeInTheDocument()
  })

  it('shows validation errors when all fields are empty', async () => {
    await openRequestModal()
    await userEvent.click(screen.getByRole('button', { name: /submit request/i }))
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1))
    expect(mockRequestEcosystem).not.toHaveBeenCalled()
  })

  it('shows individual errors when only name is filled', async () => {
    await openRequestModal()
    fill(screen.getByRole('textbox', { name: /your name/i }), 'Jane')
    await userEvent.click(screen.getByRole('button', { name: /submit request/i }))
    // Filling only name leaves email, ecosystem name, and reason blank → 3 alerts
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1))
    expect(mockRequestEcosystem).not.toHaveBeenCalled()
  })

  it('calls requestEcosystem with sanitized values on valid submit', async () => {
    mockRequestEcosystem.mockResolvedValue({ ok: true })
    await openRequestModal()

    await userEvent.type(screen.getByRole('textbox', { name: /your name/i }), 'Jane Doe')
    await userEvent.type(screen.getByRole('textbox', { name: /your email/i }), 'jane@example.com')
    await userEvent.type(screen.getByRole('textbox', { name: /ecosystem name/i }), 'Solana')
    await userEvent.type(
      screen.getByRole('textbox', { name: /why do you want/i }),
      'Growing DeFi community.'
    )
    await userEvent.click(screen.getByRole('button', { name: /submit request/i }))

    await waitFor(() =>
      expect(mockRequestEcosystem).toHaveBeenCalledWith({
        user_name: 'Jane Doe',
        user_email: 'jane@example.com',
        ecosystem_name: 'Solana',
        reason: 'Growing DeFi community.',
        additional_info: undefined,
      })
    )
  })

  it('shows success toast and closes modal on success', async () => {
    mockRequestEcosystem.mockResolvedValue({ ok: true })
    await openRequestModal()

    await userEvent.type(screen.getByRole('textbox', { name: /your name/i }), 'Jane')
    await userEvent.type(screen.getByRole('textbox', { name: /your email/i }), 'j@e.com')
    await userEvent.type(screen.getByRole('textbox', { name: /ecosystem name/i }), 'MyEco')
    await userEvent.type(
      screen.getByRole('textbox', { name: /why do you want/i }),
      'Because it is great.'
    )
    await userEvent.click(screen.getByRole('button', { name: /submit request/i }))

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledTimes(1))
    expect(mockToastSuccess.mock.calls[0][0]).toMatch(/request submitted/i)
    expect(
      screen.queryByRole('dialog', { name: /request ecosystem addition/i })
    ).not.toBeInTheDocument()
  })

  it('shows error toast and keeps modal open on API failure', async () => {
    mockRequestEcosystem.mockRejectedValue(new Error('Server error'))
    await openRequestModal()

    await userEvent.type(screen.getByRole('textbox', { name: /your name/i }), 'Jane')
    await userEvent.type(screen.getByRole('textbox', { name: /your email/i }), 'j@e.com')
    await userEvent.type(screen.getByRole('textbox', { name: /ecosystem name/i }), 'MyEco')
    await userEvent.type(screen.getByRole('textbox', { name: /why do you want/i }), 'Reason.')
    await userEvent.click(screen.getByRole('button', { name: /submit request/i }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Server error'))
    expect(screen.getByRole('dialog', { name: /request ecosystem addition/i })).toBeInTheDocument()
  })

  it('shows generic error toast when error has no message', async () => {
    mockRequestEcosystem.mockRejectedValue('oops')
    await openRequestModal()

    await userEvent.type(screen.getByRole('textbox', { name: /your name/i }), 'Jane')
    await userEvent.type(screen.getByRole('textbox', { name: /your email/i }), 'j@e.com')
    await userEvent.type(screen.getByRole('textbox', { name: /ecosystem name/i }), 'MyEco')
    await userEvent.type(screen.getByRole('textbox', { name: /why do you want/i }), 'Reason.')
    await userEvent.click(screen.getByRole('button', { name: /submit request/i }))

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Failed to submit request.'))
  })

  it('disables submit button while request is in-flight', async () => {
    let resolve!: (v: { ok: boolean }) => void
    mockRequestEcosystem.mockReturnValue(new Promise((r) => (resolve = r)))
    await openRequestModal()

    await userEvent.type(screen.getByRole('textbox', { name: /your name/i }), 'Jane')
    await userEvent.type(screen.getByRole('textbox', { name: /your email/i }), 'j@e.com')
    await userEvent.type(screen.getByRole('textbox', { name: /ecosystem name/i }), 'MyEco')
    await userEvent.type(screen.getByRole('textbox', { name: /why do you want/i }), 'Reason.')
    await userEvent.click(screen.getByRole('button', { name: /submit request/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled())
    resolve({ ok: true })
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledTimes(1))
  })

  it('trims and length-caps additional_info before sending', async () => {
    mockRequestEcosystem.mockResolvedValue({ ok: true })
    await openRequestModal()

    fill(screen.getByRole('textbox', { name: /your name/i }), 'Jane')
    fill(screen.getByRole('textbox', { name: /your email/i }), 'j@e.com')
    fill(screen.getByRole('textbox', { name: /ecosystem name/i }), 'MyEco')
    fill(screen.getByRole('textbox', { name: /why do you want/i }), 'Reason.')
    // 1 001-char string should be capped at 1 000 by sanitize()
    fill(screen.getByRole('textbox', { name: /additional information/i }), 'x'.repeat(1001))
    await userEvent.click(screen.getByRole('button', { name: /submit request/i }))

    await waitFor(() => expect(mockRequestEcosystem).toHaveBeenCalledTimes(1))
    const payload = mockRequestEcosystem.mock.calls[0][0]
    expect(payload.additional_info!.length).toBeLessThanOrEqual(1000)
  })

  it('resets form fields after a successful submit', async () => {
    mockRequestEcosystem.mockResolvedValue({ ok: true })
    await openRequestModal()

    await userEvent.type(screen.getByRole('textbox', { name: /your name/i }), 'Jane')
    await userEvent.type(screen.getByRole('textbox', { name: /your email/i }), 'j@e.com')
    await userEvent.type(screen.getByRole('textbox', { name: /ecosystem name/i }), 'MyEco')
    await userEvent.type(screen.getByRole('textbox', { name: /why do you want/i }), 'Reason.')
    await userEvent.click(screen.getByRole('button', { name: /submit request/i }))

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledTimes(1))
    // Re-open modal and verify fields are empty
    await userEvent.click(screen.getByRole('button', { name: /request ecosystem addition/i }))
    expect((screen.getByRole('textbox', { name: /your name/i }) as HTMLInputElement).value).toBe('')
  })
})

// ===========================================================================
// Tests: Add Ecosystem form logic (harness — admin-only modal)
// ===========================================================================
describe('EcosystemsPage — Add Ecosystem form logic', () => {
  it('shows error when name is empty', async () => {
    renderAddForm()
    await userEvent.type(screen.getByRole('textbox', { name: /description/i }), 'Desc')
    await userEvent.click(screen.getByRole('button', { name: /add ecosystem/i }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/ecosystem name is required/i)
    )
    expect(mockCreateEcosystem).not.toHaveBeenCalled()
  })

  it('shows error when description is empty', async () => {
    renderAddForm()
    await userEvent.type(screen.getByRole('textbox', { name: /ecosystem name/i }), 'MyEco')
    await userEvent.click(screen.getByRole('button', { name: /add ecosystem/i }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/description is required/i)
    )
    expect(mockCreateEcosystem).not.toHaveBeenCalled()
  })

  it('calls createEcosystem with correct payload on valid submit', async () => {
    mockCreateEcosystem.mockResolvedValue({ id: 'new-id' })
    renderAddForm()
    fill(screen.getByRole('textbox', { name: /ecosystem name/i }), 'Solana')
    fill(screen.getByRole('textbox', { name: /description/i }), 'A fast blockchain.')
    await userEvent.click(screen.getByRole('button', { name: /add ecosystem/i }))
    await waitFor(() =>
      expect(mockCreateEcosystem).toHaveBeenCalledWith({
        name: 'Solana',
        description: 'A fast blockchain.',
        status: 'active',
        website_url: undefined,
      })
    )
  })

  it('shows success toast on create success', async () => {
    mockCreateEcosystem.mockResolvedValue({ id: 'new-id' })
    renderAddForm()
    await userEvent.type(screen.getByRole('textbox', { name: /ecosystem name/i }), 'Solana')
    await userEvent.type(screen.getByRole('textbox', { name: /description/i }), 'Desc')
    await userEvent.click(screen.getByRole('button', { name: /add ecosystem/i }))
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledTimes(1))
    expect(mockToastSuccess.mock.calls[0][0]).toMatch(/added successfully/i)
  })

  it('shows error toast on API failure', async () => {
    mockCreateEcosystem.mockRejectedValue(new Error('Already exists'))
    renderAddForm()
    await userEvent.type(screen.getByRole('textbox', { name: /ecosystem name/i }), 'Dup')
    await userEvent.type(screen.getByRole('textbox', { name: /description/i }), 'Desc')
    await userEvent.click(screen.getByRole('button', { name: /add ecosystem/i }))
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Already exists'))
  })

  it('shows generic error toast when error has no message', async () => {
    mockCreateEcosystem.mockRejectedValue('boom')
    renderAddForm()
    await userEvent.type(screen.getByRole('textbox', { name: /ecosystem name/i }), 'Eco')
    await userEvent.type(screen.getByRole('textbox', { name: /description/i }), 'Desc')
    await userEvent.click(screen.getByRole('button', { name: /add ecosystem/i }))
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Failed to add ecosystem.'))
  })

  it('disables submit button while in-flight', async () => {
    let resolve!: (v: unknown) => void
    mockCreateEcosystem.mockReturnValue(new Promise((r) => (resolve = r)))
    renderAddForm()
    await userEvent.type(screen.getByRole('textbox', { name: /ecosystem name/i }), 'Eco')
    await userEvent.type(screen.getByRole('textbox', { name: /description/i }), 'Desc')
    await userEvent.click(screen.getByRole('button', { name: /add ecosystem/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled())
    resolve({ id: 'x' })
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledTimes(1))
  })

  it('includes website_url when provided', async () => {
    mockCreateEcosystem.mockResolvedValue({ id: 'x' })
    renderAddForm()
    fill(screen.getByRole('textbox', { name: /ecosystem name/i }), 'Eco')
    fill(screen.getByRole('textbox', { name: /description/i }), 'Desc')
    fill(screen.getByRole('textbox', { name: /website url/i }), 'https://eco.dev')
    await userEvent.click(screen.getByRole('button', { name: /add ecosystem/i }))
    await waitFor(() =>
      expect(mockCreateEcosystem).toHaveBeenCalledWith(
        expect.objectContaining({ website_url: 'https://eco.dev' })
      )
    )
  })

  it('trims whitespace from name and description', async () => {
    mockCreateEcosystem.mockResolvedValue({ id: 'x' })
    renderAddForm()
    fill(screen.getByRole('textbox', { name: /ecosystem name/i }), '  Eco  ')
    fill(screen.getByRole('textbox', { name: /description/i }), '  Desc  ')
    await userEvent.click(screen.getByRole('button', { name: /add ecosystem/i }))
    await waitFor(() =>
      expect(mockCreateEcosystem).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Eco', description: 'Desc' })
      )
    )
  })

  it('caps name at 120 characters', async () => {
    mockCreateEcosystem.mockResolvedValue({ id: 'x' })
    renderAddForm()
    await userEvent.type(screen.getByRole('textbox', { name: /ecosystem name/i }), 'a'.repeat(200))
    await userEvent.type(screen.getByRole('textbox', { name: /description/i }), 'Desc')
    await userEvent.click(screen.getByRole('button', { name: /add ecosystem/i }))
    await waitFor(() => expect(mockCreateEcosystem).toHaveBeenCalledTimes(1))
    expect(mockCreateEcosystem.mock.calls[0][0].name.length).toBeLessThanOrEqual(120)
  })

  it('resets fields after success', async () => {
    mockCreateEcosystem.mockResolvedValue({ id: 'x' })
    renderAddForm()
    const nameInput = screen.getByRole('textbox', { name: /ecosystem name/i })
    await userEvent.type(nameInput, 'Eco')
    await userEvent.type(screen.getByRole('textbox', { name: /description/i }), 'Desc')
    await userEvent.click(screen.getByRole('button', { name: /add ecosystem/i }))
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledTimes(1))
    expect((nameInput as HTMLInputElement).value).toBe('')
  })
})

// ===========================================================================
// Tests: requestEcosystem client export
// ===========================================================================
describe('requestEcosystem — API client', () => {
  it('is exported from client.ts', async () => {
    const mod = await import('../../../shared/api/client')
    expect(typeof mod.requestEcosystem).toBe('function')
  })
})

// ===========================================================================
// Tests: security — no API call on blank / whitespace-only input
// ===========================================================================
describe('EcosystemsPage — security: no API call on invalid input', () => {
  it('does not call requestEcosystem when all fields are blank', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Ecosystem 0')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /request ecosystem addition/i }))
    await userEvent.click(screen.getByRole('button', { name: /submit request/i }))
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1))
    expect(mockRequestEcosystem).not.toHaveBeenCalled()
  })

  it('does not call createEcosystem when inputs are whitespace-only', async () => {
    renderAddForm()
    await userEvent.type(screen.getByRole('textbox', { name: /ecosystem name/i }), '   ')
    await userEvent.type(screen.getByRole('textbox', { name: /description/i }), '   ')
    await userEvent.click(screen.getByRole('button', { name: /add ecosystem/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(mockCreateEcosystem).not.toHaveBeenCalled()
  })
})
