import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'
import { ContributorsTable } from './ContributorsTable'
import { LeaderData } from '../types'

const contributors: LeaderData[] = [
  {
    rank: 1,
    username: 'octocat',
    avatar: '',
    user_id: 'uid-1',
    score: 100,
    trend: 'up',
    trendValue: 2,
    contributions: 12,
    ecosystems: ['Web3'],
  },
]

function renderTable(props: Partial<React.ComponentProps<typeof ContributorsTable>> = {}) {
  return render(
    <ThemeProvider>
      <ContributorsTable data={contributors} activeFilter="overall" isLoaded {...props} />
    </ThemeProvider>
  )
}

describe('ContributorsTable states', () => {
  it('renders a row per contributor when data is present', () => {
    renderTable()
    expect(screen.getByText('octocat')).toBeInTheDocument()
    // No empty/error live regions while data is shown.
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders an accessible empty state for zero rows', () => {
    renderTable({ data: [] })
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText(/no contributors yet/i)).toBeInTheDocument()
    // No retry button is offered for an empty (non-error) result.
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('renders an error state with an assertive live region and retry', async () => {
    const onRetry = vi.fn()
    renderTable({ data: [], error: "We couldn't load contributors. Please try again.", onRetry })

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
    expect(screen.getByText(/please try again/i)).toBeInTheDocument()
    // Error copy stays generic and exposes no internals.
    expect(alert.textContent).not.toMatch(/stack|http|status\s*\d|\bat\s+\w+\.\w+/i)

    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('prefers the error state over rows even when data exists', () => {
    renderTable({ error: "We couldn't load contributors. Please try again." })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('octocat')).not.toBeInTheDocument()
  })
})

describe('ContributorsTable row accessibility', () => {
  it('exposes contributor rows as named keyboard-focusable buttons', () => {
    renderTable()

    const row = screen.getByRole('button', { name: /view contributor octocat/i })
    expect(row).toHaveAttribute('tabindex', '0')
    expect(row.className).toMatch(/focus-visible:ring-2/)
  })

  it('activates the contributor row with click, Enter, and Space', async () => {
    const user = userEvent.setup()
    const onUserClick = vi.fn()
    renderTable({ onUserClick })

    const row = screen.getByRole('button', { name: /view contributor octocat/i })

    await user.click(row)
    expect(onUserClick).toHaveBeenLastCalledWith('octocat', 'uid-1')

    row.focus()
    await user.keyboard('{Enter}')
    expect(onUserClick).toHaveBeenCalledTimes(2)

    await user.keyboard(' ')
    expect(onUserClick).toHaveBeenCalledTimes(3)
  })

  it('does not activate the contributor row for unrelated keys', async () => {
    const user = userEvent.setup()
    const onUserClick = vi.fn()
    renderTable({ onUserClick })

    screen.getByRole('button', { name: /view contributor octocat/i }).focus()
    await user.keyboard('{ArrowDown}')

    expect(onUserClick).not.toHaveBeenCalled()
  })

  it('keeps the View Profile action from double-firing the row handler', async () => {
    const user = userEvent.setup()
    const onUserClick = vi.fn()
    renderTable({ onUserClick })

    await user.click(screen.getByRole('button', { name: /view profile/i }))

    expect(onUserClick).toHaveBeenCalledTimes(1)
    expect(onUserClick).toHaveBeenCalledWith('octocat', 'uid-1')
  })
})
