import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Search } from 'lucide-react'
import { renderWithProviders } from '../../test/renderWithProviders'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders the icon, title, and description', () => {
    renderWithProviders(
      <EmptyState icon={Search} title="No results" description="Try a different search term" />
    )

    expect(screen.getByText('No results')).toBeInTheDocument()
    expect(screen.getByText('Try a different search term')).toBeInTheDocument()
  })

  it('omits the description paragraph when none is provided', () => {
    renderWithProviders(<EmptyState icon={Search} title="No results" />)

    expect(screen.getByText('No results')).toBeInTheDocument()
    expect(screen.queryByText('Try a different search term')).not.toBeInTheDocument()
  })

  it('does not render an action button when no action is provided', () => {
    renderWithProviders(<EmptyState icon={Search} title="No results" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders the action button and calls onClick when clicked', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <EmptyState
        icon={Search}
        title="No results"
        action={{ label: 'Clear filters', onClick }}
      />
    )

    const button = screen.getByRole('button', { name: 'Clear filters' })
    await user.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders in both light and dark theme without crashing', () => {
    const { unmount } = renderWithProviders(<EmptyState icon={Search} title="No results" />, {
      theme: 'light',
    })
    expect(screen.getByText('No results')).toBeInTheDocument()
    unmount()

    renderWithProviders(<EmptyState icon={Search} title="No results" />, { theme: 'dark' })
    expect(screen.getByText('No results')).toBeInTheDocument()
  })
})
