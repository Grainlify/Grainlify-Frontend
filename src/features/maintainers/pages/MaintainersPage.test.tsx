import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MaintainersPage } from './MaintainersPage';
import { getMyProjects, getPendingSetupProjects } from '../../../shared/api/client';
import { I18nProvider, resolveMessages } from '../../../shared/i18n';

vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('../../../shared/api/client', () => ({
  getMyProjects: vi.fn(),
  getPendingSetupProjects: vi.fn(),
}));

vi.mock('../components/dashboard/DashboardTab', () => ({
  DashboardTab: () => <div>Dashboard panel</div>,
}));

vi.mock('../components/issues/IssuesTab', () => ({
  IssuesTab: () => <div>Issues panel</div>,
}));

vi.mock('../components/pull-requests/PullRequestsTab', () => ({
  PullRequestsTab: () => <div>Pull requests panel</div>,
}));

vi.mock('../components/InstallGitHubAppModal', () => ({
  InstallGitHubAppModal: () => null,
}));

vi.mock('../components/NewProjectSetupModal', () => ({
  NewProjectSetupModal: () => null,
}));

const mockGetMyProjects = vi.mocked(getMyProjects);
const mockGetPendingSetupProjects = vi.mocked(getPendingSetupProjects);

function renderPage(messages = resolveMessages('en')) {
  return render(
    <I18nProvider messages={messages}>
      <MaintainersPage onNavigate={vi.fn()} />
    </I18nProvider>
  );
}

async function openRepositorySelector() {
  fireEvent.click(screen.getByRole('button', { name: /select repositories/i }));
}

describe('MaintainersPage i18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMyProjects.mockResolvedValue([]);
    mockGetPendingSetupProjects.mockResolvedValue([]);
  });

  it('renders tab labels from the message catalog', () => {
    renderPage({
      ...resolveMessages('en'),
      'maintainers.tabs.dashboard': 'Maintainer Home',
      'maintainers.tabs.issues': 'Maintainer Issues',
      'maintainers.tabs.pullRequests': 'Maintainer Pulls',
    });

    expect(screen.getByRole('button', { name: 'Maintainer Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Maintainer Issues' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Maintainer Pulls' })).toBeInTheDocument();
  });

  it.each([
    [
      'auth failures',
      new Error('Authentication failed: token expired'),
      'Please sign in to view your repositories',
    ],
    [
      'network failures',
      new Error('Network error while fetching repositories'),
      'Unable to connect to the server. Please check your connection and try again.',
    ],
    ['non-Error fallbacks', 'bad response', 'Failed to load repositories'],
  ])('renders catalog-backed repository error text for %s', async (_name, rejection, expected) => {
    mockGetMyProjects.mockRejectedValueOnce(rejection);

    renderPage();
    await openRepositorySelector();

    await waitFor(() => {
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });
});
