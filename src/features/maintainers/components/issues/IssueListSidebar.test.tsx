// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { IssueListSidebar } from './IssueListSidebar'
import { renderWithTheme } from '../../../../test/renderWithTheme'

vi.mock('../../../../shared/contexts/ThemeContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../shared/contexts/ThemeContext')>()
  return {
    ...actual,
    useTheme: () => ({ theme: 'light' }),
  }
})

vi.mock('./IssueCard', () => ({
  IssueCard: ({ issue }: any) => <div data-testid="issue-card">{issue.title}</div>,
}))

vi.mock('./IssueFilterDropdown', () => ({
  IssueFilterDropdown: ({ value }: any) => <div>{value}</div>,
}))

describe('IssueListSidebar', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders "No issues found" when sidebar has no issues and search/filter are at defaults', () => {
    const setSearchQuery = vi.fn()
    const setIssueFilter = vi.fn()

    renderWithTheme(
      <IssueListSidebar
        issues={[]}
        issueFilter={'All'}
        setIssueFilter={setIssueFilter}
        searchQuery={''}
        setSearchQuery={setSearchQuery}
        isFilterDropdownOpen={false}
        setIsFilterDropdownOpen={vi.fn()}
        appliedFilterCount={1}
        onFilterClick={vi.fn()}
        onIssueSelect={vi.fn()}
      />
    )

    expect(screen.getByText('No issues found')).toBeInTheDocument()
  })

  it('renders "No matches for search/filters" when sidebar has no issues but search is non-empty', async () => {
    const setSearchQuery = vi.fn()
    const setIssueFilter = vi.fn()

    renderWithTheme(
      <IssueListSidebar
        issues={[]}
        issueFilter={'All'}
        setIssueFilter={setIssueFilter}
        searchQuery={'styling'}
        setSearchQuery={setSearchQuery}
        isFilterDropdownOpen={false}
        setIsFilterDropdownOpen={vi.fn()}
        appliedFilterCount={12}
        onFilterClick={vi.fn()}
        onIssueSelect={vi.fn()}
      />
    )

    expect(await screen.findByText('No matches for search/filters')).toBeInTheDocument()
  })

  it('debounces search input and only calls setSearchQuery after delay', async () => {
    vi.useFakeTimers()

    const setSearchQuery = vi.fn()
    const setIssueFilter = vi.fn()

    renderWithTheme(
      <IssueListSidebar
        issues={[]}
        issueFilter={'All'}
        setIssueFilter={setIssueFilter}
        searchQuery={''}
        setSearchQuery={setSearchQuery}
        isFilterDropdownOpen={false}
        setIsFilterDropdownOpen={vi.fn()}
        appliedFilterCount={1}
        onFilterClick={vi.fn()}
        onIssueSelect={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('Search') as HTMLInputElement

    act(() => {
      fireEvent.change(input, { target: { value: 'hello' } })
    })

    // No immediate call (debounced)
    expect(setSearchQuery).not.toHaveBeenCalled()

    // Advance beyond the default debounce delay (300ms)
    act(() => {
      vi.advanceTimersByTime(350)
    })

    expect(setSearchQuery).toHaveBeenCalled()

    // Last call should contain full typed string
    const lastCall = setSearchQuery.mock.calls[setSearchQuery.mock.calls.length - 1]
    expect(lastCall[0]).toBe('hello')
  })

  it('clamps the filter count badge for large counts (100+ => "99+")', () => {
    const setSearchQuery = vi.fn()
    const setIssueFilter = vi.fn()

    renderWithTheme(
      <IssueListSidebar
        issues={[]}
        issueFilter={'All'}
        setIssueFilter={setIssueFilter}
        searchQuery={''}
        setSearchQuery={setSearchQuery}
        isFilterDropdownOpen={false}
        setIsFilterDropdownOpen={vi.fn()}
        appliedFilterCount={123}
        onFilterClick={vi.fn()}
        onIssueSelect={vi.fn()}
      />
    )

    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('shows spinner and sets aria-busy while search is pending', () => {
    vi.useFakeTimers()

    const { container } = renderWithTheme(
      <IssueListSidebar
        issues={[]}
        issueFilter={'All'}
        setIssueFilter={vi.fn()}
        searchQuery={''}
        setSearchQuery={vi.fn()}
        isFilterDropdownOpen={false}
        setIsFilterDropdownOpen={vi.fn()}
        appliedFilterCount={1}
        onFilterClick={vi.fn()}
        onIssueSelect={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('Search') as HTMLInputElement

    act(() => {
      fireEvent.change(input, { target: { value: 'hello' } })
    })

    // Spinner should appear immediately on typing
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()

    // Results region should be marked busy
    expect(screen.getByLabelText('Issues list')).toHaveAttribute('aria-busy', 'true')
  })

  it('hides spinner and clears aria-busy after debounce settles', () => {
    vi.useFakeTimers()

    const { container } = renderWithTheme(
      <IssueListSidebar
        issues={[]}
        issueFilter={'All'}
        setIssueFilter={vi.fn()}
        searchQuery={''}
        setSearchQuery={vi.fn()}
        isFilterDropdownOpen={false}
        setIsFilterDropdownOpen={vi.fn()}
        appliedFilterCount={1}
        onFilterClick={vi.fn()}
        onIssueSelect={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('Search') as HTMLInputElement

    act(() => {
      fireEvent.change(input, { target: { value: 'hello' } })
    })

    // Advance beyond the debounce delay so it settles
    act(() => {
      vi.advanceTimersByTime(350)
    })

    // Spinner should be gone
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()

    // aria-busy should be cleared
    expect(screen.getByLabelText('Issues list')).toHaveAttribute('aria-busy', 'false')
  })

  it('keeps spinner visible during rapid typing before debounce settles', () => {
    vi.useFakeTimers()

    const { container } = renderWithTheme(
      <IssueListSidebar
        issues={[]}
        issueFilter={'All'}
        setIssueFilter={vi.fn()}
        searchQuery={''}
        setSearchQuery={vi.fn()}
        isFilterDropdownOpen={false}
        setIsFilterDropdownOpen={vi.fn()}
        appliedFilterCount={1}
        onFilterClick={vi.fn()}
        onIssueSelect={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText('Search') as HTMLInputElement

    // Type multiple characters in quick succession (before debounce fires)
    act(() => {
      fireEvent.change(input, { target: { value: 'h' } })
    })
    act(() => {
      fireEvent.change(input, { target: { value: 'he' } })
    })
    act(() => {
      fireEvent.change(input, { target: { value: 'hel' } })
    })

    // Spinner should still be visible since debounce hasn't fired yet
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()

    // Advance timers past debounce
    act(() => {
      vi.advanceTimersByTime(350)
    })

    // Spinner should now be gone
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
  })
})
