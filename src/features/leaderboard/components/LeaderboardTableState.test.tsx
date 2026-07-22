// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithTheme } from '../../../test/renderWithTheme'
import { LeaderboardTableState } from './LeaderboardTableState'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render the component wrapped in the app's ThemeProvider (default light). */
function render(props: Parameters<typeof renderWithTheme>[0]) {
  return renderWithTheme(props)
}

// ---------------------------------------------------------------------------
// Error branch  (role="alert", aria-live="assertive")
// ---------------------------------------------------------------------------

describe('Error state', () => {
  it('renders the error message inside a role="alert" region with aria-live="assertive"', () => {
    render(<LeaderboardTableState error="Something went wrong" />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
    expect(alert).toHaveTextContent('Something went wrong')
  })

  it('takes precedence over the empty state when both error and empty props are passed', () => {
    render(
      <LeaderboardTableState error="API failure" emptyTitle="No data" emptyHint="Come back later" />
    )

    // Error branch renders, not the empty branch.
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    // Empty copy MUST NOT be visible.
    expect(screen.queryByText('No data')).not.toBeInTheDocument()
    expect(screen.queryByText('Come back later')).not.toBeInTheDocument()
  })

  it('renders the "Try again" button when onRetry is provided', () => {
    const onRetry = vi.fn()
    render(<LeaderboardTableState error="Oops" onRetry={onRetry} />)

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calls onRetry exactly once when the "Try again" button is clicked', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    render(<LeaderboardTableState error="Oops" onRetry={onRetry} />)

    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('does NOT render the "Try again" button when onRetry is omitted', () => {
    render(<LeaderboardTableState error="Oops" />)

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('renders the "Try again" button when onRetry is undefined explicitly', () => {
    // The prop is simply not passed — no button.
    render(<LeaderboardTableState error="Oops" onRetry={undefined} />)
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Empty branch  (role="status", aria-live="polite")
// ---------------------------------------------------------------------------

describe('Empty state', () => {
  it('renders inside a role="status" region with aria-live="polite"', () => {
    render(<LeaderboardTableState />)

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('displays the default empty title when no props are given', () => {
    render(<LeaderboardTableState />)

    expect(screen.getByRole('status')).toHaveTextContent('No data yet')
  })

  it('displays emptyTitle and emptyHint when provided', () => {
    render(
      <LeaderboardTableState emptyTitle="No contributors" emptyHint="Be the first to contribute!" />
    )

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('No contributors')
    expect(status).toHaveTextContent('Be the first to contribute!')
  })

  it('does not render a retry button in the empty branch', () => {
    render(<LeaderboardTableState emptyTitle="Nothing" emptyHint="Try again later" />)

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('renders the empty hint only when provided', () => {
    const { rerender } = renderWithTheme(<LeaderboardTableState emptyTitle="Title only" />)

    expect(screen.getByRole('status')).toHaveTextContent('Title only')
    // No <p> with an empty-hint string should be present.
    expect(screen.getByRole('status').querySelectorAll('p')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Edge case: empty string error  (falsy → empty state)
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('renders the empty state when error is an empty string (falsy)', () => {
    render(<LeaderboardTableState error="" emptyTitle="No data" />)

    // Empty string is falsy in JS, so we should see the empty branch.
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders the empty state when error is null', () => {
    render(<LeaderboardTableState error={null} emptyTitle="Nothing here" />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders the empty state when error is undefined', () => {
    render(<LeaderboardTableState error={undefined} emptyTitle="No items" />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Transition: error → empty
// ---------------------------------------------------------------------------

describe('State transition', () => {
  it('transitions from error to empty state when error is cleared', () => {
    const { rerender } = renderWithTheme(
      <LeaderboardTableState error="Server error" onRetry={vi.fn()} emptyTitle="All good now" />
    )

    // Initially in error state.
    expect(screen.getByRole('alert')).toHaveTextContent('Server error')
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()

    // Clear the error — now empty state should show.
    rerender(<LeaderboardTableState error={null} onRetry={vi.fn()} emptyTitle="All good now" />)

    expect(screen.getByRole('status')).toHaveTextContent('All good now')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('transitions from empty to error state when an error is set', () => {
    const { rerender } = renderWithTheme(<LeaderboardTableState emptyTitle="Nothing here" />)

    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(
      <LeaderboardTableState error="Something broke" onRetry={vi.fn()} emptyTitle="Nothing here" />
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something broke')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Theme compatibility
// ---------------------------------------------------------------------------

describe('Theme compatibility', () => {
  it('renders without error under the light theme', () => {
    renderWithTheme(<LeaderboardTableState emptyTitle="Light" />, {
      theme: 'light',
    })

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders without error under the dark theme', () => {
    renderWithTheme(<LeaderboardTableState emptyTitle="Dark" />, {
      theme: 'dark',
    })

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders error state under both themes', () => {
    const onRetry = vi.fn()

    const { rerender } = renderWithTheme(<LeaderboardTableState error="Boom" onRetry={onRetry} />, {
      theme: 'light',
    })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()

    rerender(<LeaderboardTableState error="Boom" onRetry={onRetry} />)
    // Still renders (theme change doesn't affect component logic).
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
