import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'
import { SearchPage } from './SearchPage'

describe('SearchPage Accessibility and Functionality', () => {
  const mockOnBack = vi.fn()
  const mockOnIssueClick = vi.fn()
  const mockOnProjectClick = vi.fn()
  const mockOnContributorClick = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    mockOnBack.mockReset()
    mockOnIssueClick.mockReset()
    mockOnProjectClick.mockReset()
    mockOnContributorClick.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const renderSearchPage = () => {
    return render(
      <ThemeProvider>
        <SearchPage
          onBack={mockOnBack}
          onIssueClick={mockOnIssueClick}
          onProjectClick={mockOnProjectClick}
          onContributorClick={mockOnContributorClick}
        />
      </ThemeProvider>
    )
  }

  it('should render with correct accessibility properties on the search input', () => {
    renderSearchPage()

    // Verify search input has accessible name (aria-label) and placeholder
    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('placeholder', 'Search issues, projects, contributors...')
    expect(searchInput).toHaveAttribute('id', 'search-input')
    expect(searchInput).toHaveFocus() // autoFocus is true
  })

  it('should have decorative search icon marked as aria-hidden', () => {
    const { container } = renderSearchPage()

    // Find the SVG element representing the search icon
    const searchSvg = container.querySelector('.lucide-search')
    expect(searchSvg).toBeInTheDocument()
    expect(searchSvg).toHaveAttribute('aria-hidden', 'true')
  })

  it('should render suggestions when query is empty', () => {
    renderSearchPage()

    expect(screen.getByText('Search suggestions')).toBeInTheDocument()
    expect(
      screen.getByText('Terminal-based markdown editors worth checking out')
    ).toBeInTheDocument()
    expect(screen.getByText('Unity projects for procedural terrain generation')).toBeInTheDocument()
  })

  it('should update search input and display results after debouncing', () => {
    renderSearchPage()

    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })

    // Type "React"
    fireEvent.change(searchInput, { target: { value: 'React' } })
    expect(searchInput).toHaveValue('React')

    // Before debounce runs, search results shouldn't be loaded yet
    expect(screen.queryByText(/Search Results/)).not.toBeInTheDocument()

    // Fast-forward debounce timer (300ms)
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Now search results should show (3 results: issue 'Add dark mode support', issue 'Refactor component structure', and project 'React Dashboard')
    const heading = screen.getByRole('heading', { name: /Search Results/i })
    expect(heading).toHaveTextContent('Search Results (3)')
    expect(screen.getByText('Add dark mode support')).toBeInTheDocument()
    expect(screen.getByText('Refactor component structure')).toBeInTheDocument()

    // Query project result specifically
    const projectResults = screen.getAllByText('React Dashboard')
    expect(projectResults.length).toBeGreaterThan(0)
  })

  it("should show 'No results found' state for an unmatched query after debouncing", () => {
    renderSearchPage()

    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })

    // Type non-existent term
    fireEvent.change(searchInput, { target: { value: 'XYZunmatchedQuery' } })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByText('No results found')).toBeInTheDocument()
    expect(screen.getByText('Try searching for something else')).toBeInTheDocument()

    // Check that the no-results search icon is aria-hidden
    const noResultsSvg = screen
      .getByText('No results found')
      .parentElement?.querySelector('.lucide-search')
    expect(noResultsSvg).toBeInTheDocument()
    expect(noResultsSvg).toHaveAttribute('aria-hidden', 'true')
  })

  it('should allow clear button to clear the query and restore suggestions', () => {
    renderSearchPage()

    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })

    // Type query
    fireEvent.change(searchInput, { target: { value: 'Sarah' } })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Verify search results are displayed
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()

    // Find and click the clear button, queried by role + name
    const clearButton = screen.getByRole('button', { name: 'Clear search' })
    expect(clearButton).toBeInTheDocument()
    expect(clearButton).toHaveAttribute('type', 'button')

    // Check focus styles (focus-visible ring classes should be present)
    expect(clearButton.className).toContain('focus-visible:ring-[#c9983a]')

    // Click the clear button
    fireEvent.click(clearButton)

    // Verify search input is cleared
    expect(searchInput).toHaveValue('')

    // Verify search suggestions are visible again
    expect(screen.getByText('Search suggestions')).toBeInTheDocument()
  })

  it('should update query when clicking a suggestion and trigger search', () => {
    renderSearchPage()

    const suggestionBtn = screen
      .getByText('Find the best GraphQL clients for TypeScript')
      .closest('button')
    expect(suggestionBtn).toBeInTheDocument()
    expect(suggestionBtn).toHaveAttribute('type', 'button')

    // Click suggestion
    fireEvent.click(suggestionBtn!)

    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })
    expect(searchInput).toHaveValue('Find the best GraphQL clients for TypeScript')

    // Advance timers
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Verify results / no results depending on matches
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('should trigger correct callbacks when clicking on search results', () => {
    renderSearchPage()

    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })

    // Search for "Sarah" which is a contributor
    fireEvent.change(searchInput, { target: { value: 'Sarah' } })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    const contributorBtn = screen
      .getAllByRole('button')
      .find(
        (btn) =>
          btn.textContent?.includes('Sarah Johnson') && btn.textContent?.includes('Contributor')
      )
    expect(contributorBtn).toBeDefined()
    fireEvent.click(contributorBtn!)
    expect(mockOnContributorClick).toHaveBeenCalledWith('1')

    // Search for "React" which matches issue and project
    fireEvent.change(searchInput, { target: { value: 'React' } })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Click on issue result
    const issueBtn = screen
      .getAllByRole('button')
      .find(
        (btn) =>
          btn.textContent?.includes('Add dark mode support') && btn.textContent?.includes('Issue')
      )
    expect(issueBtn).toBeDefined()
    fireEvent.click(issueBtn!)
    expect(mockOnIssueClick).toHaveBeenCalledWith('1')

    // Click on project result
    const projectBtn = screen
      .getAllByRole('button')
      .find(
        (btn) =>
          btn.textContent?.includes('React Dashboard') && btn.textContent?.includes('Project')
      )
    expect(projectBtn).toBeDefined()
    fireEvent.click(projectBtn!)
    expect(mockOnProjectClick).toHaveBeenCalledWith('1')
  })

  it('should call onBack when back button is clicked', () => {
    renderSearchPage()

    const backBtn = screen.getByRole('button', { name: 'Back' })
    expect(backBtn).toBeInTheDocument()
    expect(backBtn).toHaveAttribute('type', 'button')
    expect(backBtn.className).toContain('focus-visible:ring-[#c9983a]')

    fireEvent.click(backBtn)
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })
})
