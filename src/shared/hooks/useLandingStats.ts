import { useEffect, useMemo, useState } from 'react';

import { getLandingStats, type LandingStats } from '../api/client';

type LandingStatsDisplay = {
  activeProjects: string;
  contributors: string;
  grantsDistributed: string;
};

const formatCount = (n: number) => n.toLocaleString();

const formatUSD = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

/**
 * Fetches landing-page statistics on mount and exposes loading/data/error state.
 *
 * @returns An object containing:
 * - `stats` – the raw API payload, or `null` while loading or after a failure.
 * - `display` – formatted strings ready for rendering; all fields are `'—'` when `stats` is `null`.
 * - `isLoading` – `true` until the request settles (success or failure).
 * - `error` – populated with the caught `Error.message` on failure (or `'Failed to load stats'`
 *   for non-`Error` rejections); `null` on success. Callers are responsible for surfacing this
 *   to the user — the hook does not re-throw.
 *
 * @remarks Unmounting during a pending request is safe: an `isMounted` flag prevents
 * stale state updates after the component is removed from the tree.
 */
export function useLandingStats() {
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setIsLoading(true);
        const s = await getLandingStats();
        if (!isMounted) return;
        setStats(s);
        setError(null);
      } catch (e) {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load stats');
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const display: LandingStatsDisplay = useMemo(() => {
    if (!stats) {
      return {
        activeProjects: '—',
        contributors: '—',
        grantsDistributed: '—',
      };
    }

    return {
      activeProjects: formatCount(stats.active_projects),
      contributors: formatCount(stats.contributors),
      grantsDistributed: formatUSD(stats.grants_distributed_usd),
    };
  }, [stats]);

  return { stats, display, isLoading, error };
}


