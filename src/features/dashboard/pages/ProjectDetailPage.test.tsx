import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'
import { ProjectDetailPage } from './ProjectDetailPage'

const mockGetPublicProject = vi.fn()
const mockGetPublicProjectIssues = vi.fn()
const mockGetPublicProjectPRs = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getPublicProject: (...a: unknown[]) => mockGetPublicProject(...a),
  getPublicProjectIssues: (...a: unknown[]) => mockGetPublicProjectIssues(...a),
  getPublicProjectPRs: (...a: unknown[]) => mockGetPublicProjectPRs(...a),
}))

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="markdown">{children}</div>,
}))

const mockProjectData = {
  id: 'proj-123',
  github_full_name: 'testorg/test-repo',
  ecosystem_name: 'Ethereum',
  category: 'Infrastructure',
  language: 'TypeScript',
  languages: [{ name: 'TypeScript', percentage: 100 }],
  contributors_count: 3,
  readme: 'This is a test readme file.',
  repo: {
    owner_login: 'testorg',
    owner_avatar_url: 'https://github.com/testorg.png',
    html_url: 'https://github.com/testorg/test-repo',
    homepage: 'https://testrepo.dev',
    description: 'Awesome test repository',
  },
}

const mockIssuesData = {
  issues: [
    {
      github_issue_id: 101,
      number: 1,
      state: 'open',
      title: 'Fix issue in parser',
      description: 'Parser crashes on invalid input',
      author_login: 'contributor1',
      labels: [{ name: 'bug' }],
      url: 'https://github.com/testorg/test-repo/issues/1',
      updated_at: '2026-07-20T10:00:00Z',
      last_seen_at: '2026-07-20T10:00:00Z',
    },
  ],
}

const mockPRsData = {
  prs: [
    {
      github_pr_id: 201,
      number: 2,
      state: 'open',
      title: 'Add support for feature X',
      author_login: 'contributor2',
      url: 'https://github.com/testorg/test-repo/pull/2',
      merged: false,
      created_at: '2026-07-21T12:00:00Z',
      updated_at: '2026-07-21T12:00:00Z',
      closed_at: null,
      merged_at: null,
      last_seen_at: '2026-07-21T12:00:00Z',
    },
  ],
}

function renderComponent(props: React.ComponentProps<typeof ProjectDetailPage> = {}, route = '/dashboard/projects/proj-123') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/dashboard/projects/:projectId" element={<ProjectDetailPage {...props} />} />
          <Route path="/dashboard/projects" element={<ProjectDetailPage {...props} />} />
          <Route path="/dashboard/browse" element={<div>Browse Page</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  )
}

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    mockGetPublicProject.mockReset()
    mockGetPublicProjectIssues.mockReset()
    mockGetPublicProjectPRs.mockReset()

    mockGetPublicProject.mockImplementation((id) => {
      console.log('mockGetPublicProject called with:', id)
      return Promise.resolve(mockProjectData)
    })
    mockGetPublicProjectIssues.mockImplementation((id) => {
      console.log('mockGetPublicProjectIssues called with:', id)
      return Promise.resolve(mockIssuesData)
    })
    mockGetPublicProjectPRs.mockImplementation((id) => {
      console.log('mockGetPublicProjectPRs called with:', id)
      return Promise.resolve(mockPRsData)
    })
  })

  describe('Loading state', () => {
    it('renders loading state prior to fetch resolving', async () => {
      let resolveProject: (val: typeof mockProjectData) => void
      const pendingPromise = new Promise<typeof mockProjectData>((res) => {
        resolveProject = res
      })
      mockGetPublicProject.mockImplementationOnce(() => pendingPromise)

      renderComponent()

      // Skeleton loader should be rendered while loading
      expect(screen.getAllByTestId('skeleton-loader').length).toBeGreaterThan(0)

      // Resolve promise to clean up
      resolveProject!(mockProjectData)
      await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'test-repo' })).toBeInTheDocument())
    })
  })

  describe('Not-found state (404 / Non-existent project)', () => {
    it('renders ResourceNotFound when API returns a 404 status error', async () => {
      const err404 = new Error('Not Found')
      ;(err404 as any).response = { status: 404 }
      mockGetPublicProject.mockImplementationOnce(() => Promise.reject(err404))

      renderComponent({ projectId: 'non-existent-id' })

      await waitFor(() => {
        expect(screen.getByText('Project not found')).toBeInTheDocument()
      })
      expect(screen.getByText("We couldn't find what you're looking for. It may have been moved or removed.")).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Back to Browse/i })).toBeInTheDocument()
    })

    it('renders ResourceNotFound when no project ID is provided', async () => {
      renderComponent({ projectId: '' }, '/dashboard/projects')

      await waitFor(() => {
        expect(screen.getByText('Project not found')).toBeInTheDocument()
      })
      expect(screen.getByRole('link', { name: /Back to Browse/i })).toBeInTheDocument()
    })

    it('renders ResourceNotFound when getPublicProject resolves with null', async () => {
      mockGetPublicProject.mockImplementationOnce(() => Promise.resolve(null))

      renderComponent({ projectId: 'unknown-slug' })

      await waitFor(() => {
        expect(screen.getByText('Project not found')).toBeInTheDocument()
      })
    })

    it('uses custom backLabel for ResourceNotFound when provided', async () => {
      const err404 = new Error('Not Found')
      ;(err404 as any).response = { status: 404 }
      mockGetPublicProject.mockImplementationOnce(() => Promise.reject(err404))

      renderComponent({ projectId: 'missing-id', backLabel: 'Back to Leaderboard' })

      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Back to Leaderboard' })).toBeInTheDocument()
      })
    })
  })

  describe('Transient error state (Non-404 fetch error)', () => {
    it('renders a retry-capable error state when a 500 error occurs', async () => {
      const err500 = new Error('Internal Server Error')
      ;(err500 as any).response = { status: 500 }
      mockGetPublicProject.mockImplementationOnce(() => Promise.reject(err500))

      renderComponent({ projectId: 'proj-123' })

      await waitFor(() => {
        expect(screen.getByText('Failed to load project')).toBeInTheDocument()
      })

      expect(screen.getByText('Failed to load project data. Please try again.')).toBeInTheDocument()
      const retryButton = screen.getByRole('button', { name: /Retry/i })
      expect(retryButton).toBeInTheDocument()
      expect(screen.queryByText('Project not found')).not.toBeInTheDocument()
    })

    it('allows retrying fetch when Retry button is clicked and succeeds on retry', async () => {
      const err500 = new Error('Network error')
      mockGetPublicProject.mockImplementationOnce(() => Promise.reject(err500))

      renderComponent({ projectId: 'proj-123' })

      await waitFor(() => {
        expect(screen.getByText('Failed to load project')).toBeInTheDocument()
      })

      const retryButton = screen.getByRole('button', { name: /Retry/i })
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'test-repo' })).toBeInTheDocument()
      })
      expect(mockGetPublicProject).toHaveBeenCalledTimes(2)
    })
  })

  describe('Valid project rendering', () => {
    it('renders project detail elements when data is fetched successfully', async () => {
      renderComponent({ projectId: 'proj-123' })

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'test-repo' })).toBeInTheDocument()
      })

      expect(screen.getByText('Awesome test repository')).toBeInTheDocument()
      expect(screen.getByText('Infrastructure')).toBeInTheDocument()
      expect(screen.getByText('Ethereum')).toBeInTheDocument()
      expect(screen.getByText('testorg')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3, name: 'Fix issue in parser' })).toBeInTheDocument()
      expect(screen.getByText('Add support for feature X')).toBeInTheDocument()
    })

    it('triggers onBack callback when back button is clicked', async () => {
      const onBack = vi.fn()
      renderComponent({ projectId: 'proj-123', onBack, backLabel: 'Back to List' })

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'test-repo' })).toBeInTheDocument()
      })

      const backButton = screen.getByRole('button', { name: /Back to List/i })
      fireEvent.click(backButton)

      expect(onBack).toHaveBeenCalledTimes(1)
    })

    it('triggers onIssueClick when an issue is clicked', async () => {
      const onIssueClick = vi.fn()
      renderComponent({ projectId: 'proj-123', onIssueClick })

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 3, name: 'Fix issue in parser' })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('heading', { level: 3, name: 'Fix issue in parser' }))
      expect(onIssueClick).toHaveBeenCalledWith('101', 'proj-123')
    })

    it('copies page link when copy button is clicked', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      })

      renderComponent({ projectId: 'proj-123' })

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'test-repo' })).toBeInTheDocument()
      })

      const buttons = screen.getAllByRole('button')
      const copyButton = buttons.find((btn) => btn.querySelector('svg.lucide-copy') !== null) || buttons[1]
      fireEvent.click(copyButton)

      expect(writeTextMock).toHaveBeenCalled()
    })
  })
})
