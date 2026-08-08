// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { ProjectCardSkeleton } from './ProjectCardSkeleton'
import { renderWithTheme } from '../../../test/renderWithTheme'

describe('ProjectCardSkeleton', () => {
  it('renders dark-mode classes when theme is dark', () => {
    renderWithTheme(<ProjectCardSkeleton />, { theme: 'dark' })

    const container = screen.getByTestId('project-card-skeleton')
    expect(container.className).toContain('bg-white/[0.08]')
    expect(container.className).toContain('border-white/15')
  })

  it('renders light-mode classes when theme is light', () => {
    renderWithTheme(<ProjectCardSkeleton />, { theme: 'light' })

    const container = screen.getByTestId('project-card-skeleton')
    expect(container.className).toContain('bg-white/[0.15]')
    expect(container.className).toContain('border-white/25')
  })

  it('renders the structural sections: icon, title, description, stars, stats grid, tags', () => {
    const { container } = renderWithTheme(<ProjectCardSkeleton />)

    // Icon skeleton: inside the flex container
    const iconWrapper = container.querySelector('.flex.items-start.justify-between')
    expect(iconWrapper).toBeInTheDocument()
    const iconSkeleton = iconWrapper?.querySelector('[class*="w-11"][class*="h-11"]')
    expect(iconSkeleton).toBeInTheDocument()

    // Title skeleton (h-5)
    const title = container.querySelector('.h-5')
    expect(title).toBeInTheDocument()

    // Description line 1 (h-3)
    const descLine1 = container.querySelectorAll('.h-3')
    // At least one description skeleton should exist
    expect(descLine1.length).toBeGreaterThanOrEqual(1)

    // Stars/forks row
    const starsRow = container.querySelector('.space-x-3')
    expect(starsRow).toBeInTheDocument()

    // Stats grid with 3 columns
    const grid = container.querySelector('.grid-cols-3')
    expect(grid).toBeInTheDocument()
    const statValues = grid?.querySelectorAll('[class*="h-6"][class*="w-8"]')
    expect(statValues?.length).toBe(3)

    // Tags row: 3 tag placeholders in the flex-wrap container
    const tagsContainer = container.querySelector('.flex.flex-wrap')
    expect(tagsContainer).toBeInTheDocument()
    expect(tagsContainer?.children?.length).toBe(3)
  })
})
