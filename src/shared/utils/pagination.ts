/**
 * Shared pagination helpers used by paginated list views (project browsing,
 * leaderboard, etc.).
 *
 * The functions here are intentionally pure so they can be unit-tested in
 * isolation and reused across features. They also act as the single place
 * where user-influenced `limit`/`offset` values are clamped to sane bounds
 * before being sent to the API — never trust caller-controlled paging values
 * blindly (see {@link clampLimit} / {@link clampOffset}).
 */

/** Default number of items requested per page. */
export const DEFAULT_PAGE_LIMIT = 12;

/**
 * Hard upper bound on a single page size. Requesting more than this is treated
 * as abuse / a bug and is clamped down to protect the API.
 */
export const MAX_PAGE_LIMIT = 100;

/**
 * Hard upper bound on `offset`. Prevents pathological deep-paging requests
 * (e.g. `offset=999999999`) from reaching the backend.
 */
export const MAX_OFFSET = 100_000;

/**
 * Clamp a requested page size into the safe range `[1, MAX_PAGE_LIMIT]`.
 *
 * Non-finite, non-positive, or fractional inputs fall back to a sane value:
 * invalid input yields `fallback`, oversized input is capped at
 * {@link MAX_PAGE_LIMIT}.
 *
 * @param limit - Caller-supplied page size (untrusted).
 * @param fallback - Value to use when `limit` is missing/invalid.
 * @returns An integer page size guaranteed to be within bounds.
 */
export function clampLimit(
  limit: number | undefined | null,
  fallback: number = DEFAULT_PAGE_LIMIT,
): number {
  const safeFallback = Math.min(
    Math.max(1, Math.floor(fallback) || DEFAULT_PAGE_LIMIT),
    MAX_PAGE_LIMIT,
  );
  if (limit == null || !Number.isFinite(limit)) return safeFallback;
  const floored = Math.floor(limit);
  if (floored < 1) return safeFallback;
  return Math.min(floored, MAX_PAGE_LIMIT);
}

/**
 * Clamp a requested offset into the safe range `[0, MAX_OFFSET]`.
 *
 * Non-finite or negative inputs become `0`; oversized inputs are capped at
 * {@link MAX_OFFSET}.
 *
 * @param offset - Caller-supplied offset (untrusted).
 * @returns A non-negative integer offset guaranteed to be within bounds.
 */
export function clampOffset(offset: number | undefined | null): number {
  if (offset == null || !Number.isFinite(offset)) return 0;
  const floored = Math.floor(offset);
  if (floored < 0) return 0;
  return Math.min(floored, MAX_OFFSET);
}

/**
 * Decide whether more items remain, given a known total count (used where the
 * API returns `total`, e.g. `getPublicProjects`).
 *
 * @param loaded - Number of items already loaded into the UI.
 * @param total - Total number of items reported by the API.
 * @returns `true` when there are still un-loaded items to fetch.
 */
export function hasMoreByTotal(loaded: number, total: number): boolean {
  if (!Number.isFinite(loaded) || !Number.isFinite(total)) return false;
  if (total <= 0) return false;
  return loaded < total;
}

/**
 * Decide whether more items remain when the API does **not** return a total
 * (e.g. the leaderboard endpoint returns a bare array). A full page implies
 * there may be more; a short or empty page means the end was reached.
 *
 * @param received - Number of items returned by the most recent page request.
 * @param limit - The page size that was requested.
 * @returns `true` when the last page was full and another page should be tried.
 */
export function hasMoreByPageSize(received: number, limit: number): boolean {
  if (!Number.isFinite(received) || received <= 0) return false;
  return received >= clampLimit(limit);
}
