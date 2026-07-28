import { screen, within } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithTheme } from '../../../test/renderWithTheme'
import { BlogHowItWorks } from './BlogHowItWorks'

// Mock the Github icon which doesn't exist in the installed lucide-react 1.23.0
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react')
  return {
    ...(actual as Record<string, unknown>),
    Github: () => React.createElement('svg'),
  }
})

describe('BlogHowItWorks', () => {
  it('renders the "How It Works" heading', () => {
    renderWithTheme(<BlogHowItWorks />)

    expect(screen.getByText('How It Works')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /how it works/i })).toBeInTheDocument()
  })

  it('renders all five contributor steps in order inside an <ol>', () => {
    renderWithTheme(<BlogHowItWorks />)

    const contributorHeading = screen.getByText('For Contributors')
    expect(contributorHeading).toBeInTheDocument()

    const contributorSection = contributorHeading.closest('div')!
    const ol = within(contributorSection).getByRole('list')
    expect(ol).toBeInTheDocument()
    expect(ol.tagName).toBe('OL')

    const items = within(ol).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('Connect your GitHub account')
    expect(items[1]).toHaveTextContent('Browse projects that match your skills')
    expect(items[2]).toHaveTextContent('Start contributing to issues and features')
    expect(items[3]).toHaveTextContent('Earn rewards and build your reputation')
    expect(items[4]).toHaveTextContent('Climb the leaderboard and unlock opportunities')
  })

  it('renders all five maintainer steps in order inside an <ol>', () => {
    renderWithTheme(<BlogHowItWorks />)

    const maintainerHeading = screen.getByText('For Project Maintainers')
    expect(maintainerHeading).toBeInTheDocument()

    const maintainerSection = maintainerHeading.closest('div')!
    const ol = within(maintainerSection).getByRole('list')
    expect(ol).toBeInTheDocument()
    expect(ol.tagName).toBe('OL')

    const items = within(ol).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('Submit your project to OnlyGrain')
    expect(items[1]).toHaveTextContent('Set up bounties and contribution guidelines')
    expect(items[2]).toHaveTextContent('Get matched with skilled developers')
    expect(items[3]).toHaveTextContent('Review contributions and approve rewards')
    expect(items[4]).toHaveTextContent('Scale your project with community support')
  })
})