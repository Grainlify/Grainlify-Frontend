import { useCallback, useEffect, useRef, useState } from 'react'
import { useOptimisticData } from './useOptimisticData'
import { clampLimit, clampOffset, hasMoreByPageSize, hasMoreByTotal } from '../utils/pagination'

/** A single page of results returned by a paginated list endpoint. */
export interface PaginatedPage<T> {
  /** Items contained in this page, ready to display (e.g. already mapped/filtered). */
  items: T[]
  /**
   * Total number of items across all pages, when the API reports one (e.g.
   * `getPublicProjects`). Omit it for endpoints that return a bare array
   * (e.g. `getLeaderboard`) — end-of-list is then inferred from page size via
   * {@link hasMoreByPageSize} instead of {@link hasMoreByTotal}.
   */
  total?: number
  /**
   * Raw number of rows the API returned for this page, before any
   * client-side filtering or mapping changed `items.length`. Defaults to
   * `items.length` when omitted — only pass this when `fetchPage` drops or
   * transforms rows (e.g. filtering out invalid entries), so the next
   * request's offset still advances by the API's actual raw page size
   * instead of the (possibly smaller) displayed count. Getting this wrong
   * silently skips or duplicates raw rows on the next page.
   */
  received?: number
}

/**
 * Fetches a single page for the given (already-clamped) `limit`/`offset`.
 * Receives an `AbortSignal` that is aborted when this request is superseded
 * by a newer one or the component unmounts — forward it to the underlying
 * request (e.g. `fetch`) when the API supports cancellation.
 */
export type FetchPageFn<T> = (
  page: { limit: number; offset: number },
  signal: AbortSignal
) => Promise<PaginatedPage<T>>

/** Options for {@link usePaginatedQuery}. */
export interface UsePaginatedQueryOptions {
  /** Page size requested per fetch. Clamped to `[1, MAX_PAGE_LIMIT]` (see `pagination.ts`); defaults to `DEFAULT_PAGE_LIMIT`. */
  limit?: number
  /** Max retry attempts forwarded to {@link useOptimisticData}. */
  maxRetries?: number
  /** Base backoff delay (ms) forwarded to {@link useOptimisticData}. */
  baseDelay?: number
}

/** Return value of {@link usePaginatedQuery}. */
export interface UsePaginatedQueryReturn<T> {
  /** Items accumulated across all loaded pages for the current query. */
  items: T[]
  /** Total item count reported by the API, or `0` when unknown or not yet loaded. */
  total: number
  /** Whether another page is available to load. */
  hasMore: boolean
  /** `true` while the first page of the current query is loading. */
  isLoading: boolean
  /** `true` while an additional ("load more") page is loading. */
  isLoadingMore: boolean
  /** `true` when the most recent fetch (initial or load-more) failed. */
  hasError: boolean
  /** The error from the most recent failed fetch, if any. */
  error: unknown
  /** Fetch the next page and append it to `items`. No-op while a page is already loading or `hasMore` is `false`. */
  loadMore: () => void
  /** Discard accumulated items and refetch the first page from offset `0`. */
  reset: () => void
  /** Retry the most recently failed fetch (initial load or load-more) with backoff. */
  retry: () => void
}

/**
 * Reusable pagination layer over {@link useOptimisticData} for offset-based
 * list endpoints (e.g. `getPublicProjects`, `getLeaderboard`).
 *
 * Centralizes the offset tracking, append-vs-replace, and end-of-list
 * detection that list pages otherwise reimplement individually — logic that
 * has already had off-by-one and end-of-list bugs fixed once in
 * `src/shared/utils/pagination.ts`. Request cancellation (abort on unmount or
 * on a superseding fetch) and retry/backoff are inherited directly from
 * {@link useOptimisticData}.
 *
 * The first page loads automatically on mount, and again whenever the
 * `fetchPage` reference changes — pass a `useCallback` that depends on your
 * filters so changing filters automatically restarts pagination at offset 0,
 * the same way `BrowsePage` previously reloaded when `selectedFilters`
 * changed. Call the returned `reset()` to restart pagination manually (e.g. a
 * "refresh" button) without changing `fetchPage`.
 *
 * Every page request always bypasses `useOptimisticData`'s response cache:
 * each call targets a different offset, so a time-based cache keyed on a
 * single `cacheKey` would otherwise risk replaying a stale page instead of
 * fetching the next one. Only its cancellation, retry/backoff, and
 * loading/error state machinery are reused.
 *
 * `limit`/`offset` are clamped to non-negative, bounded integers (see
 * {@link clampLimit} / {@link clampOffset}) before being handed to
 * `fetchPage`, so a caller-influenced page size or a runaway offset can never
 * reach the API unbounded.
 *
 * @param fetchPage - Loads a single page for a given `{ limit, offset }`.
 * @param options - Page size and retry/backoff passthrough options.
 *
 * @example
 * ```tsx
 * const fetchPage = useCallback<FetchPageFn<Project>>(
 *   async ({ limit, offset }) => {
 *     const response = await getPublicProjects({ ...filterParams, limit, offset })
 *     return { items: response.projects, total: response.total }
 *   },
 *   [filterParams]
 * )
 *
 * const { items, isLoading, isLoadingMore, hasMore, loadMore, hasError, retry } =
 *   usePaginatedQuery(fetchPage)
 * ```
 */
export function usePaginatedQuery<T>(
  fetchPage: FetchPageFn<T>,
  options: UsePaginatedQueryOptions = {}
): UsePaginatedQueryReturn<T> {
  const { limit, maxRetries, baseDelay } = options

  const {
    data: items,
    isLoading,
    hasError,
    error,
    retry,
    fetchData,
  } = useOptimisticData<T[]>([], {
    maxRetries,
    baseDelay,
    isEmpty: (data) => data.length === 0,
  })

  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Offset of the NEXT page to request. Tracked in a ref so it stays current
  // inside async callbacks without forcing `loadPage` to be re-created.
  const offsetRef = useRef(0)
  // Mirrors `items` so an in-flight "load more" can append to the latest
  // accumulated list without depending on (and re-creating `loadPage` on)
  // the `items` array itself.
  const itemsRef = useRef<T[]>(items)
  // Guards against a double-click of "load more" firing two concurrent
  // requests — state updates are asynchronous and would otherwise race.
  const loadingMoreRef = useRef(false)
  // Monotonic id; a response for a superseded request (e.g. `reset` fired
  // while a "load more" was in flight) does not get applied.
  const requestSeqRef = useRef(0)

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const loadPage = useCallback(
    (reset: boolean) => {
      if (!reset && (loadingMoreRef.current || !hasMore)) return

      const seq = ++requestSeqRef.current
      if (!reset) {
        loadingMoreRef.current = true
        setIsLoadingMore(true)
      }

      // Clamp paging values to safe, bounded integers before they reach the
      // API so caller-influenced state (filters, rapid clicks) can never
      // request an abusive page size or an unbounded deep-paging offset.
      const pageLimit = clampLimit(limit)
      const offset = clampOffset(reset ? 0 : offsetRef.current)

      void fetchData(async (signal) => {
        const page = await fetchPage({ limit: pageLimit, offset }, signal)
        const pageItems = Array.isArray(page.items) ? page.items : []
        // Advance the cursor by the raw row count the API returned, not by
        // `pageItems.length` — `fetchPage` may have filtered/mapped rows
        // down to a smaller displayed set, and the API's offset is in terms
        // of raw rows.
        const received = page.received ?? pageItems.length

        // Only a request that hasn't been superseded gets to update the
        // pagination cursor / totals; a stale response must not roll back
        // `hasMore`/`offset` past a newer request that already landed.
        if (seq === requestSeqRef.current) {
          const nextOffset = offset + received
          offsetRef.current = nextOffset
          setTotal(page.total ?? 0)
          setHasMore(
            page.total != null
              ? hasMoreByTotal(nextOffset, page.total)
              : hasMoreByPageSize(received, pageLimit)
          )
        }

        return reset ? pageItems : [...itemsRef.current, ...pageItems]
      }, true).finally(() => {
        if (seq === requestSeqRef.current && !reset) {
          loadingMoreRef.current = false
          setIsLoadingMore(false)
        }
      })
    },
    [fetchData, fetchPage, hasMore, limit]
  )

  useEffect(() => {
    loadPage(true)
    // Intentionally re-runs only when `fetchPage` changes identity (mount,
    // or the caller's filters changed) — not on every `loadPage` recreation,
    // which would otherwise reset pagination on every `hasMore` toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage])

  const loadMore = useCallback(() => loadPage(false), [loadPage])
  const reset = useCallback(() => loadPage(true), [loadPage])

  return {
    items,
    total,
    hasMore,
    isLoading,
    isLoadingMore,
    hasError,
    error,
    loadMore,
    reset,
    retry,
  }
}
