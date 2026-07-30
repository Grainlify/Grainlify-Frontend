import { render, screen, within } from '@testing-library/react'
import { FileText } from 'lucide-react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StatCard } from '../../types'
import { StatsCard } from './StatsCard'

const themeState = vi.hoisted(() => ({ current: 'dark' as 'dark' | 'light' }))

vi.mock('../../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: themeState.current }),
}))

const loadedStat: StatCard = {
  id: 1,
  title: 'Issue Views',
  subtitle: 'Last 7 days',
  value: 27,
  change: 12,
  icon: FileText,
}

describe('StatsCard', () => {
  beforeEach(() => {
    themeState.current = 'dark'
  })

  it('transitions directly from its skeleton to real data without committing a zero or empty value', async () => {
    const { container, rerender } = render(<StatsCard loading index={0} />)
    const committedValues = ['loading']
    const observer = new MutationObserver(() => {
      committedValues.push(
        container.querySelector('[data-testid="stats-card-value"]')?.textContent ?? 'loading'
      )
    })
    observer.observe(container, { childList: true, subtree: true, characterData: true })

    expect(screen.getAllByTestId('skeleton-loader')).toHaveLength(5)
    expect(screen.queryByTestId('stats-card-value')).not.toBeInTheDocument()
    expect(container).not.toHaveTextContent(/\b0\b/)

    rerender(<StatsCard loading={false} stat={loadedStat} index={0} />)
    await Promise.resolve()
    observer.disconnect()

    expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument()
    expect(screen.getByText('Issue Views')).toBeInTheDocument()
    expect(screen.getByTestId('stats-card-value')).toHaveTextContent('27')
    expect(committedValues).toContain('27')
    expect(committedValues).not.toContain('0')
    expect(committedValues).not.toContain('')
  })

  it('transitions from loading to a visually and semantically distinct error state', () => {
    const { rerender } = render(<StatsCard loading />)

    rerender(<StatsCard loading={false} error="Fetch failed" />)

    const errorCard = screen.getByRole('alert')
    expect(errorCard).toHaveAttribute('data-state', 'error')
    expect(errorCard).toHaveClass('border-red-400/40')
    expect(errorCard).toHaveTextContent('Unable to load statistic')
    expect(errorCard).toHaveTextContent('Fetch failed')
    expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument()
    expect(screen.queryByTestId('stats-card-value')).not.toBeInTheDocument()
    expect(errorCard).not.toHaveTextContent(/\b0\b/)
  })

  it('defaults an uninitialized mount to the skeleton instead of a zero-value card', () => {
    const { container } = render(<StatsCard />)

    expect(screen.getAllByTestId('skeleton-loader')).toHaveLength(5)
    expect(screen.queryByTestId('stats-card')).not.toBeInTheDocument()
    expect(container).not.toHaveTextContent(/\b0\b/)
  })

  it.each([
    { change: 12, label: '+12%', colourClass: 'bg-green-500/20' },
    { change: -8, label: '-8%', colourClass: 'bg-red-500/20' },
    { change: 0, label: '0%', colourClass: 'bg-[#7a6b5a]/20' },
  ])('preserves loaded rendering for a $change percent trend', ({ change, label, colourClass }) => {
    themeState.current = change === 0 ? 'light' : 'dark'
    const stat = { ...loadedStat, value: change === 0 ? 0 : 27, change }

    render(<StatsCard stat={stat} index={2} />)

    const card = screen.getByTestId('stats-card')
    expect(card).toHaveAttribute('data-state', 'loaded')
    expect(within(card).getByTestId('stats-card-value')).toHaveTextContent(String(stat.value))
    expect(within(card).getByText(label)).toHaveClass(colourClass)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument()
  })
})
