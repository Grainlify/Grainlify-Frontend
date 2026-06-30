/**
 * @file MaintainersPage.test.tsx
 *
 * Tests covering the i18n extraction introduced in issue #263:
 *  - Tabs: Dashboard, Issues, Pull Requests resolved from the message catalog
 *  - Error strings: unauthenticated, networkError, loadFailure
 *
 * Edge cases covered:
 *  - Unauthenticated (401 / "Authentication failed") → maintainers.errors.unauthenticated
 *  - Network failure ("Network error") → maintainers.errors.networkError
 *  - Generic load failure (non-Error throw) → maintainers.errors.loadFailure
 *  - Unknown Error type passes message through
 *  - All three tabs render their catalog labels in DOM order
 *  - Tab order/routing preserved (switching tabs renders correct panel)
 *  - Loading skeleton state, successful load (no error messages)
 *  - Catalog keys exist in `en` and resolve to the expected English strings
 *  - resolveMessages includes all maintainers keys
 *  - Dropdown open/close
 *  - Org expansion / collapse with repos
 *  - Repo checkbox toggle (select / deselect)
 *  - refreshAll dispatches custom event
 *  - handleNavigateToIssue → switches to Issues tab
 *  - handleNavigateToPR → switches to Pull Requests tab
 *  - handleNewProjectSetupSuccess / Close (with and without editingProject)
 *  - openEditModal → sets editingProject state
 *  - openSetupForProject found / not found / throws
 *  - loadPendingSetup resolves array / non-array / throws
 *  - projects useEffect selects all ids when projects are non-empty
 *  - github_app_installed redirect → modal open
 *  - Add repository button → opens install modal
 *  - getRepoAvatar fallback (failedAvatars)
 *  - pending / rejected repo status badges
 *  - needs_metadata "Complete setup" button visible; !needs_metadata "Edit" button visible
 */

import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

import { I18nProvider, resolveMessages } from '../../../shared/i18n';
import { en } from '../../../shared/i18n/messages';
import { MaintainersPage } from './MaintainersPage';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mutable theme — tests can call mockUseTheme('light') to flip branches
let _currentTheme = 'dark';
vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: _currentTheme }),
}));
function mockUseTheme(t: 'dark' | 'light') { _currentTheme = t; }
function resetTheme() { _currentTheme = 'dark'; }

vi.mock('../../../shared/api/client', () => ({
  getMyProjects: vi.fn(),
  getPendingSetupProjects: vi.fn(),
}));

vi.mock('../../../shared/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('../components/dashboard/DashboardTab', () => ({
  DashboardTab: ({
    onNavigateToIssue,
    onNavigateToPR,
    onRefresh,
  }: {
    onNavigateToIssue?: (id: string, projectId: string) => void;
    onNavigateToPR?: (id: string) => void;
    onRefresh?: () => void;
  }) => (
    <div data-testid="dashboard-tab-content">
      <button onClick={() => onNavigateToIssue?.('issue-1', 'proj-1')}>
        Go To Issue
      </button>
      <button onClick={() => onNavigateToPR?.('pr-1')}>Go To PR</button>
      <button onClick={() => onRefresh?.()}>Refresh</button>
    </div>
  ),
}));

vi.mock('../components/issues/IssuesTab', () => ({
  IssuesTab: () => <div data-testid="issues-tab-content">IssuesTabContent</div>,
}));

vi.mock('../components/pull-requests/PullRequestsTab', () => ({
  PullRequestsTab: () => (
    <div data-testid="pull-requests-tab-content">PullRequestsTabContent</div>
  ),
}));

vi.mock('../components/InstallGitHubAppModal', () => ({
  InstallGitHubAppModal: ({
    isOpen,
    onClose,
    onSuccess,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }) =>
    isOpen ? (
      <div data-testid="install-modal">
        <button onClick={onClose}>CloseInstall</button>
        <button onClick={onSuccess}>SuccessInstall</button>
      </div>
    ) : null,
}));

vi.mock('../components/NewProjectSetupModal', () => ({
  NewProjectSetupModal: ({
    isOpen,
    onClose,
    onSuccess,
    title,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title?: string;
  }) =>
    isOpen ? (
      <div data-testid="setup-modal">
        {title && <span data-testid="setup-modal-title">{title}</span>}
        <button onClick={onSuccess}>SuccessSetup</button>
        <button onClick={onClose}>CloseSetup</button>
      </div>
    ) : null,
}));

vi.mock('../../../shared/components/SkeletonLoader', () => ({
  SkeletonLoader: () => <div data-testid="skeleton" />,
}));

// ── Global test isolation ─────────────────────────────────────────────────────
// Reset window.location before every test so no test can pollute the next.
beforeEach(() => {
  // Use vi.stubGlobal so jsdom honours the override; restore in afterEach.
  vi.stubGlobal('location', {
    ...window.location,
    search: '',
    pathname: '/',
    href: 'http://localhost/',
    assign: vi.fn(),
    replace: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  resetTheme();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

import { getMyProjects, getPendingSetupProjects } from '../../../shared/api/client';

const mockGetMyProjects = getMyProjects as ReturnType<typeof vi.fn>;
const mockGetPendingSetupProjects = getPendingSetupProjects as ReturnType<typeof vi.fn>;

const PROJECT_VERIFIED = {
  id: 'proj-1',
  github_full_name: 'myorg/my-repo',
  status: 'verified',
  ecosystem_name: 'Ethereum',
  language: 'TypeScript',
  tags: [],
  category: null,
  description: 'A repo',
  needs_metadata: false,
};

const PROJECT_PENDING_VERIFICATION = {
  ...PROJECT_VERIFIED,
  id: 'proj-2',
  github_full_name: 'myorg/pending-repo',
  status: 'pending_verification',
  needs_metadata: false,
};

const PROJECT_NEEDS_METADATA = {
  ...PROJECT_VERIFIED,
  id: 'proj-3',
  github_full_name: 'myorg/meta-repo',
  status: 'verified',
  needs_metadata: true,
};

const PROJECT_REJECTED = {
  ...PROJECT_VERIFIED,
  id: 'proj-4',
  github_full_name: 'myorg/rejected-repo',
  status: 'rejected',
  needs_metadata: false,
};

const PENDING_SETUP = {
  id: 'proj-1',
  github_full_name: 'myorg/my-repo',
  description: 'A repo',
  ecosystem_id: 'eco-1',
  ecosystem_name: 'Ethereum',
  language: 'TypeScript',
  tags: [],
  category: null,
};

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

function renderPage() {
  return render(<MaintainersPage onNavigate={vi.fn()} />, { wrapper });
}

async function openDropdown() {
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /Select repositories/i })
    ).toBeInTheDocument()
  );
  fireEvent.click(screen.getByRole('button', { name: /Select repositories/i }));
}

async function expandOrg(orgName = 'myorg') {
  await waitFor(() => expect(screen.getByText(orgName)).toBeInTheDocument());
  fireEvent.click(screen.getByText(orgName));
}

// ── 1. Catalog key existence ──────────────────────────────────────────────────

describe('message catalog — maintainers namespace', () => {
  it('contains all three tab keys with correct English strings', () => {
    expect(en['maintainers.tabs.dashboard']).toBe('Dashboard');
    expect(en['maintainers.tabs.issues']).toBe('Issues');
    expect(en['maintainers.tabs.pullRequests']).toBe('Pull Requests');
  });

  it('contains all three error keys with correct English strings', () => {
    expect(en['maintainers.errors.unauthenticated']).toBe(
      'Please sign in to view your repositories'
    );
    expect(en['maintainers.errors.networkError']).toBe(
      'Unable to connect to the server. Please check your connection and try again.'
    );
    expect(en['maintainers.errors.loadFailure']).toBe('Failed to load repositories');
  });

  it('resolveMessages("en") includes all maintainers keys', () => {
    const msgs = resolveMessages('en');
    expect(msgs['maintainers.tabs.dashboard']).toBe('Dashboard');
    expect(msgs['maintainers.tabs.issues']).toBe('Issues');
    expect(msgs['maintainers.tabs.pullRequests']).toBe('Pull Requests');
    expect(msgs['maintainers.errors.unauthenticated']).toBe(
      'Please sign in to view your repositories'
    );
    expect(msgs['maintainers.errors.networkError']).toBe(
      'Unable to connect to the server. Please check your connection and try again.'
    );
    expect(msgs['maintainers.errors.loadFailure']).toBe('Failed to load repositories');
  });

  it('maintainers keys do not collide with other namespaces', () => {
    const maintainersKeys = Object.keys(en).filter((k) => k.startsWith('maintainers.'));
    const otherKeys = Object.keys(en).filter((k) => !k.startsWith('maintainers.'));
    maintainersKeys.forEach((key) => {
      expect(otherKeys).not.toContain(key);
    });
  });
});

// ── 2. Tab rendering & routing ────────────────────────────────────────────────

describe('MaintainersPage — tab labels from catalog', () => {
  beforeEach(() => {
    mockGetMyProjects.mockResolvedValue([]);
    mockGetPendingSetupProjects.mockResolvedValue([]);
  });

  it('renders all three tab labels from the catalog', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Issues' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Pull Requests' })).toBeInTheDocument();
    });
  });

  it('renders tabs in the correct order: Dashboard → Issues → Pull Requests', async () => {
    renderPage();
    await waitFor(() => {
      const tabs = screen
        .getAllByRole('button')
        .filter((b) =>
          ['Dashboard', 'Issues', 'Pull Requests'].includes(b.textContent ?? '')
        );
      expect(tabs.map((b) => b.textContent)).toEqual([
        'Dashboard',
        'Issues',
        'Pull Requests',
      ]);
    });
  });

  it('defaults to Dashboard panel visible, others hidden', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('dashboard-tab-content')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('issues-tab-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pull-requests-tab-content')).not.toBeInTheDocument();
  });

  it('clicking Issues tab shows Issues panel and hides Dashboard', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Issues' })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Issues' }));
    expect(screen.getByTestId('issues-tab-content')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-tab-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pull-requests-tab-content')).not.toBeInTheDocument();
  });

  it('clicking Pull Requests tab shows Pull Requests panel', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Pull Requests' })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pull Requests' }));
    expect(screen.getByTestId('pull-requests-tab-content')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-tab-content')).not.toBeInTheDocument();
  });

  it('can cycle back to Dashboard from Issues', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Issues' })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Issues' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(screen.getByTestId('dashboard-tab-content')).toBeInTheDocument();
    expect(screen.queryByTestId('issues-tab-content')).not.toBeInTheDocument();
  });
});

// ── 3. Unauthenticated error ──────────────────────────────────────────────────

describe('MaintainersPage — unauthenticated error', () => {
  beforeEach(() => {
    mockGetPendingSetupProjects.mockResolvedValue([]);
  });

  it('shows catalog unauthenticated string for "Authentication failed"', async () => {
    mockGetMyProjects.mockRejectedValue(new Error('Authentication failed'));
    renderPage();
    await openDropdown();
    await waitFor(() => {
      expect(
        screen.getByText('Please sign in to view your repositories')
      ).toBeInTheDocument();
    });
  });

  it('shows unauthenticated string when error contains "401"', async () => {
    mockGetMyProjects.mockRejectedValue(new Error('HTTP 401 Unauthorized'));
    renderPage();
    await openDropdown();
    await waitFor(() => {
      expect(
        screen.getByText('Please sign in to view your repositories')
      ).toBeInTheDocument();
    });
  });

  it('does NOT show network or load-failure strings for auth errors', async () => {
    mockGetMyProjects.mockRejectedValue(new Error('Authentication failed'));
    renderPage();
    await openDropdown();
    await waitFor(() =>
      expect(
        screen.getByText('Please sign in to view your repositories')
      ).toBeInTheDocument()
    );
    expect(
      screen.queryByText(
        'Unable to connect to the server. Please check your connection and try again.'
      )
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Failed to load repositories')).not.toBeInTheDocument();
  });
});

// ── 4. Network error ──────────────────────────────────────────────────────────

describe('MaintainersPage — network error', () => {
  beforeEach(() => {
    mockGetPendingSetupProjects.mockResolvedValue([]);
  });

  it('shows catalog network error string for "Network error"', async () => {
    mockGetMyProjects.mockRejectedValue(new Error('Network error: failed to fetch'));
    renderPage();
    await openDropdown();
    await waitFor(() => {
      expect(
        screen.getByText(
          'Unable to connect to the server. Please check your connection and try again.'
        )
      ).toBeInTheDocument();
    });
  });

  it('does NOT show auth or load-failure strings for network errors', async () => {
    mockGetMyProjects.mockRejectedValue(new Error('Network error'));
    renderPage();
    await openDropdown();
    await waitFor(() =>
      expect(
        screen.getByText(
          'Unable to connect to the server. Please check your connection and try again.'
        )
      ).toBeInTheDocument()
    );
    expect(
      screen.queryByText('Please sign in to view your repositories')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Failed to load repositories')).not.toBeInTheDocument();
  });
});

// ── 5. Generic load failure ───────────────────────────────────────────────────

describe('MaintainersPage — generic load failure', () => {
  beforeEach(() => {
    mockGetPendingSetupProjects.mockResolvedValue([]);
  });

  it('uses catalog loadFailure string when non-Error is thrown', async () => {
    mockGetMyProjects.mockRejectedValue('unexpected string rejection');
    renderPage();
    await openDropdown();
    await waitFor(() => {
      expect(screen.getByText('Failed to load repositories')).toBeInTheDocument();
    });
  });

  it('uses catalog loadFailure string when null is thrown', async () => {
    mockGetMyProjects.mockRejectedValue(null);
    renderPage();
    await openDropdown();
    await waitFor(() => {
      expect(screen.getByText('Failed to load repositories')).toBeInTheDocument();
    });
  });

  it('passes through the raw message for unknown Error subtypes', async () => {
    mockGetMyProjects.mockRejectedValue(new Error('Totally unexpected failure'));
    renderPage();
    await openDropdown();
    await waitFor(() => {
      expect(screen.getByText('Totally unexpected failure')).toBeInTheDocument();
    });
  });
});

// ── 6. Loading state ──────────────────────────────────────────────────────────

describe('MaintainersPage — loading state', () => {
  it('renders skeleton loaders while projects are fetching', async () => {
    let resolve!: (v: unknown) => void;
    mockGetMyProjects.mockReturnValue(new Promise((r) => { resolve = r; }));
    mockGetPendingSetupProjects.mockResolvedValue([]);

    renderPage();
    await openDropdown();

    await waitFor(() =>
      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
    );

    expect(
      screen.queryByText('Please sign in to view your repositories')
    ).not.toBeInTheDocument();

    await act(async () => { resolve([]); });
  });
});

// ── 7. Successful load ────────────────────────────────────────────────────────

describe('MaintainersPage — successful load', () => {
  it('renders without catalog error strings on success', async () => {
    mockGetMyProjects.mockResolvedValue([]);
    mockGetPendingSetupProjects.mockResolvedValue([]);
    renderPage();
    await openDropdown();

    await waitFor(() =>
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    );

    expect(
      screen.queryByText('Please sign in to view your repositories')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Unable to connect to the server. Please check your connection and try again.'
      )
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Failed to load repositories')).not.toBeInTheDocument();
  });

  it('shows "No repositories found" empty-state when API returns empty array', async () => {
    mockGetMyProjects.mockResolvedValue([]);
    mockGetPendingSetupProjects.mockResolvedValue([]);
    renderPage();
    await openDropdown();
    await waitFor(() => {
      expect(screen.getByText('No repositories found')).toBeInTheDocument();
    });
  });
});

// ── 8. Dropdown toggle ────────────────────────────────────────────────────────

describe('MaintainersPage — dropdown open/close', () => {
  beforeEach(() => {
    mockGetMyProjects.mockResolvedValue([]);
    mockGetPendingSetupProjects.mockResolvedValue([]);
  });

  it('opens the repo dropdown on button click', async () => {
    renderPage();
    expect(screen.queryByText('Add a repository')).not.toBeInTheDocument();
    await openDropdown();
    await waitFor(() => {
      expect(screen.getByText('Add a repository')).toBeInTheDocument();
    });
  });

  it('closes the repo dropdown on second click', async () => {
    renderPage();
    await openDropdown();
    await waitFor(() =>
      expect(screen.getByText('Add a repository')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /Select repositories/i }));
    await waitFor(() =>
      expect(screen.queryByText('Add a repository')).not.toBeInTheDocument()
    );
  });
});

// ── 9. Org expansion & repo list ─────────────────────────────────────────────

describe('MaintainersPage — org expansion & repo list', () => {
  beforeEach(() => {
    mockGetMyProjects.mockResolvedValue([PROJECT_VERIFIED]);
    mockGetPendingSetupProjects.mockResolvedValue([]);
  });

  it('renders org name in dropdown when projects are loaded', async () => {
    renderPage();
    await openDropdown();
    await waitFor(() => expect(screen.getByText('myorg')).toBeInTheDocument());
  });

  it('expands org to show repo on click', async () => {
    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() => {
      expect(screen.getByText('my-repo')).toBeInTheDocument();
    });
  });

  it('collapses org on second click', async () => {
    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() => expect(screen.getByText('my-repo')).toBeInTheDocument());
    fireEvent.click(screen.getByText('myorg'));
    await waitFor(() =>
      expect(screen.queryByText('my-repo')).not.toBeInTheDocument()
    );
  });
});

// ── 10. Repo checkbox toggle ──────────────────────────────────────────────────

describe('MaintainersPage — repo checkbox toggle', () => {
  beforeEach(() => {
    mockGetMyProjects.mockResolvedValue([PROJECT_VERIFIED]);
    mockGetPendingSetupProjects.mockResolvedValue([]);
  });

  it('renders checkbox and can toggle repo selection', async () => {
    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() => expect(screen.getByText('my-repo')).toBeInTheDocument());

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    // Initially checked (all IDs selected by the projects useEffect)
    expect(checkbox.checked).toBe(true);

    // Uncheck
    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox.checked).toBe(false));

    // Re-check
    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox.checked).toBe(true));
  });
});

// ── 11. projects useEffect selects all ids ────────────────────────────────────

describe('MaintainersPage — projects useEffect', () => {
  it('auto-selects all project ids when projects load', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_VERIFIED]);
    mockGetPendingSetupProjects.mockResolvedValue([]);
    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() => expect(screen.getByText('my-repo')).toBeInTheDocument());

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});

// ── 12. handleNavigateToIssue / handleNavigateToPR ───────────────────────────

describe('MaintainersPage — navigation from DashboardTab', () => {
  beforeEach(() => {
    mockGetMyProjects.mockResolvedValue([]);
    mockGetPendingSetupProjects.mockResolvedValue([]);
  });

  it('handleNavigateToIssue switches active tab to Issues', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('dashboard-tab-content')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go To Issue' }));
    expect(screen.getByTestId('issues-tab-content')).toBeInTheDocument();
  });

  it('handleNavigateToPR switches active tab to Pull Requests', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('dashboard-tab-content')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go To PR' }));
    expect(screen.getByTestId('pull-requests-tab-content')).toBeInTheDocument();
  });
});

// ── 13. refreshAll ────────────────────────────────────────────────────────────

describe('MaintainersPage — refreshAll', () => {
  it('dispatches repositories-refreshed event and re-fetches projects', async () => {
    mockGetMyProjects.mockResolvedValue([]);
    mockGetPendingSetupProjects.mockResolvedValue([]);

    const eventSpy = vi.fn();
    window.addEventListener('repositories-refreshed', eventSpy);

    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('dashboard-tab-content')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(eventSpy).toHaveBeenCalled());

    window.removeEventListener('repositories-refreshed', eventSpy);
  });
});

// ── 14. Add repository button → InstallGitHubAppModal ────────────────────────

describe('MaintainersPage — Add a repository', () => {
  beforeEach(() => {
    mockGetMyProjects.mockResolvedValue([]);
    mockGetPendingSetupProjects.mockResolvedValue([]);
  });

  it('opens install modal when "Add a repository" is clicked', async () => {
    renderPage();
    await openDropdown();
    await waitFor(() =>
      expect(screen.getByText('Add a repository')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText('Add a repository'));
    await waitFor(() =>
      expect(screen.getByTestId('install-modal')).toBeInTheDocument()
    );
  });

  it('closes install modal on onClose callback', async () => {
    renderPage();
    await openDropdown();
    await waitFor(() =>
      expect(screen.getByText('Add a repository')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText('Add a repository'));
    await waitFor(() =>
      expect(screen.getByTestId('install-modal')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'CloseInstall' }));
    await waitFor(() =>
      expect(screen.queryByTestId('install-modal')).not.toBeInTheDocument()
    );
  });

  it('calls refreshAll (re-fetches projects) on onSuccess callback', async () => {
    // onSuccess for InstallGitHubAppModal is wired to refreshAll, which re-fetches
    // but does NOT close the modal (the real modal redirects the user to GitHub).
    renderPage();
    await openDropdown();
    await waitFor(() =>
      expect(screen.getByText('Add a repository')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText('Add a repository'));
    await waitFor(() =>
      expect(screen.getByTestId('install-modal')).toBeInTheDocument()
    );
    const callsBefore = mockGetMyProjects.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'SuccessInstall' }));
    // refreshAll triggers another loadProjects call
    await waitFor(() =>
      expect(mockGetMyProjects.mock.calls.length).toBeGreaterThan(callsBefore)
    );
    // Modal stays open (component doesn't close on success — user is redirected externally)
    expect(screen.getByTestId('install-modal')).toBeInTheDocument();
  });
});

// ── 15. Repo status badges ────────────────────────────────────────────────────

describe('MaintainersPage — repo status badges', () => {
  it('shows "Pending" badge for pending_verification repos', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_PENDING_VERIFICATION]);
    mockGetPendingSetupProjects.mockResolvedValue([]);

    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() =>
      expect(screen.getByText('pending-repo')).toBeInTheDocument()
    );
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows "Rejected" badge for rejected repos', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_REJECTED]);
    mockGetPendingSetupProjects.mockResolvedValue([]);

    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() =>
      expect(screen.getByText('rejected-repo')).toBeInTheDocument()
    );
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('shows "Complete setup" button for repos needing metadata', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_NEEDS_METADATA]);
    mockGetPendingSetupProjects.mockResolvedValue([]);

    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() =>
      expect(screen.getByText('meta-repo')).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Complete setup' })).toBeInTheDocument();
  });

  it('shows "Edit" button for repos that do NOT need metadata', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_VERIFIED]);
    mockGetPendingSetupProjects.mockResolvedValue([]);

    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() =>
      expect(screen.getByText('my-repo')).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });
});

// ── 16. openEditModal ─────────────────────────────────────────────────────────

describe('MaintainersPage — openEditModal', () => {
  it('uses null/empty fallbacks when repo optional fields are undefined', async () => {
    // Covers the `?? null` / `?? ''` / `?? []` branches in openEditModal
    const sparseProject = {
      id: 'proj-sparse',
      github_full_name: 'myorg/sparse-repo',
      status: 'verified',
      needs_metadata: false,
      // All optional fields intentionally undefined
      description: undefined,
      ecosystem_name: undefined,
      language: undefined,
      tags: undefined,
      category: undefined,
    };
    mockGetMyProjects.mockResolvedValue([sparseProject]);
    mockGetPendingSetupProjects.mockResolvedValue([]);

    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() =>
      expect(screen.getByText('sparse-repo')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    // Modal opens — meaning openEditModal ran without throwing
    await waitFor(() =>
      expect(screen.getByTestId('setup-modal')).toBeInTheDocument()
    );
  });

  it('opens setup modal with "Edit project" title when Edit is clicked', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_VERIFIED]);
    mockGetPendingSetupProjects.mockResolvedValue([PENDING_SETUP]);

    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() =>
      expect(screen.getByText('my-repo')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    await waitFor(() =>
      expect(screen.getByTestId('setup-modal')).toBeInTheDocument()
    );
    expect(screen.getByTestId('setup-modal-title')).toHaveTextContent('Edit project');
  });

  it('closes edit modal and clears editingProject on success', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_VERIFIED]);
    mockGetPendingSetupProjects.mockResolvedValue([PENDING_SETUP]);

    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() =>
      expect(screen.getByText('my-repo')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await waitFor(() =>
      expect(screen.getByTestId('setup-modal')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'SuccessSetup' }));
    await waitFor(() =>
      expect(screen.queryByTestId('setup-modal')).not.toBeInTheDocument()
    );
  });

  it('closes edit modal and clears editingProject on close', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_VERIFIED]);
    mockGetPendingSetupProjects.mockResolvedValue([PENDING_SETUP]);

    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() =>
      expect(screen.getByText('my-repo')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await waitFor(() =>
      expect(screen.getByTestId('setup-modal')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'CloseSetup' }));
    await waitFor(() =>
      expect(screen.queryByTestId('setup-modal')).not.toBeInTheDocument()
    );
  });
});

// ── 17. openSetupForProject ───────────────────────────────────────────────────

describe('MaintainersPage — openSetupForProject', () => {
  it('opens setup modal when "Complete setup" is clicked and project is found', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_NEEDS_METADATA]);
    // First call: initial load; second call: openSetupForProject
    mockGetPendingSetupProjects
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...PENDING_SETUP, id: PROJECT_NEEDS_METADATA.id }]);

    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Complete setup' })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Complete setup' }));

    await waitFor(() =>
      expect(screen.getByTestId('setup-modal')).toBeInTheDocument()
    );
  });

  it('does not open modal when project is not found in pending list', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_NEEDS_METADATA]);
    mockGetPendingSetupProjects
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]); // project not found

    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Complete setup' })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: 'Complete setup' }));

    // Modal should remain closed since project was not found
    await waitFor(() =>
      expect(screen.queryByTestId('setup-modal')).not.toBeInTheDocument()
    );
  });

  it('handles getPendingSetupProjects throwing in openSetupForProject gracefully', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_NEEDS_METADATA]);
    mockGetPendingSetupProjects
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('network'));

    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Complete setup' })).toBeInTheDocument()
    );

    // Should not throw
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Complete setup' }));
    });

    expect(screen.queryByTestId('setup-modal')).not.toBeInTheDocument();
  });
});

// ── 18. handleNewProjectSetupSuccess / Close (pending project path) ───────────

describe('MaintainersPage — setup modal success/close for pending projects', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Set location to simulate the github_app_installed redirect
    vi.stubGlobal('location', {
      ...window.location,
      search: '?github_app_installed=true',
      pathname: '/',
      href: 'http://localhost/?github_app_installed=true',
      assign: vi.fn(),
      replace: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('closes setup modal on success and removes pending project from queue', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_VERIFIED]);
    mockGetPendingSetupProjects.mockResolvedValue([PENDING_SETUP]);

    renderPage();

    // Advance past the 2500ms delay the component waits before loading
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() =>
      expect(screen.getByTestId('setup-modal')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: 'SuccessSetup' }));
    await waitFor(() =>
      expect(screen.queryByTestId('setup-modal')).not.toBeInTheDocument()
    );
  });

  it('closes setup modal on close and removes pending project from queue', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_VERIFIED]);
    mockGetPendingSetupProjects.mockResolvedValue([PENDING_SETUP]);

    renderPage();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() =>
      expect(screen.getByTestId('setup-modal')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: 'CloseSetup' }));
    await waitFor(() =>
      expect(screen.queryByTestId('setup-modal')).not.toBeInTheDocument()
    );
  });
});

// ── 19. loadPendingSetup edge cases ──────────────────────────────────────────

describe('MaintainersPage — loadPendingSetup edge cases', () => {
  it('handles non-array response from getMyProjects gracefully (covers projectsArray else branch)', async () => {
    // Covers the `Array.isArray(data) ? data : []` false branch in loadProjects
    mockGetMyProjects.mockResolvedValue(null as any);
    mockGetPendingSetupProjects.mockResolvedValue([]);

    renderPage();
    // Should render empty state without crashing
    fireEvent.click(screen.getByRole('button', { name: /Select repositories/i }));
    await waitFor(() =>
      expect(screen.getByText('No repositories found')).toBeInTheDocument()
    );
  });

  it('handles non-array response from getPendingSetupProjects gracefully', async () => {
    mockGetMyProjects.mockResolvedValue([]);
    mockGetPendingSetupProjects.mockResolvedValue(null as any);

    // Should not throw
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Select repositories/i })).toBeInTheDocument()
    );
  });

  it('handles getPendingSetupProjects throwing gracefully', async () => {
    mockGetMyProjects.mockResolvedValue([]);
    mockGetPendingSetupProjects.mockRejectedValue(new Error('network'));

    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Select repositories/i })).toBeInTheDocument()
    );
    // No crash
  });
});

// ── 20. github_app_installed redirect ────────────────────────────────────────

describe('MaintainersPage — github_app_installed redirect', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal('location', {
      ...window.location,
      search: '?github_app_installed=true',
      pathname: '/',
      href: 'http://localhost/?github_app_installed=true',
      assign: vi.fn(),
      replace: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens setup modal when URL has github_app_installed=true and pending project exists', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_VERIFIED]);
    mockGetPendingSetupProjects.mockResolvedValue([PENDING_SETUP]);

    renderPage();

    // The component waits 2500ms before loading when coming from the redirect
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() =>
      expect(screen.getByTestId('setup-modal')).toBeInTheDocument()
    );
  });
});

// ── 21. getRepoAvatar fallback (failedAvatars) ───────────────────────────────

describe('MaintainersPage — getRepoAvatar fallback', () => {
  it('shows Package icon fallback when avatar image fails to load', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_VERIFIED]);
    mockGetPendingSetupProjects.mockResolvedValue([]);

    renderPage();
    await openDropdown();
    await expandOrg();
    await waitFor(() => expect(screen.getByText('my-repo')).toBeInTheDocument());

    const img = screen.getByAltText('my-repo') as HTMLImageElement;
    fireEvent.error(img);

    await waitFor(() =>
      expect(screen.queryByAltText('my-repo')).not.toBeInTheDocument()
    );
  });
});

// ── 22. groupedRepositories — multiple orgs, sorted ──────────────────────────

describe('MaintainersPage — groupedRepositories', () => {
  it('groups repos by org and sorts alphabetically', async () => {
    mockGetMyProjects.mockResolvedValue([
      { ...PROJECT_VERIFIED, id: 'z1', github_full_name: 'zorg/repo-z' },
      { ...PROJECT_VERIFIED, id: 'a1', github_full_name: 'aorg/repo-a' },
    ]);
    mockGetPendingSetupProjects.mockResolvedValue([]);

    renderPage();
    await openDropdown();

    await waitFor(() => {
      expect(screen.getByText('aorg')).toBeInTheDocument();
      expect(screen.getByText('zorg')).toBeInTheDocument();
    });

    const orgButtons = screen
      .getAllByRole('button')
      .filter((b) => b.textContent === 'aorg' || b.textContent === 'zorg');
    expect(orgButtons[0].textContent).toBe('aorg');
    expect(orgButtons[1].textContent).toBe('zorg');
  });

  it('skips projects with malformed github_full_name (no slash)', async () => {
    mockGetMyProjects.mockResolvedValue([
      { ...PROJECT_VERIFIED, github_full_name: 'noslash' },
    ]);
    mockGetPendingSetupProjects.mockResolvedValue([]);

    renderPage();
    await openDropdown();

    await waitFor(() =>
      expect(screen.getByText('No repositories found')).toBeInTheDocument()
    );
  });
});

// ── 23. Light-theme branches (covers theme === 'dark' false-branch CSS ternaries) ──

describe('MaintainersPage — light theme CSS branches', () => {
  beforeEach(() => {
    mockUseTheme('light');
  });

  it('renders tab labels and dropdown in light theme (covers light-branch ternaries)', async () => {
    mockGetMyProjects.mockResolvedValue([PROJECT_VERIFIED]);
    mockGetPendingSetupProjects.mockResolvedValue([]);

    renderPage();

    // Tab labels still render
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Issues')).toBeInTheDocument();
      expect(screen.getByText('Pull Requests')).toBeInTheDocument();
    });

    // Open dropdown — triggers light-theme branch for the wrapper, header, footer CSS
    fireEvent.click(screen.getByRole('button', { name: /Select repositories/i }));

    // Wait for org to appear (covers org row light-theme CSS branch)
    await waitFor(() => expect(screen.getByText('myorg')).toBeInTheDocument());

    // Expand org (covers sub-repo row light-theme CSS branches)
    fireEvent.click(screen.getByText('myorg'));
    await waitFor(() => expect(screen.getByText('my-repo')).toBeInTheDocument());

    // Click a tab while light (covers tab button active/inactive light-theme branches)
    fireEvent.click(screen.getByRole('button', { name: 'Issues' }));
    await waitFor(() =>
      expect(screen.getByTestId('issues-tab-content')).toBeInTheDocument()
    );
  });

  it('renders rejected/pending status badges in light theme', async () => {
    mockGetMyProjects.mockResolvedValue([
      PROJECT_REJECTED,
      PROJECT_PENDING_VERIFICATION,
    ]);
    mockGetPendingSetupProjects.mockResolvedValue([]);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Select repositories/i }));
    await waitFor(() => expect(screen.getByText('myorg')).toBeInTheDocument());
    fireEvent.click(screen.getByText('myorg'));

    await waitFor(() => {
      expect(screen.getByText('Rejected')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('shows error state in light theme (covers error div light-branch)', async () => {
    // Covers light-theme branch of the error display (line ~345)
    mockGetMyProjects.mockRejectedValue(new Error('Network error'));
    mockGetPendingSetupProjects.mockResolvedValue([]);

    renderPage();
    // Open dropdown first (error renders inside the dropdown)
    fireEvent.click(screen.getByRole('button', { name: /Select repositories/i }));

    await waitFor(() =>
      expect(screen.getByText('Unable to connect to the server. Please check your connection and try again.')).toBeInTheDocument()
    );
  });

  it('shows empty-state "No repositories found" in light theme', async () => {
    // Covers light-theme branch of the empty-state div (line ~353)
    mockGetMyProjects.mockResolvedValue([]);
    mockGetPendingSetupProjects.mockResolvedValue([]);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Select repositories/i }));

    await waitFor(() =>
      expect(screen.getByText('No repositories found')).toBeInTheDocument()
    );
  });

  it('shows "Complete setup" button in light theme for needs_metadata repo', async () => {
    // Covers light-theme branch of the "Complete setup" button (line ~448)
    mockGetMyProjects.mockResolvedValue([PROJECT_NEEDS_METADATA]);
    mockGetPendingSetupProjects.mockResolvedValue([]);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Select repositories/i }));
    await waitFor(() => expect(screen.getByText('myorg')).toBeInTheDocument());
    fireEvent.click(screen.getByText('myorg'));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Complete setup' })).toBeInTheDocument()
    );
  });
});
