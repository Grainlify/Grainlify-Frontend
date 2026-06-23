// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react'
import { useOptimisticData } from './useOptimisticData'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('useOptimisticData', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial data', () => {
    const { result } = renderHook(() => useOptimisticData('initial'))
    expect(result.current.data).toBe('initial')
    expect(result.current.isLoading).toBe(true)
    expect(result.current.hasError).toBe(false)
  })

  it('should fetch data successfully', async () => {
    const { result } = renderHook(() => useOptimisticData('initial'))

    const fetchFn = vi.fn().mockResolvedValue('fetched data')

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(result.current.data).toBe('fetched data')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasError).toBe(false)
  })

  it('should ignore aborted requests due to component unmount', async () => {
    const { result, unmount } = renderHook(() => useOptimisticData('initial'))

    let providedSignal: AbortSignal | undefined
    const fetchFn = vi.fn().mockImplementation((signal: AbortSignal) => {
      providedSignal = signal
      return new Promise((resolve) => setTimeout(() => resolve('fetched'), 100))
    })

    act(() => {
      result.current.fetchData(fetchFn)
    })

    expect(providedSignal).toBeDefined()
    expect(providedSignal!.aborted).toBe(false)

    unmount()

    expect(providedSignal!.aborted).toBe(true)
  })

  it('should simulate two rapid fetchData calls with different keys where first resolves last, asserting only the second applies', async () => {
    const { result, rerender } = renderHook(
      ({ cacheKey }) => useOptimisticData('initial', { cacheKey }),
      { initialProps: { cacheKey: 'key1' } }
    )

    let resolve1: (val: string) => void
    const promise1 = new Promise<string>((resolve) => {
      resolve1 = resolve
    })
    const fetchFn1 = vi.fn().mockReturnValue(promise1)

    act(() => {
      result.current.fetchData(fetchFn1)
    })

    rerender({ cacheKey: 'key2' })

    let resolve2: (val: string) => void
    const promise2 = new Promise<string>((resolve) => {
      resolve2 = resolve
    })
    const fetchFn2 = vi.fn().mockReturnValue(promise2)

    act(() => {
      result.current.fetchData(fetchFn2)
    })

    // second resolves first
    await act(async () => {
      resolve2!('data2')
      await promise2
    })

    expect(result.current.data).toBe('data2')

    // first resolves last
    await act(async () => {
      resolve1!('data1')
      await promise1
    })

    // Result should still be data2 because promise1 was superseded
    expect(result.current.data).toBe('data2')
  })

  it('should return cached data per key', async () => {
    const { result, rerender } = renderHook(
      ({ cacheKey }) => useOptimisticData('initial', { cacheKey, cacheDuration: 5000 }),
      { initialProps: { cacheKey: 'key1' } }
    )

    const fetchFn1 = vi.fn().mockResolvedValue('data1')
    await act(async () => {
      await result.current.fetchData(fetchFn1)
    })

    expect(result.current.data).toBe('data1')
    expect(fetchFn1).toHaveBeenCalledTimes(1)

    // Re-fetch key1 -> should use cache
    await act(async () => {
      await result.current.fetchData(fetchFn1)
    })
    expect(fetchFn1).toHaveBeenCalledTimes(1) // not called again

    // Switch to key2 -> should fetch
    rerender({ cacheKey: 'key2' })
    const fetchFn2 = vi.fn().mockResolvedValue('data2')
    await act(async () => {
      await result.current.fetchData(fetchFn2)
    })
    expect(result.current.data).toBe('data2')
    expect(fetchFn2).toHaveBeenCalledTimes(1)

    // Switch back to key1 -> should use cache
    rerender({ cacheKey: 'key1' })
    const fetchFn3 = vi.fn().mockResolvedValue('data3')
    await act(async () => {
      await result.current.fetchData(fetchFn3)
    })
    expect(result.current.data).toBe('data1')
    expect(fetchFn3).not.toHaveBeenCalled()
  })

  it('should force refresh bypasses cache', async () => {
    const { result } = renderHook(() => useOptimisticData('initial', { cacheDuration: 5000 }))

    const fetchFn1 = vi.fn().mockResolvedValue('data1')
    await act(async () => {
      await result.current.fetchData(fetchFn1)
    })

    expect(result.current.data).toBe('data1')

    const fetchFn2 = vi.fn().mockResolvedValue('data2')
    await act(async () => {
      // call with forceRefresh = true
      await result.current.fetchData(fetchFn2, true)
    })

    expect(result.current.data).toBe('data2')
    expect(fetchFn2).toHaveBeenCalledTimes(1)
  })

  it('swallows AbortError and does not treat it as a real failure', async () => {
    const { result } = renderHook(() => useOptimisticData('initial'))

    const fetchFn = vi.fn().mockImplementation(() => {
      return new Promise((_resolve, reject) => {
        const error = new Error('The user aborted a request.')
        error.name = 'AbortError'
        reject(error)
      })
    })

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(result.current.hasError).toBe(false)
  })

  it('sets error state correctly for network errors', async () => {
    const { result } = renderHook(() => useOptimisticData('initial'))

    // Suppress console.error in tests to avoid noisy output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Network Error'))

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(result.current.hasError).toBe(true)

    consoleSpy.mockRestore()
  })

  it('sets error state correctly for non-network errors', async () => {
    const { result } = renderHook(() => useOptimisticData('initial'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const fetchFn = vi.fn().mockRejectedValue(new Error('Unknown backend crash'))

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(result.current.hasError).toBe(true)
    expect(result.current.isLoading).toBe(false)

    consoleSpy.mockRestore()
  })

  it('clears cache successfully', async () => {
    const { result } = renderHook(() => useOptimisticData('initial', { cacheDuration: 5000 }))
    const fetchFn = vi.fn().mockResolvedValue('data1')

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    act(() => {
      result.current.clearCache()
    })

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it.each([
    { value: [], expected: true, label: 'empty array' },
    { value: ['item'], expected: false, label: 'populated array' },
    { value: '', expected: true, label: 'empty string' },
    { value: 'value', expected: false, label: 'populated string' },
    { value: { count: undefined }, expected: true, label: 'object with only undefined' },
    { value: { count: null }, expected: true, label: 'object with only null' },
    { value: { count: 0 }, expected: false, label: 'object with numeric value' },
    { value: new Date('2026-01-01T00:00:00.000Z'), expected: false, label: 'date object' },
    { value: 0, expected: false, label: 'number primitive' },
    { value: false, expected: false, label: 'boolean primitive' },
  ])('detects empty state for $label', ({ value, expected }) => {
    const { result } = renderHook(() => useOptimisticData<unknown>(value))

    expect(result.current.isEmpty).toBe(expected)
  })

  it('treats circular objects as non-empty instead of recursing forever', () => {
    const circular: { self?: unknown } = {}
    circular.self = circular

    const { result } = renderHook(() => useOptimisticData<unknown>(circular))

    expect(result.current.isEmpty).toBe(false)
  })

  it('allows callers to customize empty detection', async () => {
    const { result } = renderHook(() =>
      useOptimisticData('initial', {
        isEmpty: (value) => value === 'none',
      })
    )

    const fetchFn = vi.fn().mockResolvedValue('none')

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(result.current.data).toBe('none')
    expect(result.current.isEmpty).toBe(true)
  })

  it('sets loading when fetching with empty initial data', async () => {
    const { result } = renderHook(() => useOptimisticData<string[]>([]))
    let resolveFetch!: (value: string[]) => void
    const pendingFetch = new Promise<string[]>((resolve) => {
      resolveFetch = resolve
    })
    const fetchFn = vi.fn().mockReturnValue(pendingFetch)

    act(() => {
      void result.current.fetchData(fetchFn)
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveFetch(['loaded'])
      await pendingFetch
    })

    expect(result.current.data).toEqual(['loaded'])
    expect(result.current.isLoading).toBe(false)
  })

  it('ignores retry before any fetch function has been registered', () => {
    const { result } = renderHook(() => useOptimisticData('initial'))

    act(() => {
      result.current.retry()
    })

    expect(result.current.data).toBe('initial')
    expect(result.current.hasError).toBe(false)
  })

  it('retries with the latest fetch function', async () => {
    const { result } = renderHook(() => useOptimisticData('initial'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const staleFetchFn = vi.fn().mockRejectedValue(new Error('stale request failed'))
    await act(async () => {
      await result.current.fetchData(staleFetchFn)
    })

    const latestFetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('latest request failed'))
      .mockResolvedValueOnce('latest data')

    await act(async () => {
      await result.current.fetchData(latestFetchFn)
    })

    await act(async () => {
      result.current.retry()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(staleFetchFn).toHaveBeenCalledTimes(1)
    expect(latestFetchFn).toHaveBeenCalledTimes(2)
    expect(result.current.data).toBe('latest data')
    expect(result.current.hasError).toBe(false)

    consoleSpy.mockRestore()
  })

  it('keeps fetchData stable after data changes and non-memoized initial data rerenders', async () => {
    const { result, rerender } = renderHook(({ seed }) => useOptimisticData({ value: seed }), {
      initialProps: { seed: 'initial' },
    })
    const firstFetchData = result.current.fetchData

    await act(async () => {
      await result.current.fetchData(vi.fn().mockResolvedValue({ value: 'loaded' }))
    })

    rerender({ seed: 'new-inline-object' })

    expect(result.current.data).toEqual({ value: 'loaded' })
    expect(result.current.fetchData).toBe(firstFetchData)
  })
})
