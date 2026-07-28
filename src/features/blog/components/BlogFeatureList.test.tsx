import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithTheme } from '../../../test/renderWithTheme'
import { BlogFeatureList } from './BlogFeatureList'
import type { BlogFeature } from '../types'

const mockFeatures: BlogFeature[] = [
  { number: 1, title: 'Real-time Analytics', description: 'Track your project metrics in real time with live dashboards.' },
  { number: 2, title: 'Smart Notifications', description: 'Get notified about important events and updates instantly.' },
  { number: 3, title: 'Team Collaboration', description: 'Work together seamlessly with built-in collaboration tools.' },
]

describe('BlogFeatureList', () => {
  it('renders an empty container without throwing when features is an empty array', () => {
    const { container } = renderWithTheme(<BlogFeatureList features={[]} />)

    expect(container.firstElementChild).toBeInTheDocument()
    expect(container.firstElementChild!.className).toContain('space-y-6')
    expect(container.firstElementChild!.childNodes.length).toBe(0)
  })

  it('renders a single feature with its number, title, and description', () => {
    const singleFeature: BlogFeature[] = [
      { number: 42, title: 'Single Feature', description: 'Only one feature in this list.' },
    ]

    renderWithTheme(<BlogFeatureList features={singleFeature} />)

    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Single Feature')).toBeInTheDocument()
    expect(screen.getByText('Only one feature in this list.')).toBeInTheDocument()
  })

  it('renders multiple features in the given order', () => {
    renderWithTheme(<BlogFeatureList features={mockFeatures} />)

    const items = screen.getAllByRole('heading', { level: 4 })
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Real-time Analytics')
    expect(items[1]).toHaveTextContent('Smart Notifications')
    expect(items[2]).toHaveTextContent('Team Collaboration')
  })

  it('renders feature numbers, titles, and descriptions for all features', () => {
    renderWithTheme(<BlogFeatureList features={mockFeatures} />)

    // Check all numbers are rendered
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    // Check all titles are rendered
    expect(screen.getByText('Real-time Analytics')).toBeInTheDocument()
    expect(screen.getByText('Smart Notifications')).toBeInTheDocument()
    expect(screen.getByText('Team Collaboration')).toBeInTheDocument()

    // Check all descriptions are rendered
    expect(screen.getByText('Track your project metrics in real time with live dashboards.')).toBeInTheDocument()
    expect(screen.getByText('Get notified about important events and updates instantly.')).toBeInTheDocument()
    expect(screen.getByText('Work together seamlessly with built-in collaboration tools.')).toBeInTheDocument()
  })
})