import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { SearchPage } from './SearchPage'

// SearchPage has no API dependency of its own — it filters a hardcoded local `allData`
// object (issues/projects/contributors) defined inline in the source. These tests
// exercise that real client-side filtering logic against the exact same hardcoded
// values, rather than mocking a network call that doesn't exist for this page.
function renderSearchPage() {
  const onBack = vi.fn()
  const onIssueClick = vi.fn()
  const onProjectClick = vi.fn()
  const onContributorClick = vi.fn()

  const utils = renderWithProviders(
    <SearchPage
      onBack={onBack}
      onIssueClick={onIssueClick}
      onProjectClick={onProjectClick}
      onContributorClick={onContributorClick}
    />,
  )

  return { ...utils, onBack, onIssueClick, onProjectClick, onContributorClick }
}

const SEARCH_INPUT_PLACEHOLDER = 'Search issues, projects, contributors...'

describe('SearchPage', () => {
  it('shows search suggestions when the query is empty', () => {
    renderSearchPage()

    expect(screen.getByText('Search suggestions')).toBeInTheDocument()
    expect(
      screen.getByText('Terminal-based markdown editors worth checking out'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Search Results/)).not.toBeInTheDocument()
  })

  it('clicking a suggestion fills the search box with its text', async () => {
    const user = userEvent.setup()
    renderSearchPage()

    await user.click(screen.getByText('Unity projects for procedural terrain generation'))

    expect(screen.getByPlaceholderText(SEARCH_INPUT_PLACEHOLDER)).toHaveValue(
      'Unity projects for procedural terrain generation',
    )
  })

  it('finds a matching issue by title and calls onIssueClick with its id when clicked', async () => {
    const user = userEvent.setup()
    const { onIssueClick, onProjectClick, onContributorClick } = renderSearchPage()

    await user.type(screen.getByPlaceholderText(SEARCH_INPUT_PLACEHOLDER), 'navigation bug')

    expect(screen.getByText('Search Results (1)')).toBeInTheDocument()
    const result = screen.getByText('Fix navigation bug in mobile view')

    await user.click(result)

    expect(onIssueClick).toHaveBeenCalledTimes(1)
    expect(onIssueClick).toHaveBeenCalledWith('2')
    expect(onProjectClick).not.toHaveBeenCalled()
    expect(onContributorClick).not.toHaveBeenCalled()
  })

  it('finds a matching project by name and calls onProjectClick with its id when clicked', async () => {
    const user = userEvent.setup()
    const { onProjectClick } = renderSearchPage()

    await user.type(screen.getByPlaceholderText(SEARCH_INPUT_PLACEHOLDER), 'Design System')

    expect(screen.getByText('Search Results (1)')).toBeInTheDocument()
    const result = screen.getByText('Design System')

    await user.click(result)

    expect(onProjectClick).toHaveBeenCalledTimes(1)
    expect(onProjectClick).toHaveBeenCalledWith('4')
  })

  it('finds a matching contributor by name and calls onContributorClick with its id when clicked', async () => {
    const user = userEvent.setup()
    const { onContributorClick } = renderSearchPage()

    await user.type(screen.getByPlaceholderText(SEARCH_INPUT_PLACEHOLDER), 'Sarah Johnson')

    expect(screen.getByText('Search Results (1)')).toBeInTheDocument()
    const result = screen.getByText('Sarah Johnson')

    await user.click(result)

    expect(onContributorClick).toHaveBeenCalledTimes(1)
    expect(onContributorClick).toHaveBeenCalledWith('1')
  })

  it('shows a no-results state when the query matches nothing in the hardcoded dataset', async () => {
    const user = userEvent.setup()
    renderSearchPage()

    await user.type(screen.getByPlaceholderText(SEARCH_INPUT_PLACEHOLDER), 'zzz_nonexistent_zzz')

    expect(screen.getByText('No results found')).toBeInTheDocument()
    expect(screen.queryByText(/Search Results/)).not.toBeInTheDocument()
  })

  it('calls onBack when the back button is clicked', async () => {
    const user = userEvent.setup()
    const { onBack } = renderSearchPage()

    await user.click(screen.getByRole('button', { name: /Back/i }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
