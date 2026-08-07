import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { DiscoverPage } from './DiscoverPage'
import { getRecommendedProjects, getPublicProjectIssues } from '../../../shared/api/client'

// DiscoverPage fetches recommended projects (getRecommendedProjects) and, once those
// resolve, recommended issues sourced from those projects (getPublicProjectIssues) —
// both via useOptimisticData. Mock only what DiscoverPage itself imports from the
// client; IssueDetailPage/ProjectDetailPage are imported for DiscoverPage's own
// internal selectedIssue/selectedProjectId overlay (confirmed by reading the source —
// DiscoverPage owns that state itself, it is not delegated to Dashboard), but since
// none of these tests click into a card to open that overlay, their extra client
// dependencies (getPublicProject, getMyProjects, etc.) never get invoked.
vi.mock('../../../shared/api/client', () => ({
  getRecommendedProjects: vi.fn(),
  getPublicProjectIssues: vi.fn(),
}))

const mockedGetRecommendedProjects = vi.mocked(getRecommendedProjects)
const mockedGetPublicProjectIssues = vi.mocked(getPublicProjectIssues)

type RecommendedProjectsResponse = Awaited<ReturnType<typeof getRecommendedProjects>>
type ApiProject = RecommendedProjectsResponse['projects'][number]

type IssuesResponse = Awaited<ReturnType<typeof getPublicProjectIssues>>
type ApiIssue = IssuesResponse['issues'][number]

function makeApiProject(
  overrides: Partial<ApiProject> & Pick<ApiProject, 'id' | 'github_full_name'>,
): ApiProject {
  return {
    language: 'TypeScript',
    tags: [],
    category: null,
    stars_count: 0,
    forks_count: 0,
    contributors_count: 0,
    open_issues_count: 0,
    open_prs_count: 0,
    ecosystem_name: null,
    ecosystem_slug: null,
    description: '',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeApiIssue(
  overrides: Partial<ApiIssue> & Pick<ApiIssue, 'github_issue_id' | 'title'>,
): ApiIssue {
  return {
    number: overrides.github_issue_id,
    state: 'open',
    description: null,
    author_login: 'octocat',
    labels: [],
    url: 'https://github.com/example/example/issues/1',
    updated_at: null,
    last_seen_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// projectA's github_full_name maps to display name "widget-kit" (the part after the
// slash) — DiscoverPage derives every card field (name, icon, stars, forks, tags,
// ecosystem_name) from this shape, so these fixtures mirror the real API response.
const projectA = makeApiProject({
  id: 'proj-a',
  github_full_name: 'acme/widget-kit',
  description: 'A great widget kit for building things',
  stars_count: 1234,
  forks_count: 56,
  open_issues_count: 3,
  tags: ['TypeScript', 'CLI'],
  ecosystem_name: 'Ecosystem Alpha',
})

const projectB = makeApiProject({
  id: 'proj-b',
  github_full_name: 'globex/data-tool',
  description: 'A data processing tool',
  stars_count: 42,
  forks_count: 7,
  open_issues_count: 1,
  tags: ['Python'],
})

describe('DiscoverPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows the loading skeleton, then real project and issue content once fetches resolve', async () => {
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [projectA, projectB] })
    mockedGetPublicProjectIssues.mockImplementation(async (projectId: string) => {
      if (projectId === 'proj-a') {
        return {
          issues: [
            makeApiIssue({
              github_issue_id: 101,
              title: 'Fix crash on startup',
              description: 'Steps to reproduce the crash',
              labels: ['bug'],
            }),
            makeApiIssue({
              github_issue_id: 102,
              title: 'Add dark mode toggle',
              description: 'Nice to have setting',
              labels: ['enhancement'],
            }),
          ],
        }
      }
      return {
        issues: [
          makeApiIssue({
            github_issue_id: 201,
            title: 'Improve documentation',
            description: 'Docs are outdated',
            labels: [{ name: 'good first issue' }],
          }),
        ],
      }
    })

    const { container } = renderWithProviders(<DiscoverPage />)

    // Loading skeletons render before the fetches resolve.
    expect(screen.getByText(/Finding projects best suited/i)).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText('widget-kit')).toBeInTheDocument()
    })
    expect(screen.getByText('data-tool')).toBeInTheDocument()
    expect(screen.getByText('Ecosystem Alpha')).toBeInTheDocument()
    expect(screen.getByText('1.2K')).toBeInTheDocument()
    expect(screen.getByText('Recommended Projects (2)')).toBeInTheDocument()
    expect(mockedGetRecommendedProjects).toHaveBeenCalledWith(8)

    await waitFor(() => {
      expect(screen.getByText('Fix crash on startup')).toBeInTheDocument()
    })
    expect(screen.getByText('Add dark mode toggle')).toBeInTheDocument()
    expect(screen.getByText('Improve documentation')).toBeInTheDocument()

    // Both skeleton grids are gone once real content is in.
    expect(container.querySelectorAll('.animate-shimmer').length).toBe(0)
  })

  it('resolves the issues section instead of hanging when there are zero recommended projects', async () => {
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [] })

    renderWithProviders(<DiscoverPage />)

    await waitFor(() => {
      expect(screen.getByText('No recommended projects found')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByText('No recommended issues found')).toBeInTheDocument()
    })

    // Regression coverage: an empty projects list must not leave the issues section
    // waiting on a projects-first fetch that never actually gets triggered.
    expect(mockedGetPublicProjectIssues).not.toHaveBeenCalled()
  })

  it('clears both loading skeletons instead of hanging forever when the projects fetch rejects', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockedGetRecommendedProjects.mockRejectedValue(new Error('network down'))

    const { container } = renderWithProviders(<DiscoverPage />)

    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText('No recommended projects found')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByText('No recommended issues found')).toBeInTheDocument()
    })

    expect(screen.queryByText(/Finding projects best suited/i)).not.toBeInTheDocument()
    expect(container.querySelectorAll('.animate-shimmer').length).toBe(0)

    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  it('falls back to an initial-letter gradient avatar when the project image fails to load', async () => {
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [projectA] })
    mockedGetPublicProjectIssues.mockResolvedValue({ issues: [] })

    renderWithProviders(<DiscoverPage />)

    const avatarImg = await screen.findByAltText('widget-kit')
    expect(avatarImg).toBeInTheDocument()

    fireEvent.error(avatarImg)

    await waitFor(() => {
      expect(screen.queryByAltText('widget-kit')).not.toBeInTheDocument()
    })
    // Initial-letter fallback: first character of the repo name, uppercased, on a
    // getOnBrandGradient-colored chip (DiscoverProjectCard.tsx).
    expect(screen.getByText('W')).toBeInTheDocument()

    // Let the background issues fetch settle so no state update lands after the test.
    await waitFor(() => {
      expect(screen.getByText('No recommended issues found')).toBeInTheDocument()
    })
  })

  it('renders in both light and dark theme without crashing', async () => {
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [] })

    const { unmount } = renderWithProviders(<DiscoverPage />, { theme: 'light' })
    expect(screen.getByText(/Get matched to your next/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('No recommended projects found')).toBeInTheDocument()
    })
    unmount()

    renderWithProviders(<DiscoverPage />, { theme: 'dark' })
    expect(screen.getByText(/Get matched to your next/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('No recommended projects found')).toBeInTheDocument()
    })
  })

  it('fires onGoToBilling and onGoToOpenSourceWeek when their call-to-action buttons are clicked', async () => {
    mockedGetRecommendedProjects.mockResolvedValue({ projects: [] })
    const onGoToBilling = vi.fn()
    const onGoToOpenSourceWeek = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <DiscoverPage onGoToBilling={onGoToBilling} onGoToOpenSourceWeek={onGoToOpenSourceWeek} />,
    )

    await waitFor(() => {
      expect(screen.getByText('No recommended projects found')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Continue setup/i }))
    expect(onGoToBilling).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /Let's go/i }))
    expect(onGoToOpenSourceWeek).toHaveBeenCalledTimes(1)
  })
})
