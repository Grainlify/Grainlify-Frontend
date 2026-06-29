import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'
import { SearchPage } from './SearchPage'

const { mockSearchCatalog, mockGetSearchSuggestions } = vi.hoisted(() => ({
  mockSearchCatalog: vi.fn(),
  mockGetSearchSuggestions: vi.fn(),
}))

vi.mock('../../../shared/api/client', () => ({
  searchCatalog: (query: string, options?: any) => mockSearchCatalog(query, options),
  getSearchSuggestions: (options?: any) => mockGetSearchSuggestions(options),
}))

// Mock useDebouncedValue to return the value immediately in tests to avoid timer/effects scheduling hangs
vi.mock('../../../shared/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: any) => value,
}))

describe('SearchPage Accessibility and Functionality', () => {
  const mockOnBack = vi.fn()
  const mockOnIssueClick = vi.fn()
  const mockOnProjectClick = vi.fn()
  const mockOnContributorClick = vi.fn()

  beforeEach(() => {
    mockOnBack.mockReset()
    mockOnIssueClick.mockReset()
    mockOnProjectClick.mockReset()
    mockOnContributorClick.mockReset()
    localStorage.clear()

    // Default dynamic suggestion resolves
    mockGetSearchSuggestions.mockResolvedValue([
      'Terminal-based markdown editors worth checking out',
      'Unity projects for procedural terrain generation',
      'Find the best GraphQL clients for TypeScript',
      'AI-powered tools for reviewing pull requests',
    ])

    // Default searchCatalog mock implementation to match previous test data expectations
    mockSearchCatalog.mockImplementation((query: string) => {
      const q = query.toLowerCase()
      const results: any[] = []
      if (q === 'react') {
        results.push(
          { id: '1', type: 'issue', title: 'Add dark mode support', subtitle: 'React Dashboard' },
          { id: '5', type: 'issue', title: 'Refactor component structure', subtitle: 'React Dashboard' },
          { id: '1', type: 'project', title: 'React Dashboard', subtitle: 'Modern dashboard with React and TypeScript' }
        )
      } else if (q === 'sarah') {
        results.push(
          { id: '1', type: 'contributor', title: 'Sarah Johnson', subtitle: '245 contributions' }
        )
      }
      return Promise.resolve(results)
    })
  })

  const renderSearchPage = async () => {
    const rendered = render(
      <ThemeProvider>
        <SearchPage
          onBack={mockOnBack}
          onIssueClick={mockOnIssueClick}
          onProjectClick={mockOnProjectClick}
          onContributorClick={mockOnContributorClick}
        />
      </ThemeProvider>
    )
    // Flush mount passive effects
    await act(async () => {})
    return rendered
  }

  it('should render with correct accessibility properties on the search input', async () => {
    await renderSearchPage()

    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('placeholder', 'Search issues, projects, contributors...')
    expect(searchInput).toHaveAttribute('id', 'search-input')
    expect(searchInput).toHaveFocus()
  })

  it('should have decorative search icon marked as aria-hidden', async () => {
    const { container } = await renderSearchPage()

    const searchSvg = container.querySelector('.lucide-search')
    expect(searchSvg).toBeInTheDocument()
    expect(searchSvg).toHaveAttribute('aria-hidden', 'true')
  })

  it('should render suggestions when query is empty', async () => {
    await renderSearchPage()

    expect(screen.getByText('Search suggestions')).toBeInTheDocument()
    expect(
      screen.getByText('Terminal-based markdown editors worth checking out')
    ).toBeInTheDocument()
    expect(screen.getByText('Unity projects for procedural terrain generation')).toBeInTheDocument()
  })

  it('should update search input and display results after debouncing', async () => {
    await renderSearchPage()

    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })

    fireEvent.change(searchInput, { target: { value: 'React' } })
    expect(searchInput).toHaveValue('React')

    // Wait for the async passive effects and state updates to resolve
    await act(async () => {})

    expect(screen.getByRole('heading', { name: /Search Results/i })).toHaveTextContent('Search Results (3)')
    expect(screen.getByText('Add dark mode support')).toBeInTheDocument()
    expect(screen.getByText('Refactor component structure')).toBeInTheDocument()

    const projectResults = screen.getAllByText('React Dashboard')
    expect(projectResults.length).toBeGreaterThan(0)
  })

  it("should show 'No results found' state for an unmatched query after debouncing", async () => {
    mockSearchCatalog.mockResolvedValue([])
    await renderSearchPage()

    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })

    fireEvent.change(searchInput, { target: { value: 'XYZunmatchedQuery' } })
    await act(async () => {})

    expect(screen.getByText('No results found for "XYZunmatchedQuery"')).toBeInTheDocument()
    expect(screen.getByText('Try searching for something else')).toBeInTheDocument()

    const noResultsSvg = screen
      .getByText('No results found for "XYZunmatchedQuery"')
      .parentElement?.querySelector('.lucide-search')
    expect(noResultsSvg).toBeInTheDocument()
    expect(noResultsSvg).toHaveAttribute('aria-hidden', 'true')
  })

  it('should allow clear button to clear the query and restore suggestions', async () => {
    await renderSearchPage()

    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })

    fireEvent.change(searchInput, { target: { value: 'Sarah' } })
    await act(async () => {})

    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()

    const clearButton = screen.getByRole('button', { name: 'Clear search' })
    expect(clearButton).toBeInTheDocument()

    fireEvent.click(clearButton)

    expect(searchInput).toHaveValue('')
    expect(screen.getByText('Search suggestions')).toBeInTheDocument()
  })

  it('should update query when clicking a suggestion and trigger search', async () => {
    await renderSearchPage()

    const suggestionBtn = screen
      .getByText('Find the best GraphQL clients for TypeScript')
      .closest('button')
    expect(suggestionBtn).toBeInTheDocument()

    fireEvent.click(suggestionBtn!)

    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })
    expect(searchInput).toHaveValue('Find the best GraphQL clients for TypeScript')

    mockSearchCatalog.mockResolvedValue([])
    await act(async () => {})

    expect(screen.getByText('No results found for "Find the best GraphQL clients for TypeScript"')).toBeInTheDocument()
  })

  it('should trigger correct callbacks when clicking on search results', async () => {
    await renderSearchPage()

    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })

    fireEvent.change(searchInput, { target: { value: 'Sarah' } })
    await act(async () => {})

    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()

    const contributorBtn = screen
      .getAllByRole('button')
      .find(
        (btn) =>
          btn.textContent?.includes('Sarah Johnson') && btn.textContent?.includes('Contributor')
      )
    expect(contributorBtn).toBeDefined()
    fireEvent.click(contributorBtn!)
    expect(mockOnContributorClick).toHaveBeenCalledWith('1')

    fireEvent.change(searchInput, { target: { value: 'React' } })
    await act(async () => {})

    const issueBtn = screen
      .getAllByRole('button')
      .find(
        (btn) =>
          btn.textContent?.includes('Add dark mode support') && btn.textContent?.includes('Issue')
      )
    expect(issueBtn).toBeDefined()
    fireEvent.click(issueBtn!)
    expect(mockOnIssueClick).toHaveBeenCalledWith('1')

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

  it('should call onBack when back button is clicked', async () => {
    await renderSearchPage()

    const backBtn = screen.getByRole('button', { name: 'Back' })
    expect(backBtn).toBeInTheDocument()

    fireEvent.click(backBtn)
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  // ===========================================================================
  // New States and Edge Case Tests
  // ===========================================================================

  it('should render loading state while API search is in-flight', async () => {
    let resolveSearch!: (val: any) => void
    mockSearchCatalog.mockImplementation(() => new Promise((resolve) => {
      resolveSearch = resolve
    }))

    await renderSearchPage()

    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })

    // Type query to start fetch
    fireEvent.change(searchInput, { target: { value: 'React' } })

    // Wait for the passive effect to start fetch results and trigger loading state
    await act(async () => {})

    expect(screen.getByTestId('search-loader')).toBeInTheDocument()
    expect(screen.getByText('Searching the catalog...')).toBeInTheDocument()

    await act(async () => {
      resolveSearch([])
    })

    expect(screen.queryByTestId('search-loader')).not.toBeInTheDocument()
  })

  it('should render error state and allow retrying', async () => {
    mockSearchCatalog.mockRejectedValue(new Error('Search server offline'))

    await renderSearchPage()

    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })

    fireEvent.change(searchInput, { target: { value: 'React' } })
    await act(async () => {})

    expect(screen.getByTestId('search-error')).toBeInTheDocument()
    expect(screen.getByText('Search server offline')).toBeInTheDocument()

    // Mock resolved value for retry
    mockSearchCatalog.mockResolvedValue([
      { id: '10', type: 'project', title: 'Vite Compiler' }
    ])

    const tryAgainBtn = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(tryAgainBtn)
    await act(async () => {})

    expect(screen.getByText('Vite Compiler')).toBeInTheDocument()
  })

  it('should handle request cancellation via AbortController on rapid typing', async () => {
    const signals: AbortSignal[] = []
    let resolveFirst!: (val: any) => void
    mockSearchCatalog.mockImplementation((query: string, options?: any) => {
      if (options?.signal) {
        signals.push(options.signal)
      }
      return new Promise((resolve) => {
        resolveFirst = resolve
      })
    })

    await renderSearchPage()

    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })

    // Type first query
    fireEvent.change(searchInput, { target: { value: 'Rea' } })
    await act(async () => {})

    // Type second query
    fireEvent.change(searchInput, { target: { value: 'React' } })
    await act(async () => {})

    expect(signals.length).toBe(2)
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)

    // Clean up promise
    resolveFirst([])
  })

  it('should display, allow clicking, and clear recent searches', async () => {
    localStorage.setItem('patchwork_recent_searches', JSON.stringify(['Vite', 'TypeScript']))
    await renderSearchPage()

    expect(screen.getByText('Recent searches')).toBeInTheDocument()
    expect(screen.getByText('Vite')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()

    const viteBtn = screen.getByRole('button', { name: 'Vite' })
    fireEvent.click(viteBtn)

    const searchInput = screen.getByRole('textbox', {
      name: 'Search issues, projects, and contributors',
    })
    expect(searchInput).toHaveValue('Vite')

    fireEvent.change(searchInput, { target: { value: '' } })
    await act(async () => {})

    const clearAllBtn = screen.getByRole('button', { name: 'Clear all' })
    fireEvent.click(clearAllBtn)

    expect(screen.queryByText('Recent searches')).not.toBeInTheDocument()
    expect(localStorage.getItem('patchwork_recent_searches')).toBeNull()
  })
})
