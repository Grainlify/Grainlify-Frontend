// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PullRequestsTab } from './PullRequestsTab';
import { renderWithTheme } from '../../../../test/renderWithTheme';
import { getProjectPRs } from '../../../../shared/api/client';

vi.mock('../../../../shared/api/client', () => ({
  getProjectPRs: vi.fn(),
}));

const mockGetProjectPRs = vi.mocked(getProjectPRs);

const PROJECTS = [
  {
    id: 'repo-1',
    github_full_name: 'octo-org/frontend-app',
    status: 'active',
  },
];

const PRS = [
  {
    github_pr_id: 1,
    number: 10,
    state: 'open',
    title: 'Fix login bug',
    author_login: 'alice',
    url: 'https://github.com/octo-org/frontend-app/pull/10',
    merged: false,
    created_at: '2026-06-20T12:00:00Z',
    updated_at: '2026-06-21T12:00:00Z',
    closed_at: null,
    merged_at: null,
    last_seen_at: '2026-06-21T12:00:00Z',
  },
];

describe('PullRequestsTab empty states', () => {
  beforeEach(() => {
    mockGetProjectPRs.mockReset();
  });

  it('announces that repositories must be selected before pull requests can be shown', async () => {
    renderWithTheme(<PullRequestsTab selectedProjects={[]} />);

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Select one or more repositories to view pull requests');
    expect(status).toHaveTextContent('Use the repository selector above to choose which repositories to include.');
    expect(mockGetProjectPRs).not.toHaveBeenCalled();
  });

  it('announces that selected repositories currently have no pull requests', async () => {
    mockGetProjectPRs.mockResolvedValue({ prs: [] });

    renderWithTheme(<PullRequestsTab selectedProjects={PROJECTS} />);

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('No pull requests were found in the selected repositories');
    expect(status).toHaveTextContent('Try a different repository selection or come back after new pull requests are opened.');
    expect(mockGetProjectPRs).toHaveBeenCalledWith('repo-1');
  });

  it('announces no matches when filters exclude every pull request and clears back to results', async () => {
    const user = userEvent.setup();
    mockGetProjectPRs.mockResolvedValue({ prs: PRS });

    renderWithTheme(<PullRequestsTab selectedProjects={PROJECTS} />);

    expect(await screen.findByText('Fix login bug')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search pull request by title or author name...'), 'does-not-match');

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('No pull requests match the current search or state filters');
    expect(within(status).getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();

    await user.click(within(status).getByRole('button', { name: 'Clear filters' }));

    expect(await screen.findByText('Fix login bug')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
