import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../../shared/contexts/ThemeContext';
import { MaintainersPage } from './MaintainersPage';

// Mock API client methods
const getMyProjects = vi.fn();
const getPendingSetupProjects = vi.fn();

vi.mock('../../../shared/api/client', () => ({
  getMyProjects: (...args: unknown[]) => getMyProjects(...args),
  getPendingSetupProjects: (...args: unknown[]) => getPendingSetupProjects(...args),
}));

// Mock child components to isolate MaintainersPage state logic
vi.mock('../components/dashboard/DashboardTab', () => ({
  DashboardTab: ({ selectedProjects, onRefresh }: any) => (
    <div data-testid="dashboard-tab">
      <span data-testid="selected-ids">
        {selectedProjects.map((p: any) => p.id).join(',')}
      </span>
      <button data-testid="trigger-refresh" onClick={onRefresh}>
        Refresh All
      </button>
    </div>
  ),
}));

vi.mock('../components/issues/IssuesTab', () => ({
  IssuesTab: () => <div data-testid="issues-tab" />,
}));

vi.mock('../components/pull-requests/PullRequestsTab', () => ({
  PullRequestsTab: () => <div data-testid="prs-tab" />,
}));

vi.mock('../components/InstallGitHubAppModal', () => ({
  InstallGitHubAppModal: () => null,
}));

vi.mock('../components/NewProjectSetupModal', () => ({
  NewProjectSetupModal: () => null,
}));

const mockProjects = [
  {
    id: 'repo-1',
    github_full_name: 'acme/repo-1',
    status: 'verified',
    ecosystem_name: 'Ethereum',
    language: 'TypeScript',
    tags: ['web3'],
    category: 'DeFi',
  },
  {
    id: 'repo-2',
    github_full_name: 'acme/repo-2',
    status: 'verified',
    ecosystem_name: 'Ethereum',
    language: 'Solidity',
    tags: ['contracts'],
    category: 'DeFi',
  },
];

const renderPage = (onNavigate = vi.fn()) =>
  render(
    <ThemeProvider>
      <MaintainersPage onNavigate={onNavigate} />
    </ThemeProvider>
  );

describe('MaintainersPage repository selection persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPendingSetupProjects.mockResolvedValue([]);
  });

  it('auto-selects all repos on initial load', async () => {
    getMyProjects.mockResolvedValueOnce(mockProjects);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('selected-ids')).toHaveTextContent('repo-1,repo-2');
    });
  });

  it('preserves manual repo deselection across projects refresh', async () => {
    getMyProjects.mockResolvedValue(mockProjects);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('selected-ids')).toHaveTextContent('repo-1,repo-2');
    });

    // Open repo selector dropdown
    const selectRepoBtn = screen.getByRole('button', { name: /select repositories/i });
    await userEvent.click(selectRepoBtn);

    // Expand org 'acme'
    const orgBtn = screen.getByRole('button', { name: /acme/i });
    await userEvent.click(orgBtn);

    // Get checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();

    // Deselect repo-2 (second checkbox)
    await userEvent.click(checkboxes[1]);
    expect(checkboxes[1]).not.toBeChecked();

    // Selected projects in DashboardTab should now only contain repo-1
    expect(screen.getByTestId('selected-ids')).toHaveTextContent('repo-1');

    // Trigger refresh (simulating refreshAll / projects array update)
    const refreshBtn = screen.getByTestId('trigger-refresh');
    await userEvent.click(refreshBtn);

    // Wait for refresh to resolve and verify repo-2 is STILL deselected
    await waitFor(() => {
      expect(screen.getByTestId('selected-ids')).toHaveTextContent('repo-1');
    });

    // Checkbox for repo-2 should remain unchecked
    expect(checkboxes[1]).not.toBeChecked();
  });

  it('prunes removed repos from selectedRepoIds without crashing', async () => {
    getMyProjects.mockResolvedValueOnce(mockProjects);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('selected-ids')).toHaveTextContent('repo-1,repo-2');
    });

    // On refresh, backend only returns repo-1 (repo-2 was removed)
    getMyProjects.mockResolvedValueOnce([mockProjects[0]]);

    const refreshBtn = screen.getByTestId('trigger-refresh');
    await userEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByTestId('selected-ids')).toHaveTextContent('repo-1');
    });
  });

  it('auto-selects newly added repos while preserving existing manual deselections', async () => {
    getMyProjects.mockResolvedValueOnce(mockProjects);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('selected-ids')).toHaveTextContent('repo-1,repo-2');
    });

    // Open repo selector dropdown and deselect repo-2
    await userEvent.click(screen.getByRole('button', { name: /select repositories/i }));
    await userEvent.click(screen.getByRole('button', { name: /acme/i }));
    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[1]); // deselect repo-2

    expect(screen.getByTestId('selected-ids')).toHaveTextContent('repo-1');

    // On refresh, a new repo-3 appears alongside repo-1 and repo-2
    const mockProjectsWithNew = [
      ...mockProjects,
      {
        id: 'repo-3',
        github_full_name: 'acme/repo-3',
        status: 'verified',
        ecosystem_name: 'Ethereum',
        language: 'Rust',
        tags: [],
        category: 'DeFi',
      },
    ];
    getMyProjects.mockResolvedValueOnce(mockProjectsWithNew);

    const refreshBtn = screen.getByTestId('trigger-refresh');
    await userEvent.click(refreshBtn);

    await waitFor(() => {
      // repo-1 selected, repo-2 preserved as deselected, repo-3 auto-selected
      expect(screen.getByTestId('selected-ids')).toHaveTextContent('repo-1,repo-3');
    });
  });
});
