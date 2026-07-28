// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithTheme } from '../../../test/renderWithTheme'
import { BlogFeatureList } from './BlogFeatureList'
import type { BlogFeature } from '../types'

const sampleFeatures: BlogFeature[] = [
  { number: 1, title: 'Smart Matching', description: 'AI-powered connections between projects and contributors.' },
  { number: 2, title: 'Transparent Rewards', description: 'Blockchain-verified bounty payouts with full audit trail.' },
  { number: 3, title: 'Community Growth', description: 'Built-in reputation system to showcase your contributions.' },
]

describe('BlogFeatureList', () => {
  it('renders an empty container without throwing when features array is empty', () => {
    const { container } = renderWithTheme(<BlogFeatureList features={[]} />)
    expect(container.firstChild).toBeInTheDocument()
    expect(container.firstChild!.childNodes).toHaveLength(0)
  })

  it('renders a single feature with its number, title, and description', () => {
    const singleFeature: BlogFeature[] = [
      { number: 5, title: 'Quick Setup', description: 'Get started in minutes.' },
    ]
    renderWithTheme(<BlogFeatureList features={singleFeature} />)

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Quick Setup')).toBeInTheDocument()
    expect(screen.getByText('Get started in minutes.')).toBeInTheDocument()
  })

  it('renders multiple features in the given order', () => {
    renderWithTheme(<BlogFeatureList features={sampleFeatures} />)

    const items = screen.getAllByText(/Smart Matching|Transparent Rewards|Community Growth/)
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Smart Matching')
    expect(items[1]).toHaveTextContent('Transparent Rewards')
    expect(items[2]).toHaveTextContent('Community Growth')
  })

  it('renders each feature keyed by its number', () => {
    const { container } = renderWithTheme(<BlogFeatureList features={sampleFeatures} />)

    // Each feature number renders in a gradient circle div
    const numberCircles = container.querySelectorAll('.flex-shrink-0')
    expect(numberCircles).toHaveLength(3)
    expect(numberCircles[0]).toHaveTextContent('1')
    expect(numberCircles[1]).toHaveTextContent('2')
    expect(numberCircles[2]).toHaveTextContent('3')
  })

  it('renders theme-consistent heading colour in dark mode', () => {
    const { container } = renderWithTheme(<BlogFeatureList features={sampleFeatures} />, { theme: 'dark' })
    const headings = container.querySelectorAll('h4')
    expect(headings[0].className).toContain('text-[#f5f5f5]')
  })

  it('renders theme-consistent heading colour in light mode', () => {
    const { container } = renderWithTheme(<BlogFeatureList features={sampleFeatures} />, { theme: 'light' })
    const headings = container.querySelectorAll('h4')
    expect(headings[0].className).toContain('text-[#2d2820]')
  })
})