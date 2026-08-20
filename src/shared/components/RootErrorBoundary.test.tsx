import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RootErrorBoundary } from './RootErrorBoundary'

function Boom({ message }: { message: string }): JSX.Element {
  throw new Error(message)
}

describe('RootErrorBoundary', () => {
  let spy: ReturnType<typeof vi.spyOn>
  beforeEach(() => { spy = vi.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => { spy.mockRestore(); localStorage.removeItem('theme') })

  it('renders children when nothing throws', () => {
    render(<RootErrorBoundary><p>alive</p></RootErrorBoundary>)
    expect(screen.getByText('alive')).toBeInTheDocument()
  })

  // The whole point: a throw must not reach the document as a blank page.
  it('renders something rather than nothing when the tree throws', () => {
    render(<RootErrorBoundary><Boom message="kaboom" /></RootErrorBoundary>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(document.body.textContent).not.toBe('')
  })

  /** The failure that produced this: a tab open across a deploy asks for a
   *  lazy chunk whose content hash no longer exists. */
  it('catches a failed dynamic import', () => {
    render(
      <RootErrorBoundary>
        <Boom message="Failed to fetch dynamically imported module: /assets/LeaderboardPage-DcZD11ux.js" />
      </RootErrorBoundary>
    )
    expect(screen.getByText(/Failed to fetch dynamically imported module/)).toBeInTheDocument()
  })

  // Shown, not hidden behind a toggle - the people who hit this are usually the
  // ones who can act on it.
  it('shows the error text rather than swallowing it', () => {
    render(<RootErrorBoundary><Boom message="suggested_reason_codes is not iterable" /></RootErrorBoundary>)
    expect(screen.getByText('suggested_reason_codes is not iterable')).toBeInTheDocument()
  })

  // The failure looks total from outside and almost never is.
  it('says the service is alive and offers a way forward', () => {
    render(<RootErrorBoundary><Boom message="x" /></RootErrorBoundary>)
    expect(screen.getByText(/still running/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /report this/i })).toHaveAttribute('href', '/support')
  })

  /** A boundary that needs the tree it protects is not a boundary. It reads
   *  theme from localStorage directly rather than from ThemeProvider, because
   *  ThemeProvider is one of the things that could have thrown. */
  it('themes itself without any context', () => {
    localStorage.setItem('theme', 'dark')
    const { unmount } = render(<RootErrorBoundary><Boom message="x" /></RootErrorBoundary>)
    const darkBg = screen.getByRole('alert').style.background
    unmount()
    localStorage.setItem('theme', 'light')
    render(<RootErrorBoundary><Boom message="x" /></RootErrorBoundary>)
    expect(screen.getByRole('alert').style.background).not.toBe(darkBg)
  })

  // Private modes and sandboxed frames throw on localStorage access. The
  // fallback must not become the second blank page.
  it('still renders when localStorage throws', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    render(<RootErrorBoundary><Boom message="x" /></RootErrorBoundary>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    getItem.mockRestore()
  })
})
