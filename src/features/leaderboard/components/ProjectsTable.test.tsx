import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'
import { ProjectsTable } from './ProjectsTable'
import { ProjectData } from '../types'

const projects: ProjectData[] = [
  {
    id: 'proj-1',
    rank: 1,
    name: 'DeFi Protocol',
    logo: '🌐',
    score: 8950,
    trend: 'up',
    trendValue: 2,
    contributors: 342,
    ecosystems: ['Web3'],
    activity: 'Very High',
  },
  {
    id: 'proj-2',
    rank: 2,
    name: 'AI Framework',
    logo: '🤖',
    score: 7840,
    trend: 'same',
    trendValue: 0,
    contributors: 289,
    ecosystems: ['AI'],
    activity: 'High',
  },
]

/** A stand-in detail page that surfaces the matched project id for assertions. */
function ProjectProbe() {
  const { projectId } = useParams<{ projectId: string }>()
  return <div data-testid="project-detail">project:{projectId}</div>
}

/**
 * Render the table inside a router whose detail route simply echoes the
 * `:projectId`, so navigation can be asserted purely from rendered output.
 */
function renderTable(data: ProjectData[] = projects) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/dashboard/leaderboard']}>
        <Routes>
          <Route
            path="/dashboard/leaderboard"
            element={<ProjectsTable data={data} activeFilter="overall" isLoaded />}
          />
          <Route path="/dashboard/projects/:projectId" element={<ProjectProbe />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  )
}

describe('ProjectsTable — View Project navigation', () => {
  it('renders a View Project link per project pointing at its detail route', () => {
    renderTable()

    const links = screen.getAllByRole('link', { name: /project details$/i })
    expect(links).toHaveLength(2)

    expect(
      screen.getByRole('link', { name: /view defi protocol project details/i })
    ).toHaveAttribute('href', '/dashboard/projects/proj-1')
    expect(
      screen.getByRole('link', { name: /view ai framework project details/i })
    ).toHaveAttribute('href', '/dashboard/projects/proj-2')
  })

  it('navigates to the correct project detail page when clicked', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole('link', { name: /view ai framework project details/i }))

    expect(screen.getByTestId('project-detail')).toHaveTextContent('project:proj-2')
  })

  it('is keyboard-focusable and activates the first project on Enter', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.tab()
    const firstLink = screen.getByRole('link', {
      name: /view defi protocol project details/i,
    })
    expect(firstLink).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(screen.getByTestId('project-detail')).toHaveTextContent('project:proj-1')
  })

  it('renders a visible focus ring for keyboard users', () => {
    renderTable()
    const link = screen.getByRole('link', {
      name: /view defi protocol project details/i,
    })
    expect(link.className).toMatch(/focus-visible:ring-2/)
  })

  it('URL-encodes ids that contain reserved characters', () => {
    renderTable([{ ...projects[0], id: 'acme/repo name' }])
    expect(
      screen.getByRole('link', { name: /view defi protocol project details/i })
    ).toHaveAttribute('href', '/dashboard/projects/acme%2Frepo%20name')
  })

  it('renders a disabled, non-navigating control when a project has no id', () => {
    const { id: _id, ...withoutId } = projects[0]
    renderTable([withoutId])

    expect(screen.queryByRole('link', { name: /project details/i })).not.toBeInTheDocument()

    const button = screen.getByRole('button', { name: /view project/i })
    expect(button).toBeDisabled()
  })

  it('renders correctly under the dark theme', () => {
    localStorage.setItem('theme', 'dark')
    try {
      renderTable()
      expect(screen.getByText('DeFi Protocol')).toBeInTheDocument()
    } finally {
      localStorage.clear()
    }
  })
})

describe('ProjectsTable states', () => {
  it('renders an accessible empty state for zero rows', () => {
    renderTable([])
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('renders an error state with an assertive live region and retry', async () => {
    const onRetry = vi.fn()
    render(
      <ThemeProvider>
        <MemoryRouter>
          <ProjectsTable
            data={[]}
            activeFilter="overall"
            isLoaded
            error="We couldn't load projects. Please try again."
            onRetry={onRetry}
          />
        </MemoryRouter>
      </ThemeProvider>
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
    expect(screen.getByText(/please try again/i)).toBeInTheDocument()
    expect(alert.textContent).not.toMatch(/stack|http|status\s*\d/i)

    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
