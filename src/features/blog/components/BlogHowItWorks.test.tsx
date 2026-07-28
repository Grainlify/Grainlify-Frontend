// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithTheme } from '../../../test/renderWithTheme'
import { BlogHowItWorks } from './BlogHowItWorks'

// lucide-react 1.23.0 is missing the Github icon export
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react')
  return {
    ...actual,
    Github: () => null,
  }
})

describe('BlogHowItWorks', () => {
  it('renders the "How It Works" heading', () => {
    renderWithTheme(<BlogHowItWorks />)
    expect(screen.getByText('How It Works')).toBeInTheDocument()
  })

  it('renders the "For Contributors" section heading', () => {
    renderWithTheme(<BlogHowItWorks />)
    expect(screen.getByText('For Contributors')).toBeInTheDocument()
  })

  it('renders the "For Project Maintainers" section heading', () => {
    renderWithTheme(<BlogHowItWorks />)
    expect(screen.getByText('For Project Maintainers')).toBeInTheDocument()
  })

  it('renders all five contributor steps in order as an ordered list', () => {
    renderWithTheme(<BlogHowItWorks />)

    const contributorsSection = screen.getByText('For Contributors').closest('div')!
    const ol = within(contributorsSection).getByRole('list')
    expect(ol.tagName).toBe('OL')

    const items = within(ol).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('Connect your GitHub account')
    expect(items[1]).toHaveTextContent('Browse projects that match your skills')
    expect(items[2]).toHaveTextContent('Start contributing to issues and features')
    expect(items[3]).toHaveTextContent('Earn rewards and build your reputation')
    expect(items[4]).toHaveTextContent('Climb the leaderboard and unlock opportunities')
  })

  it('renders all five maintainer steps in order as an ordered list', () => {
    renderWithTheme(<BlogHowItWorks />)

    const maintainersSection = screen.getByText('For Project Maintainers').closest('div')!
    const ol = within(maintainersSection).getByRole('list')
    expect(ol.tagName).toBe('OL')

    const items = within(ol).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('Submit your project to OnlyGrain')
    expect(items[1]).toHaveTextContent('Set up bounties and contribution guidelines')
    expect(items[2]).toHaveTextContent('Get matched with skilled developers')
    expect(items[3]).toHaveTextContent('Review contributions and approve rewards')
    expect(items[4]).toHaveTextContent('Scale your project with community support')
  })

  it('renders theme-consistent heading colour in dark mode', () => {
    const { container } = renderWithTheme(<BlogHowItWorks />, { theme: 'dark' })
    const heading = container.querySelector('h3')
    expect(heading).toBeInTheDocument()
    expect(heading!.className).toContain('text-[#f5f5f5]')
  })

  it('renders theme-consistent heading colour in light mode', () => {
    const { container } = renderWithTheme(<BlogHowItWorks />, { theme: 'light' })
    const heading = container.querySelector('h3')
    expect(heading).toBeInTheDocument()
    expect(heading!.className).toContain('text-[#2d2820]')
  })
})