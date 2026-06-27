// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react'
import { usePaginatedQuery, FetchPageFn, PaginatedPage } from './usePaginatedQuery'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/** A controllable promise + its resolve/reject, for race-condition tests. */
function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('usePaginatedQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the first page automatically on mount', async () => {
    const fetchPage = vi.fn<FetchPageFn<string>>().mockResolvedValue({
      items: ['a', 'b'],
      total: 5,
    })

    const { result } = renderHook(() => usePaginatedQuery(fetchPage))

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith({ limit: 12, offset: 0 }, expect.anything())
    expect(result.current.items).toEqual(['a', 'b'])
    expect(result.current.total).toBe(5)
    expect(result.current.hasMore).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasError).toBe(false)
  })

  it('clamps an invalid limit option to the default before calling fetchPage', async () => {
    const fetchPage = vi.fn<FetchPageFn<string>>().mockResolvedValue({ items: [] })

    renderHook(() => usePaginatedQuery(fetchPage, { limit: -5 }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchPage).toHaveBeenCalledWith({ limit: 12, offset: 0 }, expect.anything())
  })

  it('clamps an oversized limit option to MAX_PAGE_LIMIT before calling fetchPage', async () => {
    const fetchPage = vi.fn<FetchPageFn<string>>().mockResolvedValue({ items: [] })

    renderHook(() => usePaginatedQuery(fetchPage, { limit: 99_999 }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchPage).toHaveBeenCalledWith({ limit: 100, offset: 0 }, expect.anything())
  })

  it('sets hasMore=false immediately for an empty list response', async () => {
    const fetchPage = vi.fn<FetchPageFn<string>>().mockResolvedValue({ items: [], total: 0 })

    const { result } = renderHook(() => usePaginatedQuery(fetchPage, { limit: 12 }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.items).toEqual([])
    expect(result.current.hasMore).toBe(false)
  })

  it('sets hasMore=false for a single page that does not fill the total (known total)', async () => {
    const fetchPage = vi.fn<FetchPageFn<string>>().mockResolvedValue({
      items: ['a', 'b', 'c', 'd', 'e'],
      total: 5,
    })

    const { result } = renderHook(() => usePaginatedQuery(fetchPage, { limit: 12 }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.hasMore).toBe(false)
  })

  it('toggles hasMore true then false across an exact-multiple page boundary (known total)', async () => {
    const fetchPage = vi
      .fn<FetchPageFn<string>>()
      .mockResolvedValueOnce({ items: ['a', 'b'], total: 4 })
      .mockResolvedValueOnce({ items: ['c', 'd'], total: 4 })

    const { result } = renderHook(() => usePaginatedQuery(fetchPage, { limit: 2 }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.hasMore).toBe(true)
    expect(result.current.items).toEqual(['a', 'b'])

    act(() => {
      result.current.loadMore()
    })

    expect(fetchPage).toHaveBeenLastCalledWith({ limit: 2, offset: 2 }, expect.anything())
    expect(result.current.isLoadingMore).toBe(true)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    // Appended, not replaced.
    expect(result.current.items).toEqual(['a', 'b', 'c', 'd'])
    expect(result.current.hasMore).toBe(false)
    expect(result.current.isLoadingMore).toBe(false)
  })

  it('supports bare-array endpoints without a total via the page-size heuristic', async () => {
    const fetchPage = vi
      .fn<FetchPageFn<string>>()
      .mockResolvedValueOnce({ items: ['a', 'b'] }) // full page, no total
      .mockResolvedValueOnce({ items: ['c'] }) // short page -> end of list

    const { result } = renderHook(() => usePaginatedQuery(fetchPage, { limit: 2 }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.hasMore).toBe(true)
    expect(result.current.total).toBe(0)

    act(() => {
      result.current.loadMore()
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.items).toEqual(['a', 'b', 'c'])
    expect(result.current.hasMore).toBe(false)
  })

  it('is a no-op once hasMore is false', async () => {
    const fetchPage = vi.fn<FetchPageFn<string>>().mockResolvedValue({ items: ['a'], total: 1 })

    const { result } = renderHook(() => usePaginatedQuery(fetchPage, { limit: 12 }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.hasMore).toBe(false)

    act(() => {
      result.current.loadMore()
    })

    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('guards against concurrent loadMore calls (double-click)', async () => {
    const second = createDeferred<PaginatedPage<string>>()
    const fetchPage = vi
      .fn<FetchPageFn<string>>()
      .mockResolvedValueOnce({ items: ['a'], total: 10 })
      .mockReturnValueOnce(second.promise)

    const { result } = renderHook(() => usePaginatedQuery(fetchPage, { limit: 1 }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    act(() => {
      result.current.loadMore()
      result.current.loadMore()
    })

    // Initial load + exactly one load-more call, despite the double click.
    expect(fetchPage).toHaveBeenCalledTimes(2)

    await act(async () => {
      second.resolve({ items: ['b'], total: 10 })
      await second.promise
    })

    expect(result.current.items).toEqual(['a', 'b'])
  })

  it('reset() discards accumulated items and refetches from offset 0', async () => {
    const fetchPage = vi
      .fn<FetchPageFn<string>>()
      .mockResolvedValueOnce({ items: ['a'], total: 10 })
      .mockResolvedValueOnce({ items: ['b'], total: 10 })
      .mockResolvedValueOnce({ items: ['x'], total: 1 })

    const { result } = renderHook(() => usePaginatedQuery(fetchPage, { limit: 1 }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    act(() => {
      result.current.loadMore()
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.items).toEqual(['a', 'b'])

    act(() => {
      result.current.reset()
    })

    expect(fetchPage).toHaveBeenLastCalledWith({ limit: 1, offset: 0 }, expect.anything())

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    // Replaced, not appended to the previous accumulated list.
    expect(result.current.items).toEqual(['x'])
    expect(result.current.total).toBe(1)
    expect(result.current.hasMore).toBe(false)
  })

  it("restarts pagination at offset 0 when fetchPage's identity changes (e.g. filters changed)", async () => {
    const fetchPageA = vi.fn<FetchPageFn<string>>().mockResolvedValue({ items: ['a'], total: 10 })
    const fetchPageB = vi.fn<FetchPageFn<string>>().mockResolvedValue({ items: ['z'], total: 1 })

    const { result, rerender } = renderHook(
      ({ fetchPage }) => usePaginatedQuery(fetchPage, { limit: 1 }),
      { initialProps: { fetchPage: fetchPageA } }
    )

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.items).toEqual(['a'])

    rerender({ fetchPage: fetchPageB })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchPageB).toHaveBeenCalledWith({ limit: 1, offset: 0 }, expect.anything())
    expect(result.current.items).toEqual(['z'])
    expect(result.current.hasMore).toBe(false)
  })

  it('advances the offset by the raw `received` count, not the filtered `items` count', async () => {
    // Simulates an endpoint where the raw page has 2 rows but one was
    // filtered out client-side, so `items.length` (1) understates the
    // actual API page size (2). The next request must still skip 2 raw rows.
    const fetchPage = vi
      .fn<FetchPageFn<string>>()
      .mockResolvedValueOnce({ items: ['a'], total: 10, received: 2 })
      .mockResolvedValueOnce({ items: ['b'], total: 10, received: 2 })

    const { result } = renderHook(() => usePaginatedQuery(fetchPage, { limit: 2 }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    act(() => {
      result.current.loadMore()
    })

    // Offset must advance by `received` (2), not `items.length` (1).
    expect(fetchPage).toHaveBeenLastCalledWith({ limit: 2, offset: 2 }, expect.anything())

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.items).toEqual(['a', 'b'])
  })

  it('tolerates a non-array `items` value defensively', async () => {
    const fetchPage = vi
      .fn<FetchPageFn<string>>()
      .mockResolvedValue({ items: null as unknown as string[] })

    const { result } = renderHook(() => usePaginatedQuery(fetchPage))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.items).toEqual([])
    expect(result.current.hasError).toBe(false)
  })

  it('surfaces a failed load-more via hasError/error without clearing existing items', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchPage = vi
      .fn<FetchPageFn<string>>()
      .mockResolvedValueOnce({ items: ['a'], total: 10 })
      .mockRejectedValueOnce(new Error('network blip'))

    const { result } = renderHook(() => usePaginatedQuery(fetchPage, { limit: 1 }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.hasMore).toBe(true)

    act(() => {
      result.current.loadMore()
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.hasError).toBe(true)
    expect(result.current.error).toBeInstanceOf(Error)
    // Previously loaded items and pagination state survive the failure.
    expect(result.current.items).toEqual(['a'])
    expect(result.current.hasMore).toBe(true)
    expect(result.current.isLoadingMore).toBe(false)

    consoleSpy.mockRestore()
  })

  it('retry() re-attempts the most recently failed page fetch and recovers', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchPage = vi
      .fn<FetchPageFn<string>>()
      .mockResolvedValueOnce({ items: ['a'], total: 10 })
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce({ items: ['b'], total: 10 })

    const { result } = renderHook(() => usePaginatedQuery(fetchPage, { limit: 1, baseDelay: 100 }))

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    act(() => {
      result.current.loadMore()
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.hasError).toBe(true)

    act(() => {
      result.current.retry()
    })

    await act(async () => {
      vi.advanceTimersByTime(200)
      await Promise.resolve()
      await Promise.resolve()
    })

    // The retry replays the same failed page (offset 1), not a fresh one.
    expect(fetchPage).toHaveBeenLastCalledWith({ limit: 1, offset: 1 }, expect.anything())
    expect(result.current.hasError).toBe(false)
    expect(result.current.items).toEqual(['a', 'b'])

    consoleSpy.mockRestore()
  })

  it('aborts the in-flight request on unmount', async () => {
    let capturedSignal: AbortSignal | undefined
    const fetchPage = vi.fn<FetchPageFn<string>>().mockImplementation((_, signal) => {
      capturedSignal = signal
      return new Promise(() => {
        // never resolves
      })
    })

    const { unmount } = renderHook(() => usePaginatedQuery(fetchPage))

    await act(async () => {
      await Promise.resolve()
    })

    expect(capturedSignal).toBeDefined()
    expect(capturedSignal!.aborted).toBe(false)

    unmount()

    expect(capturedSignal!.aborted).toBe(true)
  })

  it('ignores a stale load-more response that resolves after a newer reset already landed', async () => {
    const initial = createDeferred<PaginatedPage<string>>()
    const loadMorePage = createDeferred<PaginatedPage<string>>()
    const resetPage = createDeferred<PaginatedPage<string>>()
    const fetchPage = vi
      .fn<FetchPageFn<string>>()
      .mockReturnValueOnce(initial.promise)
      .mockReturnValueOnce(loadMorePage.promise)
      .mockReturnValueOnce(resetPage.promise)

    const { result } = renderHook(() => usePaginatedQuery(fetchPage, { limit: 1 }))

    await act(async () => {
      initial.resolve({ items: ['a'], total: 10 })
      await initial.promise
      await Promise.resolve()
    })
    expect(result.current.hasMore).toBe(true)

    // Start a "load more" (offset 1) but do not resolve it yet.
    act(() => {
      result.current.loadMore()
    })

    // A reset fires before the load-more settles (e.g. filters changed).
    act(() => {
      result.current.reset()
    })

    await act(async () => {
      resetPage.resolve({ items: ['x'], total: 1 })
      await resetPage.promise
      await Promise.resolve()
    })

    expect(result.current.items).toEqual(['x'])
    expect(result.current.hasMore).toBe(false)

    // The superseded load-more now resolves late; it must not overwrite the
    // newer reset's state.
    await act(async () => {
      loadMorePage.resolve({ items: ['b'], total: 10 })
      await loadMorePage.promise
      await Promise.resolve()
    })

    expect(result.current.items).toEqual(['x'])
    expect(result.current.hasMore).toBe(false)
    expect(result.current.total).toBe(1)
  })
})
