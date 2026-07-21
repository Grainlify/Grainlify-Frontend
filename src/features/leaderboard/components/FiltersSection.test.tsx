// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { renderWithTheme } from '../../../test/renderWithTheme'
import { FiltersSection } from './FiltersSection'
import type { FilterType } from '../types'

const ecosystemOptions = [
  { label: 'All Ecosystems', value: 'all' },
  { label: 'Blockchain', value: 'blockchain' },
]

function LocationReader() {
  const location = useLocation()
  return <div data-testid="location">{location.search}</div>
}

function renderFiltersSection({
  initialEntries = ['/leaderboard'],
  activeFilter = 'overall' as FilterType,
  selectedEcosystem = ecosystemOptions[0],
  showDropdown = false,
  isLoaded = true,
} = {}) {
  const onFilterChange = vi.fn()
  const onEcosystemChange = vi.fn()
  const onToggleDropdown = vi.fn()

  renderWithTheme(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="/leaderboard"
          element={
            <>
              <FiltersSection
                activeFilter={activeFilter}
                onFilterChange={onFilterChange}
                selectedEcosystem={selectedEcosystem}
                onEcosystemChange={onEcosystemChange}
                showDropdown={showDropdown}
                onToggleDropdown={onToggleDropdown}
                isLoaded={isLoaded}
              />
              <LocationReader />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )

  return { onFilterChange, onEcosystemChange, onToggleDropdown }
}

describe('FiltersSection URL sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hydrates active filter and ecosystem from the URL query params', () => {
    const { onFilterChange, onEcosystemChange } = renderFiltersSection({
      initialEntries: ['/leaderboard?filter=rewards&ecosystem=blockchain'],
    })

    expect(onFilterChange).toHaveBeenCalledWith('rewards')
    expect(onEcosystemChange).toHaveBeenCalledWith({ label: 'blockchain', value: 'blockchain' })
  })

  it('ignores invalid filter values and removes them from the URL', async () => {
    renderFiltersSection({ initialEntries: ['/leaderboard?filter=bad-value&ecosystem=blockchain'] })

    expect(screen.getByRole('button', { name: /All Ecosystems/i })).toBeInTheDocument()
    expect(screen.getByTestId('location')).not.toHaveTextContent('filter=bad-value')
  })

  it('updates the URL when the active filter changes', async () => {
    const { onToggleDropdown } = renderFiltersSection({ initialEntries: ['/leaderboard'] })

    const filterButton = screen.getByRole('button', { name: /Overall Leaderboard/i })
    fireEvent.click(filterButton)

    const rewardsOption = screen.getByRole('button', { name: /Total Rewards/i })
    fireEvent.click(rewardsOption)

    expect(screen.getByTestId('location')).toHaveTextContent('filter=rewards')
    expect(onToggleDropdown).not.toHaveBeenCalled()
  })

  it('updates the URL when the ecosystem selection changes', async () => {
    const { onToggleDropdown } = renderFiltersSection({ initialEntries: ['/leaderboard'] })

    const ecosystemToggle = screen.getByRole('button', { name: /All Ecosystems/i })
    fireEvent.click(ecosystemToggle)
    const ecosystemOption = screen.getByRole('button', { name: /Blockchain/i })
    fireEvent.click(ecosystemOption)

    expect(screen.getByTestId('location')).toHaveTextContent('ecosystem=blockchain')
    expect(onToggleDropdown).toHaveBeenCalled()
  })
})
