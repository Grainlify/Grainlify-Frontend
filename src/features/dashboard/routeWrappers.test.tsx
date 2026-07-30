import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '../../shared/contexts/ThemeContext'
import {
  OpenSourceWeekDetailPageRoute,
  EcosystemDetailPageRoute,
  ProjectDetailPageRoute,
  IssueDetailPageRoute,
  BlogArticlePageRoute,
} from './routeWrappers'

// Mock the page components as they are not the focus of these tests
vi.mock('./pages/OpenSourceWeekDetailPage', () => ({
  OpenSourceWeekDetailPage: () => <div data-testid="osw-detail">OSW Detail Page</div>,
}))
vi.mock('./pages/EcosystemDetailPage', () => ({
  EcosystemDetailPage: () => <div data-testid="ecosystem-detail">Ecosystem Detail Page</div>,
}))
vi.mock('./pages/ProjectDetailPage', () => ({
  ProjectDetailPage: () => <div data-testid="project-detail">Project Detail Page</div>,
}))
vi.mock('./pages/IssueDetailPage', () => ({
  IssueDetailPage: () => <div data-testid="issue-detail">Issue Detail Page</div>,
}))
vi.mock('../blog/pages/BlogArticlePage', () => ({
  BlogArticlePage: () => <div data-testid="blog-article">Blog Article Page</div>,
}))

// Helper to render a component within a router at a specific path
function renderWithRouter(ui: React.ReactElement, path: string, route: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={ui} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  )
}

describe('routeWrappers security validation', () => {
  describe('OpenSourceWeekDetailPageRoute', () => {
    it('renders detail page for a valid eventId', () => {
      renderWithRouter(
        <OpenSourceWeekDetailPageRoute />,
        '/dashboard/osw/event-123',
        '/dashboard/osw/:eventId'
      )
      expect(screen.getByTestId('osw-detail')).toBeInTheDocument()
    })

    it('renders ResourceNotFound for an invalid eventId (path traversal)', () => {
      renderWithRouter(
        <OpenSourceWeekDetailPageRoute />,
        '/dashboard/osw/..%2F..%2Fetc%2Fpasswd',
        '/dashboard/osw/:eventId'
      )
      expect(screen.getByText(/event not found/i)).toBeInTheDocument()
    })

    it('renders ResourceNotFound for an overly long eventId', () => {
      const longId = 'a'.repeat(101)
      renderWithRouter(
        <OpenSourceWeekDetailPageRoute />,
        `/dashboard/osw/${longId}`,
        '/dashboard/osw/:eventId'
      )
      expect(screen.getByText(/event not found/i)).toBeInTheDocument()
    })
  })

  describe('EcosystemDetailPageRoute', () => {
    it('renders detail page for a valid ecosystemId', () => {
      renderWithRouter(
        <EcosystemDetailPageRoute />,
        '/dashboard/ecosystems/solana',
        '/dashboard/ecosystems/:ecosystemId'
      )
      expect(screen.getByTestId('ecosystem-detail')).toBeInTheDocument()
    })

    it('renders ResourceNotFound for an invalid ecosystemId (symbols)', () => {
      renderWithRouter(
        <EcosystemDetailPageRoute />,
        '/dashboard/ecosystems/solana!@#',
        '/dashboard/ecosystems/:ecosystemId'
      )
      expect(screen.getByText(/ecosystem not found/i)).toBeInTheDocument()
    })
  })

  describe('ProjectDetailPageRoute', () => {
    it('renders detail page for a valid projectId', () => {
      renderWithRouter(
        <ProjectDetailPageRoute />,
        '/dashboard/projects/uuid-123',
        '/dashboard/projects/:projectId'
      )
      expect(screen.getByTestId('project-detail')).toBeInTheDocument()
    })

    it('renders ResourceNotFound for an invalid projectId (dots)', () => {
      renderWithRouter(
        <ProjectDetailPageRoute />,
        '/dashboard/projects/project.id',
        '/dashboard/projects/:projectId'
      )
      expect(screen.getByText(/project not found/i)).toBeInTheDocument()
    })
  })

  describe('IssueDetailPageRoute', () => {
    it('renders detail page for valid projectId and issueId', () => {
      renderWithRouter(
        <IssueDetailPageRoute />,
        '/dashboard/projects/p1/issues/i1',
        '/dashboard/projects/:projectId/issues/:issueId'
      )
      expect(screen.getByTestId('issue-detail')).toBeInTheDocument()
    })

    it('renders ResourceNotFound if projectId is invalid', () => {
      renderWithRouter(
        <IssueDetailPageRoute />,
        '/dashboard/projects/p.1/issues/i1',
        '/dashboard/projects/:projectId/issues/:issueId'
      )
      expect(screen.getByText(/issue not found/i)).toBeInTheDocument()
    })

    it('renders ResourceNotFound if issueId is invalid', () => {
      renderWithRouter(
        <IssueDetailPageRoute />,
        '/dashboard/projects/p1/issues/i_1',
        '/dashboard/projects/:projectId/issues/:issueId'
      )
      expect(screen.getByText(/issue not found/i)).toBeInTheDocument()
    })
  })

  describe('BlogArticlePageRoute', () => {
    it('renders article page for a valid slug', () => {
      renderWithRouter(
        <BlogArticlePageRoute />,
        '/dashboard/blog/safe-slug-123',
        '/dashboard/blog/:slug'
      )
      expect(screen.getByTestId('blog-article')).toBeInTheDocument()
    })

    it('renders ResourceNotFound for a malformed slug (encoded)', () => {
      renderWithRouter(
        <BlogArticlePageRoute />,
        '/dashboard/blog/encoded%20slug',
        '/dashboard/blog/:slug'
      )
      expect(screen.getByText(/article not found/i)).toBeInTheDocument()
    })
  })
})
