import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '../../../shared/contexts/ThemeContext'
import { IssueDetailPage } from './IssueDetailPage'

const mockGetMyProjects = vi.fn()
const mockGetPublicProject = vi.fn()
const mockGetMaintainerIssues = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getMyProjects: (...a: unknown[]) => mockGetMyProjects(...a),
  getPublicProject: (...a: unknown[]) => mockGetPublicProject(...a),
  getMaintainerIssues: (...a: unknown[]) => mockGetMaintainerIssues(...a),
  applyToIssue: vi.fn(),
  postBotComment: vi.fn(),
  withdrawApplication: vi.fn(),
  assignApplicant: vi.fn(),
  unassignApplicant: vi.fn(),
  rejectApplication: vi.fn(),
}))

vi.mock('../../../shared/contexts/AuthContext', () => ({
  useAuth: () => ({
    userRole: 'contributor',
    user: { github: { login: 'test-user', avatar_url: 'https://example.com/avatar.png' } },
  }),
}))

vi.mock('react-intl', () => ({
  IntlProvider: ({ children }: { children: React.ReactNode }) => children,
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id, formatDate: (d: Date) => d.toISOString() }),
  FormattedMessage: ({ id }: { id: string }) => id,
  defineMessages: (msgs: Record<string, unknown>) => msgs,
}))

describe('IssueDetailPage — XSS sanitization & GFM rendering', () => {
  beforeEach(() => {
    mockGetMyProjects.mockReset().mockResolvedValue([])
    mockGetPublicProject.mockReset().mockResolvedValue({
      id: 'proj-1',
      github_full_name: 'org/repo',
      status: 'verified',
    })
    mockGetMaintainerIssues.mockReset()
  })

  const renderPage = (issueId: string, projectId: string) => {
    return render(
      <ThemeProvider>
        <IssueDetailPage issueId={issueId} projectId={projectId} onClose={vi.fn()} />
      </ThemeProvider>
    )
  }

  const loadIssueWithBody = async (body: string) => {
    mockGetMaintainerIssues.mockResolvedValue({
      issues: [
        {
          github_issue_id: 12345,
          number: 42,
          state: 'open',
          title: 'Test Issue Sanitization',
          description: body,
          author_login: 'attacker',
          assignees: [],
          labels: [],
          comments_count: 0,
          comments: [],
          url: 'https://github.com/org/repo/issues/42',
          updated_at: '2026-07-22T18:00:00Z',
          last_seen_at: '2026-07-22T18:00:00Z',
        },
      ],
    })

    renderPage('12345', 'proj-1')

    await waitFor(() => {
      const titles = screen.getAllByText('Test Issue Sanitization')
      expect(titles.length).toBeGreaterThanOrEqual(1)
    })

    const discussionsTab = await screen.findByRole('button', { name: /discussions/i })
    await userEvent.click(discussionsTab)
  }

  it('neutralizes malicious script tags in the issue body', async () => {
    const maliciousPayload = 'Safe text before <script>alert("XSS")</script> Safe text after'
    await loadIssueWithBody(maliciousPayload)

    expect(screen.getByText(/Safe text before/)).toBeInTheDocument()
    expect(screen.getByText(/Safe text after/)).toBeInTheDocument()
    expect(screen.queryByText('alert("XSS")')).not.toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
  })

  it('neutralizes malicious event-handler attributes in images', async () => {
    const maliciousPayload = 'Safe image <img src="x" onerror="alert(1)">'
    await loadIssueWithBody(maliciousPayload)

    const img = document.querySelector('img[src="x"]')
    expect(img).toBeInTheDocument()
    expect(img?.getAttribute('onerror')).toBeNull()
  })

  it('neutralizes javascript: URLs in markdown links', async () => {
    const maliciousPayload = '[Click here](javascript:alert("XSS"))'
    await loadIssueWithBody(maliciousPayload)

    const link = screen.queryByRole('link', { name: /Click here/i })
    if (link) {
      expect(link.getAttribute('href')).not.toBe('javascript:alert("XSS")')
    }
  })

  it('renders legitimate markdown elements and checks GFM constructs', async () => {
    const gfmPayload = `
- [x] Task 1 completed
- [ ] Task 2 pending

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |

Hey @someone check this out
`
    await loadIssueWithBody(gfmPayload)

    expect(screen.getByText(/Task 1 completed/i)).toBeInTheDocument()
    expect(screen.getByText(/Task 2 pending/i)).toBeInTheDocument()
    expect(screen.getByText(/@someone/i)).toBeInTheDocument()
  })
})

describe('IssueDetailPage — onNavigate profile navigation', () => {
  beforeEach(() => {
    mockGetMyProjects.mockReset().mockResolvedValue([])
    mockGetPublicProject.mockReset().mockResolvedValue({
      id: 'proj-1',
      github_full_name: 'org/repo',
      status: 'verified',
    })
    mockGetMaintainerIssues.mockReset()
  })

  it('calls onNavigate with "profile" when the applicant profile button is clicked', async () => {
    const onNavigate = vi.fn()

    // Mock an issue with an application comment
    mockGetMaintainerIssues.mockResolvedValue({
      issues: [
        {
          github_issue_id: 12345,
          number: 42,
          state: 'open',
          title: 'Test Issue',
          description: 'Issue body',
          author_login: 'author-user',
          assignees: [],
          labels: [],
          comments_count: 1,
          comments: [
            {
              id: 1,
              body: '**@applicant-user has applied to work on this issue as part of the Grainlify program**',
              user: { login: 'applicant-user' },
              created_at: '2026-07-22T18:00:00Z',
              updated_at: '2026-07-22T18:00:00Z',
            },
          ],
          url: 'https://github.com/org/repo/issues/42',
          updated_at: '2026-07-22T18:00:00Z',
          last_seen_at: '2026-07-22T18:00:00Z',
        },
      ],
    })

    render(
      <ThemeProvider>
        <IssueDetailPage issueId="12345" projectId="proj-1" onClose={vi.fn()} onNavigate={onNavigate} />
      </ThemeProvider>
    )

    // Wait for the issue to load
    await waitFor(() => {
      const titles = screen.getAllByText('Test Issue')
      expect(titles.length).toBeGreaterThanOrEqual(1)
    })

    // Click on the issue card (the one inside a button element)
    const issueCards = screen.getAllByText('Test Issue')
    const cardButton = issueCards.find(el => el.closest('button'))
    if (cardButton) {
      await userEvent.click(cardButton.closest('button')!)
    }

    // Wait for the applications tab to render with the applicant profile
    await waitFor(() => {
      expect(screen.getByText('applicant-user')).toBeInTheDocument()
    })

    // Click the applicant profile button
    const applicantProfileButton = screen.getByText('applicant-user').closest('button') || screen.getByText('applicant-user')
    await userEvent.click(applicantProfileButton)

    // Assert onNavigate was called with 'profile'
    expect(onNavigate).toHaveBeenCalledWith('profile')
  })
})
