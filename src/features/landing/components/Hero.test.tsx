import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'
import { I18nProvider } from '../../../shared/i18n'
import { Hero } from './Hero'

// Mock the useLandingStats hook
vi.mock('../../../shared/hooks/useLandingStats', () => ({
  useLandingStats: vi.fn(),
}))

import { useLandingStats } from '../../../shared/hooks/useLandingStats'

// Hero renders a react-router <Link> and reads the theme context, so both
// providers are needed for it to mount without throwing.
function renderHero() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <ThemeProvider>
          <Hero />
        </ThemeProvider>
      </I18nProvider>
    </MemoryRouter>
  )
}

describe('Hero component layout shift prevention', () => {
  it('renders skeleton placeholders while loading', () => {
    vi.mocked(useLandingStats).mockReturnValue({
      stats: null,
      display: { activeProjects: '—', contributors: '—', grantsDistributed: '—' },
      isLoading: true,
      error: null,
    })
    renderHero()
    // Image placeholder should be present
    expect(screen.getByTestId('hero-image-placeholder')).toBeInTheDocument()
    // Stat skeletons should be present
    const skeletons = screen.getAllByTestId('stat-skeleton')
    expect(skeletons).toHaveLength(3)
  })

  it('shows actual stats after loading', () => {
    vi.mocked(useLandingStats).mockReturnValue({
      stats: null,
      display: { activeProjects: '10', contributors: '200', grantsDistributed: '5000' },
      isLoading: false,
      error: null,
    })
    renderHero()
    expect(screen.queryByTestId('stat-skeleton')).not.toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('5000')).toBeInTheDocument()
  })
})
