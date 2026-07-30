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
  it('keeps projects with tied ranks as distinct rows', () => {
    renderTable([
      projects[0],
      { ...projects[1], id: 'proj-3', name: 'Another Protocol', rank: projects[0].rank },
    ])

    expect(screen.getByText('DeFi Protocol')).toBeInTheDocument()
    expect(screen.getByText('Another Protocol')).toBeInTheDocument()
  })

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

describe('ProjectsTable — trend icons', () => {
  /** The trend cell is the second column of a row; icons live inside it. */
  const trendIcons = (container: HTMLElement) =>
    Array.from(
      container.querySelectorAll<SVGElement>('svg[class*="lucide-trending"], svg.lucide-minus')
    )

  it.each([
    ['up' as const, 'lucide-trending-up', 'text-green-600'],
    ['down' as const, 'lucide-trending-down', 'text-red-600'],
    ['same' as const, 'lucide-minus', 'text-[#7a6b5a]'],
  ])('renders the %s trend with its icon and colour', (trend, iconClass, colourClass) => {
    const { container } = renderTable([{ ...projects[0], trend }])

    const icons = trendIcons(container)
    expect(icons).toHaveLength(1)
    expect(icons[0]).toHaveClass(iconClass, 'w-4', 'h-4', colourClass)
  })

  it('renders one icon per row even when rows share the same trend', () => {
    const { container } = renderTable([
      { ...projects[0], trend: 'up' },
      { ...projects[1], trend: 'up' },
    ])

    // The icons come from a shared, module-level lookup; reusing the same
    // element across rows must still produce one distinct node per row.
    const icons = trendIcons(container)
    expect(icons).toHaveLength(2)
    expect(icons[0]).not.toBe(icons[1])
    icons.forEach((icon) => expect(icon).toHaveClass('lucide-trending-up', 'text-green-600'))
  })

  it('keeps trend icons stable across re-renders with unchanged data', () => {
    const { container, rerender } = renderTable()
    const before = trendIcons(container)

    rerender(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/dashboard/leaderboard']}>
          <Routes>
            <Route
              path="/dashboard/leaderboard"
              element={<ProjectsTable data={projects} activeFilter="overall" isLoaded />}
            />
            <Route path="/dashboard/projects/:projectId" element={<ProjectProbe />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    )

    const after = trendIcons(container)
    expect(after).toHaveLength(before.length)
    after.forEach((icon, i) => expect(icon).toBe(before[i]))
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
