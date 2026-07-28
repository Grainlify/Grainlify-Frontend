import { screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithTheme } from '../../../test/renderWithTheme'
import { BlogCTA } from './BlogCTA'

// Mock the Github icon which doesn't exist in the installed lucide-react 1.23.0
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react')
  return {
    ...(actual as Record<string, unknown>),
    Github: () => React.createElement('svg'),
  }
})

describe('BlogCTA', () => {
  it('renders the heading and body copy', () => {
    renderWithTheme(<BlogCTA />)

    expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument()
    expect(
      screen.getByText(
        /Whether you're a developer looking for your next challenge/i
      )
    ).toBeInTheDocument()
  })

  it('renders both CTA buttons with correct text', () => {
    renderWithTheme(<BlogCTA />)

    expect(screen.getByText('Join as Contributor')).toBeInTheDocument()
    expect(screen.getByText('Submit Your Project')).toBeInTheDocument()
  })

  it('renders without error under dark theme', () => {
    const { container } = renderWithTheme(<BlogCTA />, { theme: 'dark' })

    expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument()
    expect(screen.getByText('Join as Contributor')).toBeInTheDocument()
    expect(screen.getByText('Submit Your Project')).toBeInTheDocument()
    // Verify dark theme classes are applied
    const heading = screen.getByRole('heading', { name: /ready to get started/i })
    expect(heading.className).toContain('text-[#f5f5f5]')
  })

  it('renders without error under light theme', () => {
    renderWithTheme(<BlogCTA />, { theme: 'light' })

    const heading = screen.getByRole('heading', { name: /ready to get started/i })
    expect(heading.className).toContain('text-[#2d2820]')
    expect(screen.getByText('Join as Contributor')).toBeInTheDocument()
    expect(screen.getByText('Submit Your Project')).toBeInTheDocument()
  })

  it('renders both buttons as <button> elements', () => {
    renderWithTheme(<BlogCTA />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]).toHaveTextContent('Join as Contributor')
    expect(buttons[1]).toHaveTextContent('Submit Your Project')
  })
})