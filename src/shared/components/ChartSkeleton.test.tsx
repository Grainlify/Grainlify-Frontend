import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChartSkeleton } from './ChartSkeleton'

vi.mock('./SkeletonLoader', () => ({
  SkeletonLoader: ({
    width,
    height,
    className,
  }: {
    width?: string
    height?: string
    className?: string
  }) => (
    <div
      data-testid="skeleton-loader"
      data-width={width}
      data-height={height}
      className={className}
    />
  ),
}))

describe('ChartSkeleton', () => {
  it('renders title and legend sections and six bars by default', () => {
    const { container } = render(<ChartSkeleton />)

    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument()

    const barArea = container.querySelector('[data-testid="chart-skeleton"] .flex.items-end')
    expect(barArea).not.toBeNull()
    // Six bar columns, each wrapping a bar + an x-axis label placeholder
    expect(barArea?.children.length).toBe(6)

    // Legend row present by default
    expect(container.querySelector('.justify-center')).not.toBeNull()
  })

  it('produces identical markup across two renders (deterministic bar heights)', () => {
    const first = render(<ChartSkeleton />).container.innerHTML
    const second = render(<ChartSkeleton />).container.innerHTML
    expect(first).toBe(second)
  })

  it('omits the title section when showTitle is false', () => {
    const { container } = render(<ChartSkeleton showTitle={false} />)
    // With no title, the first child of the skeleton is the chart area wrapper,
    // which contains the bar area.
    const firstChild = container.querySelector('[data-testid="chart-skeleton"] > div:first-child')
    expect(firstChild?.querySelector('.flex.items-end')).not.toBeNull()
  })

  it('omits the legend section when showLegend is false', () => {
    const { container } = render(<ChartSkeleton showLegend={false} />)
    expect(container.querySelector('.justify-center')).toBeNull()
  })

  it('applies barAreaHeight to the bar area container', () => {
    const { container } = render(<ChartSkeleton barAreaHeight="100%" />)
    const barArea = container.querySelector(
      '[data-testid="chart-skeleton"] .flex.items-end'
    ) as HTMLElement
    expect(barArea?.style.height).toBe('100%')
  })
})
