import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'
import { ThemeProvider } from '../contexts/ThemeContext'
import * as loggerModule from '../utils/logger'

// ErrorBoundary's fallback UI calls useTheme(), which requires a ThemeProvider
// in the tree.
function renderWithTheme(children: React.ReactNode) {
  return render(<ThemeProvider>{children}</ThemeProvider>)
}

// Suppress React's own console.error output for expected throws during tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** A component that unconditionally throws on render. */
function ThrowingChild({ message = 'test render error' }: { message?: string }): never {
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
  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>
    )

    expect(screen.getByText('Safe content')).toBeInTheDocument()
  })

  it('renders the fallback UI when a child throws', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('calls logger.error with message and componentStack when a child throws', () => {
    const loggerErrorSpy = vi.spyOn(loggerModule.logger, 'error')

    renderWithTheme(
      <ErrorBoundary>
        <ThrowingChild message="boom" />
      </ErrorBoundary>
    )

    expect(loggerErrorSpy).toHaveBeenCalledOnce()
    expect(loggerErrorSpy).toHaveBeenCalledWith('ErrorBoundary caught', {
      message: 'boom',
      componentStack: expect.any(String),
    })
  })

  it('does not log the full error object to prevent PII leakage', () => {
    const loggerErrorSpy = vi.spyOn(loggerModule.logger, 'error')

    renderWithTheme(
      <ErrorBoundary>
        <ThrowingChild message="sensitive detail" />
      </ErrorBoundary>
    )

    const [, payload] = loggerErrorSpy.mock.calls[0]
    // Only message and componentStack should be present — no full Error instance
    expect(payload).not.toHaveProperty('stack')
    expect(payload).toHaveProperty('message')
    expect(payload).toHaveProperty('componentStack')
  })

  it('shows a Reload Page button in the fallback UI', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )

    expect(screen.getByRole('button', { name: 'Reload Page' })).toBeInTheDocument()
  })

  it('shows a Go to Home button in the fallback UI', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )

    expect(screen.getByRole('button', { name: 'Go to Home' })).toBeInTheDocument()
  })

  it('exposes accessible fallback semantics and moves focus to the fallback heading', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowingChild message="accessible failure" />
      </ErrorBoundary>
    )

    const fallback = screen.getByRole('alert', { name: 'Something went wrong' })
    const heading = screen.getByRole('heading', { name: 'Something went wrong' })

    expect(fallback).toHaveAccessibleName('Something went wrong')
    expect(heading).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Reload Page' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to Home' })).toBeInTheDocument()
  })

  it('resets the boundary and re-renders children without the error', async () => {
    const user = userEvent.setup()
    mockLocationReload()

    const { rerender } = renderWithTheme(
      <ErrorBoundary>
        <ControllableChild shouldThrow message="initial failure" />
      </ErrorBoundary>
    )

    expect(screen.getByRole('alert', { name: 'Something went wrong' })).toBeInTheDocument()

    rerender(
      <ThemeProvider>
        <ErrorBoundary>
          <ControllableChild shouldThrow={false} message="initial failure" />
        </ErrorBoundary>
      </ThemeProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Reload Page' }))

    const recoveredAction = screen.getByRole('button', { name: 'Recovered child action' })
    expect(recoveredAction).toBeInTheDocument()
    recoveredAction.focus()
    expect(recoveredAction).toHaveFocus()
  })

  it('catches a second independent error after a successful reset', async () => {
    const user = userEvent.setup()
    const reloadMock = mockLocationReload()
    const loggerErrorSpy = vi.spyOn(loggerModule.logger, 'error')

    const { rerender } = renderWithTheme(
      <ErrorBoundary>
        <ControllableChild shouldThrow message="first failure" />
      </ErrorBoundary>
    )

    rerender(
      <ThemeProvider>
        <ErrorBoundary>
          <ControllableChild shouldThrow={false} message="first failure" />
        </ErrorBoundary>
      </ThemeProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Reload Page' }))
    expect(screen.getByRole('button', { name: 'Recovered child action' })).toBeInTheDocument()

    rerender(
      <ThemeProvider>
        <ErrorBoundary>
          <ControllableChild shouldThrow message="second failure" />
        </ErrorBoundary>
      </ThemeProvider>
    )

    expect(screen.getByRole('alert', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByText('Error: second failure')).toBeInTheDocument()
    expect(reloadMock).toHaveBeenCalledOnce()
    expect(loggerErrorSpy).toHaveBeenLastCalledWith('ErrorBoundary caught', {
      message: 'second failure',
      componentStack: expect.any(String),
    })
  })

  it('clicking Reload Page triggers window.location.reload', () => {
    const reloadMock = mockLocationReload()

    renderWithTheme(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reload Page' }))

    expect(reloadMock).toHaveBeenCalledOnce()
  })
})
