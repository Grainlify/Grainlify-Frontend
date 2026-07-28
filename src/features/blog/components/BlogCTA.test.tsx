// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithTheme } from '../../../test/renderWithTheme'
import { BlogCTA } from './BlogCTA'

// lucide-react 1.23.0 is missing the Github icon export
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react')
  return {
    ...actual,
    Github: () => null,
  }
})

describe('BlogCTA', () => {
  it('renders the "Ready to Get Started?" heading', () => {
    renderWithTheme(<BlogCTA />)
    expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument()
  })

  it('renders the body copy text', () => {
    renderWithTheme(<BlogCTA />)
    expect(
      screen.getByText(/Whether you're a developer looking for your next challenge/)
    ).toBeInTheDocument()
  })

  it('renders the "Join as Contributor" button', () => {
    renderWithTheme(<BlogCTA />)
    const btn = screen.getByText('Join as Contributor')
    expect(btn).toBeInTheDocument()
    expect(btn.tagName).toBe('BUTTON')
  })

  it('renders the "Submit Your Project" button', () => {
    renderWithTheme(<BlogCTA />)
    const btn = screen.getByText('Submit Your Project')
    expect(btn).toBeInTheDocument()
    expect(btn.tagName).toBe('BUTTON')
  })

  it('renders theme-consistent heading colour in dark mode', () => {
    const { container } = renderWithTheme(<BlogCTA />, { theme: 'dark' })
    const heading = container.querySelector('h3')
    expect(heading).toBeInTheDocument()
    expect(heading!.className).toContain('text-[#f5f5f5]')
  })

  it('renders theme-consistent heading colour in light mode', () => {
    const { container } = renderWithTheme(<BlogCTA />, { theme: 'light' })
    const heading = container.querySelector('h3')
    expect(heading).toBeInTheDocument()
    expect(heading!.className).toContain('text-[#2d2820]')
  })

  it('renders theme-consistent paragraph colour in dark mode', () => {
    const { container } = renderWithTheme(<BlogCTA />, { theme: 'dark' })
    const paragraph = container.querySelector('p')
    expect(paragraph).toBeInTheDocument()
    expect(paragraph!.className).toContain('text-[#d4d4d4]')
  })

  it('renders theme-consistent paragraph colour in light mode', () => {
    const { container } = renderWithTheme(<BlogCTA />, { theme: 'light' })
    const paragraph = container.querySelector('p')
    expect(paragraph).toBeInTheDocument()
    expect(paragraph!.className).toContain('text-[#6b5d4d]')
  })
})