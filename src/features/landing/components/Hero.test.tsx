import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { Hero } from './Hero'

vi.mock('../../../shared/hooks/useLandingStats', () => ({
  useLandingStats: vi.fn(),
}))

import { useLandingStats } from '../../../shared/hooks/useLandingStats'

describe('Hero component layout shift prevention', () => {
  it('renders skeleton placeholders while loading', () => {
    ;(useLandingStats as ReturnType<typeof vi.fn>).mockReturnValue({
      display: { activeProjects: '—', contributors: '—', grantsDistributed: '—' },
      isLoading: true,
    })
    render(<Hero />)
    expect(screen.getByTestId('hero-image-placeholder')).toBeInTheDocument()
    const skeletons = screen.getAllByTestId('stat-skeleton')
    expect(skeletons).toHaveLength(3)
  })

  it('shows actual stats after loading', () => {
    ;(useLandingStats as ReturnType<typeof vi.fn>).mockReturnValue({
      display: { activeProjects: '10', contributors: '200', grantsDistributed: '5000' },
      isLoading: false,
    })
    render(<Hero />)
    expect(screen.queryByTestId('stat-skeleton')).not.toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('5000')).toBeInTheDocument()
  })
})
