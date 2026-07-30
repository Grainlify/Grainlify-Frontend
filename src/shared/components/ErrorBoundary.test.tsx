// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'
import { logger } from '../utils/logger'
import { renderWithTheme } from '../../test/renderWithTheme'

vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

const loggerError = vi.mocked(logger.error)

const preventUnhandledErrorLog = (event: ErrorEvent) => {
  event.preventDefault()
}

/** Throws during render so tests exercise React's error boundary path. */
function ThrowingChild({ message = 'Boundary boom' }: { message?: string }): never {
  throw new Error(message)
}

/** A component that renders normally. */
function SafeChild() {
  return <p>Safe content</p>
}

function ControllableChild({ shouldThrow, message }: { shouldThrow: boolean; message: string }) {
  if (shouldThrow) {
    throw new Error(message)
  }

  return <button>Recovered child action</button>
}

function mockLocationReload() {
  const reloadMock = vi.fn()
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload: reloadMock },
    writable: true,
  })

  return reloadMock
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeAll(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    window.addEventListener('error', preventUnhandledErrorLog)
  })

  beforeEach(() => {
    vi.stubEnv('PROD', false)
    loggerError.mockClear()
    consoleErrorSpy.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  afterAll(() => {
    window.removeEventListener('error', preventUnhandledErrorLog)
    consoleErrorSpy.mockRestore()
  })

  it('renders children when no error is thrown', () => {
    renderWithTheme(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>
    )

    expect(screen.getByText('Safe content')).toBeInTheDocument()
  })

  it('renders an accessible fallback and reports sanitized render errors', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )

    expect(screen.getByRole('alert', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toHaveFocus()
    expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument()
    expect(loggerError).toHaveBeenCalledWith('ErrorBoundary caught', {
      message: 'Boundary boom',
      componentStack: expect.any(String),
    })
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      'ErrorBoundary caught',
      expect.anything(),
      expect.anything()
    )
  })

  it.each([
    ['light', 'from-[#e8dfd0]'],
    ['dark', 'from-[#1a1512]'],
  ] as const)('applies the %s fallback theme classes', (theme, expectedClass) => {
    const { container } = renderWithTheme(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
      { theme }
    )

    const fallbackRoot = container.firstElementChild
    expect(fallbackRoot).toHaveClass('min-h-screen')
    expect(fallbackRoot?.className).toContain(expectedClass)
  })

  it('resets the boundary and re-renders children after the error clears', async () => {
    const user = userEvent.setup()
    const reloadMock = mockLocationReload()

    const { rerender } = renderWithTheme(
      <ErrorBoundary>
        <ControllableChild shouldThrow message="initial failure" />
      </ErrorBoundary>
    )

    expect(screen.getByRole('alert', { name: 'Something went wrong' })).toBeInTheDocument()

    rerender(
      <ErrorBoundary>
        <ControllableChild shouldThrow={false} message="initial failure" />
      </ErrorBoundary>
    )

    await user.click(screen.getByRole('button', { name: 'Reload Page' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Recovered child action' })).toBeInTheDocument()
    )
    expect(reloadMock).toHaveBeenCalledOnce()
  })

  it('keeps the home navigation action available from the fallback', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Go to Home' }))).not.toThrow()
  })

  it('does not expose error details in production fallback UI', () => {
    vi.stubEnv('PROD', true)

    renderWithTheme(
      <ErrorBoundary>
        <ThrowingChild message="secret stack context" />
      </ErrorBoundary>
    )

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.queryByText('Error Details')).not.toBeInTheDocument()
    expect(screen.queryByText(/secret stack context/i)).not.toBeInTheDocument()
  })
})
