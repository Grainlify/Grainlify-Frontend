/**
 * A page's public data, requested while the page's code is still arriving.
 *
 * Measured on a mid-range Android profile (4x CPU, slow 4G), Discover asked
 * for its projects at 5.5s: only once the dashboard chunk, the Discover chunk
 * and its imports had all downloaded and the component had mounted. The
 * request itself needs none of that. Started from the entry script instead,
 * it runs alongside the chunk downloads rather than after them.
 *
 * Only public endpoints go through here. A requiresAuth call made before the
 * session is ready goes out without its token, the backend answers 401, and
 * the 401 handler signs the person out - so anything behind a session stays
 * where the page makes it, after the session exists.
 *
 * A prefetched answer is used once and only while fresh. The page's own
 * retries and refreshes always make a new request.
 */
import { getRecommendedProjects } from './client';
import { getBounties } from './bountyAgent';

const FRESH_MS = 30_000;

type Entry = { at: number; promise: Promise<unknown> };
const pending = new Map<string, Entry>();

export const PREFETCH_KEYS = {
  recommendedProjects: 'recommended-projects-50',
  bounties: 'public-bounties',
} as const;

export function prefetch<T>(key: string, load: () => Promise<T>): void {
  const existing = pending.get(key);
  if (existing && Date.now() - existing.at < FRESH_MS) return;
  const promise = load();
  // Handled by whoever takes it. Without this a failure nobody took yet
  // would surface as an unhandled rejection.
  promise.catch(() => {});
  pending.set(key, { at: Date.now(), promise });
}

/** The prefetched request if there is a fresh one, otherwise a new one. */
export function takePrefetched<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = pending.get(key);
  pending.delete(key);
  if (existing && Date.now() - existing.at < FRESH_MS) return existing.promise as Promise<T>;
  return load();
}

const hasSession = () => {
  try {
    return Boolean(localStorage.getItem('patchwork_jwt'));
  } catch {
    return false;
  }
};

/**
 * Starts whatever the page at this location will ask for first. Signed-out
 * visitors to the dashboard are sent to sign-in, so nothing is fetched for
 * them.
 */
export function prefetchForLocation(location: { pathname: string; search: string }): void {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (!hasSession()) return;
  const tab = new URLSearchParams(location.search).get('tab');
  if (path === '/dashboard' && (!tab || tab === 'discover')) {
    // A bare /dashboard is Discover - see the tab initialiser in Dashboard.
    prefetch(PREFETCH_KEYS.recommendedProjects, () => getRecommendedProjects(50));
  } else if ((path === '/dashboard' && tab === 'bounties') || path === '/bounties') {
    prefetch(PREFETCH_KEYS.bounties, getBounties);
  }
}

/** For tests. */
export function clearPrefetched(): void {
  pending.clear();
}
