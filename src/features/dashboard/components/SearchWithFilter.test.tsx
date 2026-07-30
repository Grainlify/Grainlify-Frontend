import { render, screen, act, fireEvent } from '@testing-library/react'
import { SearchWithFilter } from './SearchWithFilter'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock ThemeContext
vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}))

/**
 * Helper to open the filter panel by clicking the first button (filter button).
 */
function openFilterPanel() {
  const filterButton = screen.getAllByRole('button')[0]
  fireEvent.click(filterButton)
}

describe('SearchWithFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Reset body overflow before each test so tests are isolated
    document.body.style.overflow = ''
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    // Ensure cleanup: restore body overflow after each test
    document.body.style.overflow = ''
  })

  // ── Existing debounce & search tests ──────────────────────────────────

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

  // ── Escape key behaviour ──────────────────────────────────────────────

  it('closes the filter panel when Escape is pressed while open', () => {
    render(<SearchWithFilter searchPlaceholder="Search..." />)

    // Open the filter panel
    openFilterPanel()

    // The "Filter" heading should be visible inside the panel
    expect(screen.getByText('Filter')).toBeInTheDocument()

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' })

    // The panel should be closed — "Filter" heading no longer in the document
    expect(screen.queryByText('Filter')).not.toBeInTheDocument()
  })

  it('does nothing when Escape is pressed while the panel is already closed', () => {
    render(<SearchWithFilter searchPlaceholder="Search..." />)

    // Panel is not open — pressing Escape should not cause any error or side effect
    fireEvent.keyDown(document, { key: 'Escape' })

    // Body overflow should remain unchanged
    expect(document.body.style.overflow).toBe('')
  })

  it('closes the panel on Escape using the same close path as backdrop click (panel disappears)', () => {
    render(<SearchWithFilter searchPlaceholder="Search..." />)

    // Open via filter button
    openFilterPanel()
    expect(screen.getByText('Filter')).toBeInTheDocument()

    // Close via Escape
    fireEvent.keyDown(document, { key: 'Escape' })

    // After closing, re-opening should work — proving clean state
    openFilterPanel()
    expect(screen.getByText('Filter')).toBeInTheDocument()

    // Close via backdrop click for comparison
    const backdrop = document.querySelector('.fixed.inset-0')
    expect(backdrop).toBeInTheDocument()
    fireEvent.click(backdrop!)

    expect(screen.queryByText('Filter')).not.toBeInTheDocument()
  })

  // ── Body scroll lock behaviour ────────────────────────────────────────

  it('locks body scroll (overflow = hidden) when the filter panel is opened', () => {
    render(<SearchWithFilter searchPlaceholder="Search..." />)

    // Before opening, overflow should be default (empty)
    expect(document.body.style.overflow).toBe('')

    // Open the filter panel
    openFilterPanel()

    // Body overflow should now be "hidden"
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body scroll when the filter panel is closed via backdrop click', () => {
    // Simulate a pre-existing overflow value set by the consumer
    document.body.style.overflow = 'auto'

    render(<SearchWithFilter searchPlaceholder="Search..." />)

    // Open the filter panel
    openFilterPanel()
    expect(document.body.style.overflow).toBe('hidden')

    // Close via backdrop click
    const backdrop = document.querySelector('.fixed.inset-0')!
    fireEvent.click(backdrop)

    // Overflow should be restored to the original value
    expect(document.body.style.overflow).toBe('auto')
  })

  it('restores body scroll when the filter panel is closed via Escape key', () => {
    document.body.style.overflow = 'scroll'

    render(<SearchWithFilter searchPlaceholder="Search..." />)

    // Open the filter panel
    openFilterPanel()
    expect(document.body.style.overflow).toBe('hidden')

    // Close via Escape
    fireEvent.keyDown(document, { key: 'Escape' })

    // Overflow should be restored to the original value
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('restores body scroll when the filter panel is closed via the X button', () => {
    document.body.style.overflow = ''

    render(<SearchWithFilter searchPlaceholder="Search..." />)

    // Open the filter panel
    openFilterPanel()
    expect(document.body.style.overflow).toBe('hidden')

    // Close via X button (the close button inside the panel header)
    // Find the heading and get the close button next to it
    const heading = screen.getByText('Filter')
    const closeButton = heading.parentElement!.querySelector('button')!
    fireEvent.click(closeButton)

    // Overflow should be restored
    expect(document.body.style.overflow).toBe('')
  })

  it('restores body scroll when the component unmounts while the panel is open', () => {
    document.body.style.overflow = 'visible'

    const { unmount } = render(<SearchWithFilter searchPlaceholder="Search..." />)

    // Open the filter panel
    openFilterPanel()
    expect(document.body.style.overflow).toBe('hidden')

    // Unmount the component while the panel is still open
    unmount()

    // Overflow should be restored to the original value, not left stuck at "hidden"
    expect(document.body.style.overflow).toBe('visible')
  })

  it('handles rapid open/close toggling without leaving overflow stuck', () => {
    render(<SearchWithFilter searchPlaceholder="Search..." />)

    // Open and close rapidly several times
    openFilterPanel()
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.body.style.overflow).toBe('')

    openFilterPanel()
    expect(document.body.style.overflow).toBe('hidden')

    const backdrop = document.querySelector('.fixed.inset-0')!
    fireEvent.click(backdrop)
    expect(document.body.style.overflow).toBe('')

    // Final state: overflow should be empty (not stuck)
    expect(document.body.style.overflow).toBe('')
  })

  // ── Listener cleanup ──────────────────────────────────────────────────

  it('removes the keydown listener when the panel is closed (no lingering effect)', () => {
    const addEventSpy = vi.spyOn(document, 'addEventListener')
    const removeEventSpy = vi.spyOn(document, 'removeEventListener')

    render(<SearchWithFilter searchPlaceholder="Search..." />)

    // Open the filter panel — should add the keydown listener
    openFilterPanel()

    const addKeyDownCalls = addEventSpy.mock.calls.filter(([event]) => event === 'keydown')
    expect(addKeyDownCalls.length).toBeGreaterThanOrEqual(1)

    // Close the filter panel — should remove the keydown listener
    fireEvent.keyDown(document, { key: 'Escape' })

    const removeKeyDownCalls = removeEventSpy.mock.calls.filter(([event]) => event === 'keydown')
    expect(removeKeyDownCalls.length).toBeGreaterThanOrEqual(1)

    addEventSpy.mockRestore()
    removeEventSpy.mockRestore()
  })

  it('does not have a keydown listener attached when the panel is never opened', () => {
    const addEventSpy = vi.spyOn(document, 'addEventListener')

    render(<SearchWithFilter searchPlaceholder="Search..." />)

    // Without opening the panel, no keydown listener should be added
    const addKeyDownCalls = addEventSpy.mock.calls.filter(([event]) => event === 'keydown')
    expect(addKeyDownCalls).toHaveLength(0)

    addEventSpy.mockRestore()
  })
})
