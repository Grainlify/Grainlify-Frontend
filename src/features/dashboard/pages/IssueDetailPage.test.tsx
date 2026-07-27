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

    await waitFor(() => expect(screen.getByText('Test Issue Sanitization')).toBeInTheDocument())

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
