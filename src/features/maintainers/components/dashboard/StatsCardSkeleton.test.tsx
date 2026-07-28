import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithTheme } from '../../../../test/renderWithTheme'
import { StatsCardSkeleton } from './StatsCardSkeleton'

describe('StatsCardSkeleton', () => {
  it('renders dark-mode classes when theme === "dark"', () => {
    const { container } = renderWithTheme(<StatsCardSkeleton />, { theme: 'dark' })

    const outer = container.firstElementChild as HTMLElement
    expect(outer.className).toContain('bg-[#2d2820]/[0.4]')
    expect(outer.className).toContain('border-white/10')
  })

  it('renders light-mode classes when theme === "light"', () => {
    const { container } = renderWithTheme(<StatsCardSkeleton />, { theme: 'light' })

    const outer = container.firstElementChild as HTMLElement
    expect(outer.className).toContain('bg-white/[0.12]')
    expect(outer.className).toContain('border-white/20')
  })

  it('renders all five expected SkeletonLoader placeholders', () => {
    renderWithTheme(<StatsCardSkeleton />, { theme: 'dark' })

    const loaders = screen.getAllByTestId('skeleton-loader')
    expect(loaders).toHaveLength(5)
  })

  it('renders skeleton placeholders in the correct order: label, sub-label, icon circle, value, badge', () => {
    const { container } = renderWithTheme(<StatsCardSkeleton />, { theme: 'dark' })

    const loaders = screen.getAllByTestId('skeleton-loader')

    // Row: label + sub-label + icon circle
    const row = container.querySelector('.flex.items-start.justify-between')
    expect(row).toBeInTheDocument()
    expect(row?.querySelectorAll('[data-testid="skeleton-loader"]')).toHaveLength(3)

    // First two in the row are the label and sub-label
    expect(loaders[0].className).toContain('h-4 w-32')
    expect(loaders[1].className).toContain('h-3 w-20')

    // Third is the icon circle
    expect(loaders[2].className).toContain('rounded-full')
    expect(loaders[2].className).toContain('w-10 h-10')

    // Fourth is the value
    expect(loaders[3].className).toContain('h-8 w-16')

    // Fifth is the badge
    expect(loaders[4].className).toContain('h-5 w-20')
  })
})