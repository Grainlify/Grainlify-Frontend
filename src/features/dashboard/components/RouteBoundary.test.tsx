import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { reloadAlreadyUsed } from '../../../shared/components/chunkReload';
import { RouteBoundary, lazyRoute } from './RouteBoundary';
import {
  AdminRouteSkeleton,
  BlogRouteSkeleton,
  BountiesRouteSkeleton,
  BrowseRouteSkeleton,
  ContributorsRouteSkeleton,
  DataRouteSkeleton,
  DiscoverRouteSkeleton,
  EcosystemDetailRouteSkeleton,
  EcosystemsRouteSkeleton,
  GrainHackAdminRouteSkeleton,
  GrainHackEventDetailRouteSkeleton,
  GrainHackEventsRouteSkeleton,
  IssueDetailRouteSkeleton,
  LeaderboardRouteSkeleton,
  MaintainersRouteSkeleton,
  MyGrainHackRouteSkeleton,
  NotificationsRouteSkeleton,
  OrgProfileRouteSkeleton,
  ProfileRouteSkeleton,
  ProjectDetailRouteSkeleton,
  SearchRouteSkeleton,
  SettingsRouteSkeleton,
} from './RouteSkeletons';

const CHUNK_ERROR_MESSAGE =
  'Failed to fetch dynamically imported module: /assets/LeaderboardPage-DcZD11ux.js';

describe('RouteBoundary & lazyRoute', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let reloadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    sessionStorage.clear();
  });

  it('shows the route-specific skeleton while the lazy route chunk is pending', async () => {
    let resolveChunk!: (mod: { default: () => JSX.Element }) => void;
    const PendingPage = lazyRoute(
      () =>
        new Promise<{ default: () => JSX.Element }>((resolve) => {
          resolveChunk = resolve;
        }),
    );

    renderWithProviders(
      <RouteBoundary
        surface="The Leaderboard tab"
        fallback={<LeaderboardRouteSkeleton />}
        onRetryChunk={PendingPage.reset}
      >
        <PendingPage />
      </RouteBoundary>,
    );

    const skeleton = screen.getByTestId('route-skeleton');
    expect(skeleton).toHaveAttribute('data-route-skeleton', 'leaderboard');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');

    resolveChunk({ default: () => <div data-testid="leaderboard-loaded">Leaderboard ready</div> });

    expect(await screen.findByTestId('leaderboard-loaded')).toBeInTheDocument();
    expect(screen.queryByTestId('route-skeleton')).not.toBeInTheDocument();
  });

  it('automatically retries re-importing a failed route chunk once without reloading the document or spending the global reload budget', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const FlakyRoute = lazyRoute(() => {
      attempts += 1;
      if (attempts === 1) {
        return Promise.reject(new TypeError(CHUNK_ERROR_MESSAGE));
      }
      return Promise.resolve({
        default: () => <div data-testid="recovered-route">Route recovered on retry</div>,
      });
    });

    renderWithProviders(
      <div>
        <input aria-label="Shell search" defaultValue="" />
        <RouteBoundary
          surface="The Leaderboard tab"
          fallback={<LeaderboardRouteSkeleton />}
          onRetryChunk={FlakyRoute.reset}
        >
          <FlakyRoute />
        </RouteBoundary>
      </div>,
    );

    const shellInput = screen.getByLabelText('Shell search');
    await user.type(shellInput, 'unsaved query');

    expect(await screen.findByTestId('recovered-route')).toBeInTheDocument();
    expect(attempts).toBe(2);
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(reloadAlreadyUsed()).toBe(false);
    expect(shellInput).toHaveValue('unsaved query');
  });

  it('degrades to an inline route error card (keeping the shell alive) when the automatic chunk retry also fails, and recovers on manual "Try again"', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const PersistentFlakyRoute = lazyRoute(() => {
      attempts += 1;
      if (attempts <= 2) {
        return Promise.reject(new TypeError(CHUNK_ERROR_MESSAGE));
      }
      return Promise.resolve({
        default: () => <div data-testid="manual-recovered-route">Loaded on third try</div>,
      });
    });

    renderWithProviders(
      <div>
        <nav data-testid="dashboard-shell-nav">Navigation alive</nav>
        <RouteBoundary
          surface="The Leaderboard tab"
          fallback={<LeaderboardRouteSkeleton />}
          onRetryChunk={PersistentFlakyRoute.reset}
        >
          <PersistentFlakyRoute />
        </RouteBoundary>
      </div>,
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('data-route-surface', 'The Leaderboard tab');
    expect(screen.getByText("The Leaderboard tab couldn't be loaded")).toBeInTheDocument();
    expect(screen.getByText(/retrying once/i)).toBeInTheDocument();
    expect(screen.getByText(CHUNK_ERROR_MESSAGE)).toBeInTheDocument();

    // Shell remains mounted and document reload was never triggered
    expect(screen.getByTestId('dashboard-shell-nav')).toBeInTheDocument();
    expect(attempts).toBe(2);
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(reloadAlreadyUsed()).toBe(false);

    // Clicking "Try again" re-imports the chunk and renders the route without reloading
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('manual-recovered-route')).toBeInTheDocument();
    expect(attempts).toBe(3);
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('offers a secondary "Reload page" button on chunk failure that triggers window.location.reload', async () => {
    const user = userEvent.setup();
    const DeadChunkRoute = lazyRoute(() => Promise.reject(new TypeError(CHUNK_ERROR_MESSAGE)));

    renderWithProviders(
      <RouteBoundary
        surface="The Browse tab"
        fallback={<BrowseRouteSkeleton />}
        onRetryChunk={DeadChunkRoute.reset}
      >
        <DeadChunkRoute />
      </RouteBoundary>,
    );

    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Reload page' }));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('catches ordinary render errors without auto-retrying chunk imports', async () => {
    let renderCount = 0;
    function BrokenRender(): JSX.Element {
      renderCount += 1;
      throw new Error('suggested_reason_codes is not iterable');
    }

    const onRetryChunk = vi.fn();

    renderWithProviders(
      <RouteBoundary
        surface="The admin tab"
        fallback={<AdminRouteSkeleton />}
        onRetryChunk={onRetryChunk}
      >
        <BrokenRender />
      </RouteBoundary>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText("The admin tab couldn't be displayed")).toBeInTheDocument();
    expect(screen.getByText('suggested_reason_codes is not iterable')).toBeInTheDocument();
    expect(onRetryChunk).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(renderCount).toBeGreaterThanOrEqual(1);
  });

  it('renders distinct route-specific skeletons for all 22 dashboard routes', () => {
    const skeletons: Array<[string, JSX.Element]> = [
      ['discover', <DiscoverRouteSkeleton key="discover" />],
      ['browse', <BrowseRouteSkeleton key="browse" />],
      ['contributors', <ContributorsRouteSkeleton key="contributors" />],
      ['leaderboard', <LeaderboardRouteSkeleton key="leaderboard" />],
      ['ecosystems', <EcosystemsRouteSkeleton key="ecosystems" />],
      ['ecosystem-detail', <EcosystemDetailRouteSkeleton key="ecosystem-detail" />],
      ['grainhack-events', <GrainHackEventsRouteSkeleton key="grainhack-events" />],
      ['grainhack-event-detail', <GrainHackEventDetailRouteSkeleton key="grainhack-event-detail" />],
      ['maintainers', <MaintainersRouteSkeleton key="maintainers" />],
      ['profile', <ProfileRouteSkeleton key="profile" />],
      ['org-profile', <OrgProfileRouteSkeleton key="org-profile" />],
      ['data', <DataRouteSkeleton key="data" />],
      ['project-detail', <ProjectDetailRouteSkeleton key="project-detail" />],
      ['issue-detail', <IssueDetailRouteSkeleton key="issue-detail" />],
      ['bounties', <BountiesRouteSkeleton key="bounties" />],
      ['blog', <BlogRouteSkeleton key="blog" />],
      ['settings', <SettingsRouteSkeleton key="settings" />],
      ['admin', <AdminRouteSkeleton key="admin" />],
      ['my-grainhack', <MyGrainHackRouteSkeleton key="my-grainhack" />],
      ['notifications', <NotificationsRouteSkeleton key="notifications" />],
      ['grainhack-admin', <GrainHackAdminRouteSkeleton key="grainhack-admin" />],
      ['search', <SearchRouteSkeleton key="search" />],
    ];

    for (const [expectedRoute, element] of skeletons) {
      const { unmount } = renderWithProviders(element);
      const rendered = screen.getByTestId('route-skeleton');
      expect(rendered).toHaveAttribute('data-route-skeleton', expectedRoute);
      expect(rendered).toHaveAttribute('aria-busy', 'true');
      unmount();
    }
  });
});
