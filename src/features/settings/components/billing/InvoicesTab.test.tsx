// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InvoicesTab } from './InvoicesTab'
import { renderWithTheme } from '../../../../test/renderWithTheme'
import type { Invoice } from '../../types'

// ── Hoisted mock factories ────────────────────────────────────────────────────
const { mockDownloadInvoice } = vi.hoisted(() => ({
  mockDownloadInvoice: vi.fn(),
}))

vi.mock('../../../../shared/api/client', () => ({
  downloadInvoice: mockDownloadInvoice,
}))

vi.mock('../../../../shared/utils/logger', () => ({
  logger: { debug: vi.fn() },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────
const INVOICE_PAID: Invoice = {
  id: 'inv-1',
  invoiceNumber: 'INV-2024-001',
  date: '2024-01-15',
  amount: 99.99,
  currency: 'USD',
  status: 'paid',
  description: 'Monthly subscription',
  billingPeriod: 'Jan 2024',
}

const INVOICE_PENDING: Invoice = {
  id: 'inv-2',
  invoiceNumber: 'INV-2024-002',
  date: '2024-02-15',
  amount: 149.99,
  currency: 'USD',
  status: 'pending',
  description: 'Pro plan',
  billingPeriod: 'Feb 2024',
}

const INVOICE_OVERDUE: Invoice = {
  id: 'inv-3',
  invoiceNumber: 'INV-2024-003',
  date: '2024-03-15',
  amount: 49.99,
  currency: 'USD',
  status: 'overdue',
  description: 'Starter plan',
  billingPeriod: 'Mar 2024',
}

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeEach(() => {
  if (!globalThis.localStorage) {
    const store = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value)
        },
        removeItem: (key: string) => {
          store.delete(key)
        },
        clear: () => {
          store.clear()
        },
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        get length() {
          return store.size
        },
      },
      configurable: true,
      writable: true,
    })
  }

  // jsdom does not implement these; provide stubs so the component can run.
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
  URL.revokeObjectURL = vi.fn()
})

function setup(invoices: Invoice[] = [INVOICE_PAID]) {
  return renderWithTheme(<InvoicesTab invoices={invoices} />)
}

function parseCssBlock(css: string, selector: ':root' | '.dark'): string {
  const marker = `${selector} {`
  const startIndex = css.indexOf(marker)
  if (startIndex === -1) {
    throw new Error(`Missing CSS block: ${selector}`)
  }

  let openBraces = 0
  const contentStart = startIndex + marker.length
  for (let i = contentStart; i < css.length; i += 1) {
    if (css[i] === '{') openBraces += 1
    if (css[i] === '}') {
      if (openBraces === 0) {
        return css.slice(contentStart, i)
      }
      openBraces -= 1
    }
  }

  throw new Error(`Unterminated CSS block: ${selector}`)
}

function getCssVarValue(block: string, variableName: string): string {
  const regex = new RegExp(`--${variableName}\\s*:\\s*([^;]+);`)
  const match = block.match(regex)
  if (!match) {
    throw new Error(`Missing CSS variable --${variableName}`)
  }
  return match[1].trim()
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.trim()
  const match = normalized.match(/^#([a-fA-F0-9]{6})$/)
  if (!match) {
    throw new Error(`Expected 6-digit hex color, received: ${hex}`)
  }

  const value = match[1]
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

function channelToLinearRgb(channel: number): number {
  const normalized = channel / 255
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return (
    0.2126 * channelToLinearRgb(r) + 0.7152 * channelToLinearRgb(g) + 0.0722 * channelToLinearRgb(b)
  )
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA)
  const lumB = relativeLuminance(hexB)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}

// ── Rendering ─────────────────────────────────────────────────────────────────
describe('InvoicesTab — rendering', () => {
  it('shows the empty state when there are no invoices', () => {
    setup([])
    expect(screen.getByText('No invoices yet')).toBeInTheDocument()
  })

  it('renders a row for each invoice', () => {
    setup([INVOICE_PAID, INVOICE_PENDING, INVOICE_OVERDUE])
    expect(screen.getByText('INV-2024-001')).toBeInTheDocument()
    expect(screen.getByText('INV-2024-002')).toBeInTheDocument()
    expect(screen.getByText('INV-2024-003')).toBeInTheDocument()
  })

  it('renders all three status variants without error', () => {
    setup([INVOICE_PAID, INVOICE_PENDING, INVOICE_OVERDUE])
    expect(screen.getByText('paid')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('overdue')).toBeInTheDocument()
  })
})

describe('InvoicesTab — status token mapping', () => {
  it('uses success token classes for paid invoices', () => {
    setup([INVOICE_PAID])
    const badge = screen.getByText('paid').parentElement
    const icon = badge?.querySelector('svg')

    expect(badge).toHaveClass('bg-[var(--status-success-bg)]')
    expect(badge).toHaveClass('border-[var(--status-success-border)]')
    expect(screen.getByText('paid')).toHaveClass('text-[var(--status-success-foreground)]')
    expect(icon).toHaveClass('text-[var(--status-success-foreground)]')
  })

  it('uses pending token classes for pending invoices', () => {
    setup([INVOICE_PENDING])
    const badge = screen.getByText('pending').parentElement
    const icon = badge?.querySelector('svg')

    expect(badge).toHaveClass('bg-[var(--status-pending-bg)]')
    expect(badge).toHaveClass('border-[var(--status-pending-border)]')
    expect(screen.getByText('pending')).toHaveClass('text-[var(--status-pending-foreground)]')
    expect(icon).toHaveClass('text-[var(--status-pending-foreground)]')
  })

  it('uses error token classes for overdue invoices', () => {
    setup([INVOICE_OVERDUE])
    const badge = screen.getByText('overdue').parentElement
    const icon = badge?.querySelector('svg')

    expect(badge).toHaveClass('bg-[var(--status-error-bg)]')
    expect(badge).toHaveClass('border-[var(--status-error-border)]')
    expect(screen.getByText('overdue')).toHaveClass('text-[var(--status-error-foreground)]')
    expect(icon).toHaveClass('text-[var(--status-error-foreground)]')
  })
})

describe('Status tokens — contrast and semantics', () => {
  it('meets WCAG AA contrast for status foreground against status background in light and dark themes', () => {
    const themeCss = readFileSync(join(process.cwd(), 'src/styles/theme.css'), 'utf8')
    const lightBlock = parseCssBlock(themeCss, ':root')
    const darkBlock = parseCssBlock(themeCss, '.dark')

    const statusKinds = ['success', 'error', 'warning', 'pending'] as const
    for (const status of statusKinds) {
      const lightText = getCssVarValue(lightBlock, `status-${status}-foreground`)
      const lightBg = getCssVarValue(lightBlock, `status-${status}-bg`)
      const darkText = getCssVarValue(darkBlock, `status-${status}-foreground`)
      const darkBg = getCssVarValue(darkBlock, `status-${status}-bg`)

      expect(contrastRatio(lightText, lightBg)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(darkText, darkBg)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps pending and warning semantic tokens distinct', () => {
    const themeCss = readFileSync(join(process.cwd(), 'src/styles/theme.css'), 'utf8')
    const lightBlock = parseCssBlock(themeCss, ':root')

    expect(getCssVarValue(lightBlock, 'status-pending')).not.toBe(
      getCssVarValue(lightBlock, 'status-warning')
    )
    expect(getCssVarValue(lightBlock, 'status-pending-foreground')).not.toBe(
      getCssVarValue(lightBlock, 'status-warning-foreground')
    )
  })
})

// ── Download success ──────────────────────────────────────────────────────────
describe('InvoicesTab — download success', () => {
  it('calls downloadInvoice with the correct invoice id', async () => {
    mockDownloadInvoice.mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }))
    setup()
    await userEvent.click(screen.getByRole('button', { name: /download invoice/i }))
    await waitFor(() => expect(mockDownloadInvoice).toHaveBeenCalledWith('inv-1'))
  })

  it('creates an object URL from the returned blob then revokes it', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' })
    mockDownloadInvoice.mockResolvedValue(blob)
    setup()
    await userEvent.click(screen.getByRole('button', { name: /download invoice/i }))
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  it('downloads without error when invoiceNumber contains only safe characters', async () => {
    mockDownloadInvoice.mockResolvedValue(new Blob())
    setup()
    await userEvent.click(screen.getByRole('button', { name: /download invoice/i }))
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalled())
  })

  it('clears the row error when a subsequent download succeeds', async () => {
    mockDownloadInvoice
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValue(new Blob())

    setup()
    const btn = screen.getByRole('button', { name: /download invoice/i })
    await userEvent.click(btn)
    await screen.findByRole('alert')

    await userEvent.click(btn)
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})

// ── Download error ────────────────────────────────────────────────────────────
describe('InvoicesTab — download error', () => {
  it('shows the error message in a per-row alert on failure', async () => {
    mockDownloadInvoice.mockRejectedValue(new Error('Network error'))
    setup()
    await userEvent.click(screen.getByRole('button', { name: /download invoice/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Network error')
  })

  it('shows a fallback message when the thrown value is not an Error instance', async () => {
    mockDownloadInvoice.mockRejectedValue('unexpected string')
    setup()
    await userEvent.click(screen.getByRole('button', { name: /download invoice/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Download failed. Please try again.')
  })

  it('isolates the error to the failing row only', async () => {
    mockDownloadInvoice
      .mockRejectedValueOnce(new Error('Row 1 failed'))
      .mockResolvedValue(new Blob())

    setup([INVOICE_PAID, INVOICE_PENDING])
    const [btn1] = screen.getAllByRole('button', { name: /download invoice/i })
    await userEvent.click(btn1)
    await screen.findByRole('alert')

    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('does not call createObjectURL or revokeObjectURL on failure', async () => {
    mockDownloadInvoice.mockRejectedValue(new Error('Server error'))
    setup()
    await userEvent.click(screen.getByRole('button', { name: /download invoice/i }))
    await screen.findByRole('alert')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })
})

// ── Loading state ─────────────────────────────────────────────────────────────
describe('InvoicesTab — loading state', () => {
  it('disables the button and updates aria-label while the fetch is in flight', async () => {
    let resolve!: (b: Blob) => void
    mockDownloadInvoice.mockReturnValue(
      new Promise<Blob>((res) => {
        resolve = res
      })
    )

    setup()
    const btn = screen.getByRole('button', { name: /download invoice/i })
    await userEvent.click(btn)

    await waitFor(() => expect(btn).toBeDisabled())
    expect(btn).toHaveAttribute('aria-label', 'Downloading…')

    resolve(new Blob())
    await waitFor(() => expect(btn).not.toBeDisabled())
    expect(btn).toHaveAttribute('aria-label', 'Download Invoice')
  })

  it('only disables the row being fetched, leaving other rows enabled', async () => {
    let resolve!: (b: Blob) => void
    mockDownloadInvoice.mockReturnValue(
      new Promise<Blob>((res) => {
        resolve = res
      })
    )

    setup([INVOICE_PAID, INVOICE_PENDING])
    const [btn1, btn2] = screen.getAllByRole('button', { name: /download invoice/i })
    await userEvent.click(btn1)

    await waitFor(() => expect(btn1).toBeDisabled())
    expect(btn2).not.toBeDisabled()

    resolve(new Blob())
    await waitFor(() => expect(btn1).not.toBeDisabled())
  })
})

// ── Responsive layout ─────────────────────────────────────────────────────────
describe('InvoicesTab — responsive layout', () => {
  it('wraps the invoice table in an overflow-x-auto scroll container', () => {
    const { container } = setup()
    expect(container.querySelector('.overflow-x-auto')).not.toBeNull()
  })

  it('sets a minimum width on the inner container to prevent column collapse', () => {
    const { container } = setup()
    const scrollContainer = container.querySelector('.overflow-x-auto')
    expect(scrollContainer?.firstElementChild?.className).toMatch(/min-w-/)
  })
})

// ── Dark theme — covers the theme === 'dark' branches in every ternary ────────
describe('InvoicesTab — dark theme', () => {
  it('renders the invoice table in dark theme without error', () => {
    renderWithTheme(<InvoicesTab invoices={[INVOICE_PAID, INVOICE_PENDING, INVOICE_OVERDUE]} />, {
      theme: 'dark',
    })
    expect(screen.getByText('INV-2024-001')).toBeInTheDocument()
    expect(screen.getByText('paid')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('overdue')).toBeInTheDocument()
  })

  it('renders the empty state in dark theme without error', () => {
    renderWithTheme(<InvoicesTab invoices={[]} />, { theme: 'dark' })
    expect(screen.getByText('No invoices yet')).toBeInTheDocument()
  })

  it('shows the download error alert in dark theme', async () => {
    mockDownloadInvoice.mockRejectedValue(new Error('Dark theme network error'))
    renderWithTheme(<InvoicesTab invoices={[INVOICE_PAID]} />, { theme: 'dark' })
    await userEvent.click(screen.getByRole('button', { name: /download invoice/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Dark theme network error')
  })
})
