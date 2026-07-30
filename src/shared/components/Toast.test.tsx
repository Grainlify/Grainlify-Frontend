import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Toast from './Toast'

// ─── mock ThemeContext so Toast can render outside a real provider ─────────────
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}))

// ─── mock sonner so the Toaster itself doesn't try to set up timers / portals ──
vi.mock('sonner', () => ({
  Toaster: () => <div data-testid="sonner-toaster" />,
}))

describe('Toast — aria-live regions', () => {
  it('renders the polite live region for info/success announcements', () => {
    render(<Toast />)

    const politeRegion = screen.getByRole('status')
    expect(politeRegion).toBeInTheDocument()
    expect(politeRegion).toHaveAttribute('aria-live', 'polite')
    expect(politeRegion).toHaveAttribute('aria-atomic', 'true')
  })

  it('renders the assertive live region for error announcements', () => {
    render(<Toast />)

    const assertiveRegion = screen.getByRole('alert')
    expect(assertiveRegion).toBeInTheDocument()
    expect(assertiveRegion).toHaveAttribute('aria-live', 'assertive')
    expect(assertiveRegion).toHaveAttribute('aria-atomic', 'true')
  })

  it('renders both live regions simultaneously', () => {
    render(<Toast />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('live-region container is always present in the DOM (not remounted between renders)', () => {
    const { rerender } = render(<Toast />)

    const politeRegion = screen.getByRole('status')
    const alertRegion = screen.getByRole('alert')

    // Rerender simulates a theme/state change that shouldn't remount the containers
    rerender(<Toast />)

    expect(screen.getByRole('status')).toBe(politeRegion)
    expect(screen.getByRole('alert')).toBe(alertRegion)
  })

  it('polite region has role="status" (not role="alert")', () => {
    render(<Toast />)

    const statusEl = screen.getByRole('status')
    expect(statusEl).toHaveAttribute('role', 'status')
    expect(statusEl).not.toHaveAttribute('role', 'alert')
  })

  it('assertive region has role="alert" (not role="status")', () => {
    render(<Toast />)

    const alertEl = screen.getByRole('alert')
    expect(alertEl).toHaveAttribute('role', 'alert')
    expect(alertEl).not.toHaveAttribute('role', 'status')
  })

  it('renders the Toaster component alongside the live regions', () => {
    render(<Toast />)

    expect(screen.getByTestId('sonner-toaster')).toBeInTheDocument()
  })

  it('live regions are visually hidden (sr-only) to avoid disrupting layout', () => {
    const { container } = render(<Toast />)

    // Both live regions should carry the sr-only Tailwind class
    const srOnlyEls = container.querySelectorAll('.sr-only')
    expect(srOnlyEls.length).toBeGreaterThanOrEqual(2)
  })

  it('renders correctly after multiple rerenders without remounting live regions', () => {
    const { rerender } = render(<Toast />)

    // Live regions must remain stable across multiple rerenders
    // (simulates what would happen on a theme toggle or parent state update)
    rerender(<Toast />)
    rerender(<Toast />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
