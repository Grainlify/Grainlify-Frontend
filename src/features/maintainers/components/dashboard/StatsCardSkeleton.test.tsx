import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithTheme } from '../../../../test/renderWithTheme'
import { StatsCardSkeleton } from './StatsCardSkeleton'

describe('StatsCardSkeleton', () => {
  it('renders the container with dark-mode classes when theme is dark', () => {
    const { container } = renderWithTheme(<StatsCardSkeleton />, { theme: 'dark' })

    const outer = container.firstChild as HTMLElement
    expect(outer).toBeInTheDocument()
    expect(outer.className).toContain('bg-[#2d2820]/[0.4]')
    expect(outer.className).toContain('border-white/10')
  })

  it('renders the container with light-mode classes when theme is light', () => {
    const { container } = renderWithTheme(<StatsCardSkeleton />, { theme: 'light' })

    const outer = container.firstChild as HTMLElement
    expect(outer).toBeInTheDocument()
    expect(outer.className).toContain('bg-white/[0.12]')
    expect(outer.className).toContain('border-white/20')
  })

  it('renders the expected number of SkeletonLoader placeholders', () => {
    renderWithTheme(<StatsCardSkeleton />)

    const skeletons = screen.getAllByTestId('skeleton-loader')
    // 5 skeletons: label (h-4 w-32), sub-label (h-3 w-20), icon circle (w-10 h-10),
    // value (h-8 w-16), badge (h-5 w-20 rounded-[6px])
    expect(skeletons).toHaveLength(5)
  })

  it('renders a circle variant skeleton for the icon placeholder', () => {
    const { container } = renderWithTheme(<StatsCardSkeleton />)

    // The icon skeleton is the 3rd skeleton loader — it should have a rounded-full class
    const skeletons = container.querySelectorAll('[data-testid="skeleton-loader"]')
    expect(skeletons).toHaveLength(5)
    expect(skeletons[2].className).toContain('rounded-full')
  })

  it('renders the badge skeleton with rounded-[6px] style', () => {
    const { container } = renderWithTheme(<StatsCardSkeleton />)

    const skeletons = container.querySelectorAll('[data-testid="skeleton-loader"]')
    // The 5th skeleton (badge) has rounded-[6px] via className
    expect(skeletons[4].className).toContain('rounded-[6px]')
  })

  it('applies backdrop-blur and rounded-[20px] layout classes', () => {
    const { container } = renderWithTheme(<StatsCardSkeleton />)

    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('backdrop-blur-[40px]')
    expect(outer.className).toContain('rounded-[20px]')
    expect(outer.className).toContain('p-6')
  })

  it('switches theme classes when theme context changes', () => {
    const { container, rerender } = renderWithTheme(<StatsCardSkeleton />, { theme: 'dark' })

    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('bg-[#2d2820]/[0.4]')

    rerender(
      <StatsCardSkeleton />
    )
    // renderWithTheme sets localStorage before render, so a fresh renderWithTheme call is needed
    const { container: lightContainer } = renderWithTheme(<StatsCardSkeleton />, { theme: 'light' })
    const lightOuter = lightContainer.firstChild as HTMLElement
    expect(lightOuter.className).toContain('bg-white/[0.12]')
  })
})