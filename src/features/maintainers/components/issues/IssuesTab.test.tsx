// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IssuesTab } from './IssuesTab';
import { renderWithTheme } from '../../../../test/renderWithTheme';
import { getMaintainerIssues } from '../../../../shared/api/client';

vi.mock('../../../../shared/contexts/AuthContext', () => ({
  useAuth: () => ({
    userRole: 'maintainer',
    user: { id: 'user-1', github: { login: 'maintainer-1' } },
  }),
}));

vi.mock('../../../../shared/api/client', () => ({
  getMaintainerIssues: vi.fn(),
  applyToIssue: vi.fn(),
  postBotComment: vi.fn(),
  withdrawApplication: vi.fn(),
  assignApplicant: vi.fn(),
  unassignApplicant: vi.fn(),
  rejectApplication: vi.fn(),
}));

const mockGetMaintainerIssues = vi.mocked(getMaintainerIssues);

const PROJECTS = [
  {
    id: 'proj-1',
    github_full_name: 'test-org/test-repo',
    status: 'verified',
  },
];

const ISSUES = [
  {
    github_issue_id: 101,
    number: 42,
    state: 'open',
    title: 'Fix styling bug',
    description: 'The layout is broken on mobile.',
    author_login: 'contributor-1',
    assignees: [],
    labels: ['bug', 'ui'],
    comments_count: 1,
    comments: [
      {
        id: 1001,
        body: '**@contributor-1 has applied to work on this issue as part of the Grainlify program**\n> I want to solve this.',
        user: { login: 'contributor-1' },
        created_at: '2026-06-20T12:00:00Z',
        updated_at: '2026-06-20T12:00:00Z',
      },
    ],
    url: 'https://github.com/test-org/test-repo/issues/42',
    updated_at: '2026-06-20T12:00:00Z',
    last_seen_at: '2026-06-20T12:00:00Z',
  },
];

describe('IssuesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skeleton cards when loading', async () => {
    // Resolve with delay so skeleton remains visible
    let resolvePromise: any;
    const promise = new Promise((res) => {
      resolvePromise = res;
    });
    mockGetMaintainerIssues.mockReturnValue(promise as any);

    const { container } = renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    // Skeletons should be present
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();

    // Clean up
    resolvePromise({ issues: [] });
  });

  it('renders empty issue state when no issues exist', async () => {
    mockGetMaintainerIssues.mockResolvedValue({ issues: [] });

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    await waitFor(() => {
      expect(screen.getByText('No issues found')).toBeInTheDocument();
    });
  });

  it('renders the list of issues and selecting an issue displays details', async () => {
    mockGetMaintainerIssues.mockResolvedValue({ issues: ISSUES });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    const issueCard = await screen.findByText('Fix styling bug');
    expect(issueCard).toBeInTheDocument();

    // Click the card to select
    await user.click(issueCard);

    // Detail panel should render (using level: 1 to distinguish h1 in details from h3 in card list)
    expect(screen.getByRole('heading', { name: 'Fix styling bug', level: 1 })).toBeInTheDocument();

    // Click on discussions tab to view the description
    const discussionsTab = screen.getByRole('button', { name: /discussions/i });
    await user.click(discussionsTab);

    expect(screen.getByText('The layout is broken on mobile.')).toBeInTheDocument();
  });

  it('displays error UI and retry works', async () => {
    mockGetMaintainerIssues.mockRejectedValueOnce(new Error('API failure'));
    mockGetMaintainerIssues.mockResolvedValueOnce({ issues: ISSUES });
    const user = userEvent.setup();

    renderWithTheme(<IssuesTab onNavigate={vi.fn()} selectedProjects={PROJECTS} />);

    // Error text should be displayed
    const errorText = await screen.findByText('Failed to load issues');
    expect(errorText).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Retry Connection' });
    expect(retryBtn).toBeInTheDocument();

    // Click retry
    await user.click(retryBtn);

    // Should succeed and load issue list
    expect(await screen.findByText('Fix styling bug')).toBeInTheDocument();
  });
});
