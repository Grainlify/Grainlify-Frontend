import { render, screen, act, fireEvent } from '@testing-library/react'
import { SearchWithFilter } from './SearchWithFilter'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock ThemeContext
vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}))

describe('SearchWithFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('debounces rapid typing, calling onSearchChange once with the final value', () => {
    const onSearchChange = vi.fn()
    render(<SearchWithFilter onSearchChange={onSearchChange} searchPlaceholder="Search..." />)

    const input = screen.getByPlaceholderText('Search...')

    // Type rapidly
    fireEvent.change(input, { target: { value: 'a' } })
    fireEvent.change(input, { target: { value: 'ab' } })
    fireEvent.change(input, { target: { value: 'abc' } })

    // Should not have been called yet because of debounce
    expect(onSearchChange).not.toHaveBeenCalled()

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Now it should be called exactly once with the final value
    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('abc')
  })

  it('calls onSearchChange immediately when input is cleared', () => {
    const onSearchChange = vi.fn()
    render(
      <SearchWithFilter
        onSearchChange={onSearchChange}
        searchPlaceholder="Search..."
        searchValue="initial"
      />
    )

    const input = screen.getByPlaceholderText('Search...')

    // Clear input
    fireEvent.change(input, { target: { value: '' } })

    // Should have been called immediately
    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('')
  })

  it('does not delay filter changes with the search debounce', () => {
    const onToggle = vi.fn()
    const filterSections = [
      {
        title: 'Status',
        options: [{ label: 'Active', value: 'active' }],
        onToggle,
      },
    ]

    render(<SearchWithFilter filterSections={filterSections} searchPlaceholder="Search..." />)

    // Open the filter modal by clicking the filter button (first button with lucide icon)
    // The filter button is the first button rendered.
    const filterButton = screen.getAllByRole('button')[0]
    fireEvent.click(filterButton)

    // Expand the "Status" section
    const sectionButton = screen.getByText('Status')
    fireEvent.click(sectionButton)

    // Click the "Active" option
    const optionButton = screen.getByText('Active')
    fireEvent.click(optionButton)

    // onToggle should be called immediately
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith('active')
  })
})
