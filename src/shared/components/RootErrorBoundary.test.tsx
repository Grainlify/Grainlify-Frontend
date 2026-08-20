import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RootErrorBoundary } from './RootErrorBoundary'

function Boom({ message }: { message: string }): JSX.Element {
  throw new Error(message)
}

describe('RootErrorBoundary', () => {
  let spy: ReturnType<typeof vi.spyOn>
  beforeEach(() => { spy = vi.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => { spy.mockRestore(); localStorage.removeItem('theme'); sessionStorage.clear() })

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

  /** A1: a lazy chunk that stopped existing is the one failure here that a
   *  reload fixes completely - so take it, once. */
  describe('stale chunk recovery', () => {
    const CHUNK = 'Failed to fetch dynamically imported module: /assets/LeaderboardPage-DcZD11ux.js'
    let reload: ReturnType<typeof vi.fn>

    beforeEach(() => {
      sessionStorage.clear()
      reload = vi.fn()
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, reload },
      })
    })

    it('reloads once when a chunk could not be fetched', () => {
      render(<RootErrorBoundary><Boom message={CHUNK} /></RootErrorBoundary>)
      expect(reload).toHaveBeenCalledTimes(1)
    })

    /** The guard. A reason a reload cannot fix must not become a reload loop -
     *  that takes the page AND whatever was typed, on every cycle, with no way
     *  to stop it from inside the tab. */
    it('does not reload a second time in the same tab', () => {
      const first = render(<RootErrorBoundary><Boom message={CHUNK} /></RootErrorBoundary>)
      expect(reload).toHaveBeenCalledTimes(1)
      first.unmount()
      render(<RootErrorBoundary><Boom message={CHUNK} /></RootErrorBoundary>)
      expect(reload).toHaveBeenCalledTimes(1)
    })

    // Telling somebody to reload when a reload is exactly what just failed is
    // how a person concludes the site is broken and stops.
    it('says the reload was already tried, rather than suggesting it again', () => {
      const first = render(<RootErrorBoundary><Boom message={CHUNK} /></RootErrorBoundary>)
      first.unmount()
      render(<RootErrorBoundary><Boom message={CHUNK} /></RootErrorBoundary>)
      expect(screen.getByText(/didn't fix it/i)).toBeInTheDocument()
      expect(screen.getByText(/already reloaded once/i)).toBeInTheDocument()
    })

    // An ordinary render bug must not cost somebody their unsaved work.
    it('never reloads for a render bug', () => {
      render(<RootErrorBoundary><Boom message="suggested_reason_codes is not iterable" /></RootErrorBoundary>)
      expect(reload).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // If the reload is slow or blocked, there must still be something on screen.
    it('still renders a fallback while the reload is in flight', () => {
      render(<RootErrorBoundary><Boom message={CHUNK} /></RootErrorBoundary>)
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/Updating to the latest version/i)).toBeInTheDocument()
    })
  })
})
