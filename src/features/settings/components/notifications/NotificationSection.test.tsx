// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithTheme } from '../../../../test/renderWithTheme'
import { NotificationSection } from './NotificationSection'

describe('NotificationSection', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the title as an accessible heading', () => {
    renderWithTheme(
      <NotificationSection title="Global">
        <p>Child content</p>
      </NotificationSection>
    )

    const heading = screen.getByRole('heading', { name: 'Global' })
    expect(heading).toBeInTheDocument()
    expect(heading.tagName).toBe('H3')
  })

  it('renders children inside the section', () => {
    renderWithTheme(
      <NotificationSection title="Contributor">
        <p>Notification row content</p>
      </NotificationSection>
    )

    expect(screen.getByText('Notification row content')).toBeInTheDocument()
  })

  it('applies light theme classes', () => {
    renderWithTheme(
      <NotificationSection title="Light">
        <span>Content</span>
      </NotificationSection>,
      { theme: 'light' }
    )

    const container = screen.getByRole('heading', { name: 'Light' }).parentElement!
    expect(container.className).toContain('bg-white/[0.12]')
    expect(container.className).toContain('border-white/20')
    expect(container.className).toContain('backdrop-blur-[40px]')
    expect(container.className).toContain('rounded-[24px]')

    const heading = screen.getByRole('heading', { name: 'Light' })
    expect(heading.className).toContain('text-[#2d2820]')
    expect(heading.className).toContain('font-bold')
  })

  it('applies dark theme classes', () => {
    renderWithTheme(
      <NotificationSection title="Dark">
        <span>Content</span>
      </NotificationSection>,
      { theme: 'dark' }
    )

    const container = screen.getByRole('heading', { name: 'Dark' }).parentElement!
    expect(container.className).toContain('bg-[#2d2820]/[0.4]')
    expect(container.className).toContain('border-white/10')
    expect(container.className).toContain('backdrop-blur-[40px]')
    expect(container.className).toContain('rounded-[24px]')

    const heading = screen.getByRole('heading', { name: 'Dark' })
    expect(heading.className).toContain('text-[#f5efe5]')
    expect(heading.className).toContain('font-bold')
  })

  it('renders successfully with empty/falsy children', () => {
    renderWithTheme(<NotificationSection title="Empty">{null}</NotificationSection>)

    expect(screen.getByRole('heading', { name: 'Empty' })).toBeInTheDocument()
  })

  it('renders a long title without truncation', () => {
    const longTitle =
      'This is a very long notification section title that should render fully without being truncated by the component'

    renderWithTheme(
      <NotificationSection title={longTitle}>
        <span>Content</span>
      </NotificationSection>
    )

    const heading = screen.getByRole('heading', { name: longTitle })
    expect(heading).toBeInTheDocument()
    expect(heading.textContent).toBe(longTitle)
  })
})
