import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithTheme } from '../../../test/renderWithTheme'
import { BlogWhyChoose } from './BlogWhyChoose'

describe('BlogWhyChoose', () => {
  it('renders all four card titles', () => {
    renderWithTheme(<BlogWhyChoose />)

    expect(screen.getByText('Lightning Fast Matching')).toBeInTheDocument()
    expect(screen.getByText('All Chains, One Platform')).toBeInTheDocument()
    expect(screen.getByText('Fair Compensation')).toBeInTheDocument()
    expect(screen.getByText('Vibrant Community')).toBeInTheDocument()
  })

  it('renders all four card descriptions', () => {
    renderWithTheme(<BlogWhyChoose />)

    expect(
      screen.getByText(/Our AI-powered algorithm instantly connects you/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Access projects from every major blockchain/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Transparent reward systems ensure contributors/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Join thousands of developers and projects/i)
    ).toBeInTheDocument()
  })

  it('renders correctly under dark theme', () => {
    renderWithTheme(<BlogWhyChoose />, { theme: 'dark' })

    const headings = screen.getAllByRole('heading', { level: 4 })
    expect(headings).toHaveLength(4)
    headings.forEach((h) => {
      expect(h.className).toContain('text-[#f5f5f5]')
    })
  })

  it('renders correctly under light theme', () => {
    renderWithTheme(<BlogWhyChoose />, { theme: 'light' })

    const headings = screen.getAllByRole('heading', { level: 4 })
    expect(headings).toHaveLength(4)
    headings.forEach((h) => {
      expect(h.className).toContain('text-[#2d2820]')
    })
  })

  it('renders four cards in a grid', () => {
    const { container } = renderWithTheme(<BlogWhyChoose />)

    const grid = container.firstElementChild!
    expect(grid.className).toContain('grid')
    expect(grid.children).toHaveLength(4)
  })
})