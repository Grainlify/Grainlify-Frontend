// @vitest-environment jsdom
import { useState } from 'react'
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
function FailingChild({ message = 'Boundary boom' }: { message?: string }) {
  throw new Error(message)
}

function MaybeFailingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Recoverable render failure')
  }

  return <p>Recovered child</p>
}

/** Test harness that clears the child error before invoking the boundary reset. */
function RecoveryHarness() {
  const [shouldThrow, setShouldThrow] = useState(true)

  return (
    <>
      <button onClick={() => setShouldThrow(false)}>Resolve failure</button>
      <ErrorBoundary>
        <MaybeFailingChild shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </>
  )
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

  it('renders the fallback and reports render errors through the guarded logger', () => {
    renderWithTheme(
      <ErrorBoundary>
        <FailingChild />
      </ErrorBoundary>
    )

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument()
    expect(loggerError).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.objectContaining({ message: 'Boundary boom' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    )
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
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
        <FailingChild />
      </ErrorBoundary>,
      { theme }
    )

    const fallbackRoot = container.firstElementChild
    expect(fallbackRoot).toHaveClass('min-h-screen')
    expect(fallbackRoot?.className).toContain(expectedClass)
  })

  it('recovers and re-renders children when the reset action is clicked', async () => {
    const user = userEvent.setup()
    renderWithTheme(<RecoveryHarness />)

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Resolve failure' }))
    await user.click(screen.getByRole('button', { name: 'Try Again' }))

    await waitFor(() => expect(screen.getByText('Recovered child')).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'Something went wrong' })).not.toBeInTheDocument()
  })

  it('does not expose error details in production fallback UI', () => {
    vi.stubEnv('PROD', true)

    renderWithTheme(
      <ErrorBoundary>
        <FailingChild message="secret stack context" />
      </ErrorBoundary>
    )

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.queryByText('Error Details')).not.toBeInTheDocument()
    expect(screen.queryByText(/secret stack context/i)).not.toBeInTheDocument()
  })
})
