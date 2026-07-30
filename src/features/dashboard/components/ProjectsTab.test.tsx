import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectsTab } from './ProjectsTab'

vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
  }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

beforeEach(() => {
  mockNavigate.mockClear()
})

describe('ProjectsTab', () => {
  it('renders a table with correct accessibility attributes', () => {
    render(<ProjectsTab />)

    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()

    const caption = table.querySelector('caption')
    expect(caption).toBeInTheDocument()
    expect(caption).toHaveTextContent(/projects/i)
    expect(caption).toHaveClass('sr-only')

    const headers = screen.getAllByRole('columnheader')
    expect(headers.length).toBe(10)
    headers.forEach((header) => {
      expect(header).toHaveAttribute('scope', 'col')
    })
  })

  it('renders project data correctly', () => {
    render(<ProjectsTab />)

    // Check for some sample project data
    expect(screen.getAllByText('React Ecosystem').length).toBeGreaterThan(0)
    expect(screen.getAllByText('project-lead-1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1250').length).toBeGreaterThan(0)
    expect(screen.getAllByText('3,600 USD').length).toBeGreaterThan(0)

    expect(screen.getAllByText('Next.js Framework').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Django').length).toBeGreaterThan(0)
  })

  it('renders mobile view cards', () => {
    render(<ProjectsTab />)

    // In JSDOM, both desktop and mobile views are rendered unless we mock matchMedia
    // or rely on CSS hiding (which JSDOM doesn't do by default for layout).
    // The mobile view has "Contributors" as a label in the stats grid.
    const contributorLabels = screen.getAllByText('Contributors')
    // There are 10 columns in desktop (one is "Contributors")
    // and 5 projects in mobile (each has a "Contributors" label).
    // Total should be 1 + 5 = 6.
    expect(contributorLabels.length).toBe(6)
  })

  it("navigates to the project detail page when a desktop 'See project' button is clicked", async () => {
    render(<ProjectsTab />)
    const user = userEvent.setup()

    const buttons = screen.getAllByRole('button', { name: 'See project' })
    await user.click(buttons[0])

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/projects/1')
  })

  it("navigates to the project detail page when a mobile 'See project' button is clicked", async () => {
    render(<ProjectsTab />)
    const user = userEvent.setup()

    // Desktop rows render first, then mobile cards, both with the same
    // number of "See project" buttons (one per project) — the second half
    // of the list is the mobile view.
    const buttons = screen.getAllByRole('button', { name: 'See project' })
    await user.click(buttons[buttons.length / 2])

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/projects/1')
  })
})
