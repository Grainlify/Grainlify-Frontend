import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithTheme } from '../../../../test/renderWithTheme'
import { StatsCardSkeleton } from './StatsCardSkeleton'

/** The skeleton's outer card — the element that carries the theme-dependent classes. */
function renderSkeleton(theme: 'light' | 'dark') {
  const { container } = renderWithTheme(<StatsCardSkeleton />, { theme })
  return container.firstElementChild as HTMLElement
}

describe('StatsCardSkeleton', () => {
  // --- theme branching (acceptance criteria 1 & 2) ---

  it('renders dark-mode container classes when theme is dark', () => {
    const card = renderSkeleton('dark')

    expect(card).toHaveClass('bg-[#2d2820]/[0.4]', 'border-white/10')
    expect(card).not.toHaveClass('bg-white/[0.12]')
    expect(card).not.toHaveClass('border-white/20')
  })

  it('renders light-mode container classes when theme is light', () => {
    const card = renderSkeleton('light')

    expect(card).toHaveClass('bg-white/[0.12]', 'border-white/20')
    expect(card).not.toHaveClass('bg-[#2d2820]/[0.4]')
    expect(card).not.toHaveClass('border-white/10')
  })

  it('keeps the theme-independent card chrome in both themes', () => {
    for (const theme of ['light', 'dark'] as const) {
      const card = renderSkeleton(theme)
      expect(card).toHaveClass(
        'backdrop-blur-[40px]',
        'rounded-[20px]',
        'border',
        'p-6',
        'relative',
        'overflow-hidden',
        'transition-colors'
      )
    }
  })

  // --- placeholder structure (acceptance criterion 3) ---

  it('renders exactly the five expected SkeletonLoader placeholders', () => {
    renderSkeleton('dark')

    expect(screen.getAllByTestId('skeleton-loader')).toHaveLength(5)
  })

  it('shapes each placeholder for the StatsCard element it stands in for', () => {
    renderSkeleton('light')

    const [label, subLabel, icon, value, badge] = screen.getAllByTestId('skeleton-loader')

    // label + sub-label sit in the left column of the header row
    expect(label).toHaveClass('h-4', 'w-32', 'mb-2')
    expect(subLabel).toHaveClass('h-3', 'w-20')

    // icon is the only circle variant, matching StatsCard's 40px icon badge
    expect(icon).toHaveClass('w-10', 'h-10', 'rounded-full')
    expect(label).not.toHaveClass('rounded-full')

    // value, then the trend badge
    expect(value).toHaveClass('h-8', 'w-16')
    expect(badge).toHaveClass('h-5', 'w-20', 'rounded-[6px]')
  })

  it('places the label pair and the icon in the header row, value and badge below', () => {
    const card = renderSkeleton('dark')
    const [label, subLabel, icon, value, badge] = screen.getAllByTestId('skeleton-loader')

    const header = card.querySelector('.flex.items-start.justify-between')
    expect(header).not.toBeNull()
    expect(header).toContainElement(label)
    expect(header).toContainElement(subLabel)
    expect(header).toContainElement(icon)
    expect(header).not.toContainElement(value)
    expect(header).not.toContainElement(badge)

    // label and sub-label share the flex-1 column; the icon does not
    const labelColumn = header!.querySelector('.flex-1')
    expect(labelColumn).toContainElement(label)
    expect(labelColumn).toContainElement(subLabel)
    expect(labelColumn).not.toContainElement(icon)

    // the badge is the last child of the card, after the value block
    expect(card.lastElementChild).toBe(badge)
  })

  it('renders no text content while loading', () => {
    const card = renderSkeleton('dark')

    expect(card.textContent).toBe('')
    expect(screen.queryByTestId('stats-card-value')).not.toBeInTheDocument()
  })
})
