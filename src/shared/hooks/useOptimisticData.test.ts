import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOptimisticData } from './useOptimisticData'

describe('useOptimisticData', () => {
  beforeEach(() => {
    // The hook's catch branch logs via console.error; keep test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with isLoading true before any fetch resolves', () => {
    const { result } = renderHook(() => useOptimisticData<string[]>([]))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.hasError).toBe(false)
    expect(result.current.data).toEqual([])
  })

  it('resolves with the fetched data and clears isLoading/hasError on success', async () => {
    const { result } = renderHook(() => useOptimisticData<string[]>([]))
    const payload = ['a', 'b']
    const fetchFn = vi.fn().mockResolvedValue(payload)

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(payload)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasError).toBe(false)
  })

  it('REGRESSION: clears isLoading (does not stay stuck true) when the fetcher rejects', async () => {
    const { result } = renderHook(() => useOptimisticData<string[]>([]))
    const fetchFn = vi.fn().mockRejectedValue(new Error('network down'))

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(result.current.hasError).toBe(true)
    // This is the exact regression this suite guards against: previously the
    // catch block only cleared isLoading on one of two error branches, so a
    // rejected fetch could leave the UI spinning forever.
    expect(result.current.isLoading).toBe(false)
  })

  it('serves a second fetchData call from cache within cacheDuration, without re-invoking the fetcher', async () => {
    const { result } = renderHook(() =>
      useOptimisticData<string[]>([], { cacheDuration: 30000 })
    )
    const first = vi.fn().mockResolvedValue(['first'])
    const second = vi.fn().mockResolvedValue(['second'])

    await act(async () => {
      await result.current.fetchData(first)
    })
    expect(result.current.data).toEqual(['first'])

    await act(async () => {
      await result.current.fetchData(second)
    })

    expect(second).not.toHaveBeenCalled()
    expect(result.current.data).toEqual(['first'])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasError).toBe(false)
  })

  it('forceRefresh bypasses the cache and re-invokes the fetcher with fresh data', async () => {
    const { result } = renderHook(() =>
      useOptimisticData<string[]>([], { cacheDuration: 30000 })
    )
    const first = vi.fn().mockResolvedValue(['first'])
    const second = vi.fn().mockResolvedValue(['second'])

    await act(async () => {
      await result.current.fetchData(first)
    })
    await act(async () => {
      await result.current.fetchData(second, true)
    })

    expect(second).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(['second'])
  })

  it('clearCache forces the next fetchData call to bypass the cache even without forceRefresh', async () => {
    const { result } = renderHook(() =>
      useOptimisticData<string[]>([], { cacheDuration: 30000 })
    )
    const first = vi.fn().mockResolvedValue(['first'])
    const second = vi.fn().mockResolvedValue(['second'])

    await act(async () => {
      await result.current.fetchData(first)
    })
    act(() => {
      result.current.clearCache()
    })
    await act(async () => {
      await result.current.fetchData(second)
    })

    expect(second).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(['second'])
  })
})
