import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { logger } from '../../shared/utils/logger'

const MAX_RETRIES = 5

/** Cache entry for optimistic data */
interface CacheEntry<T> {
  data: T
  timestamp: number
}

/** Options for the hook */
interface UseOptimisticDataOptions<T> {
  /** Cache duration in ms, default 30000 */
  cacheDuration?: number
  /** Cache key for shared caching */
  cacheKey?: string
  /** Custom empty-state predicate for domain-specific data shapes */
  isEmpty?: (data: T) => boolean
}

/** Return type of the hook */
export interface UseOptimisticDataReturn<T> {
  /** Current data */
  data: T
  /** Loading state */
  isLoading: boolean
  /** Whether an error occurred */
  hasError: boolean
  /** Raw error object (if any) */
  error: unknown
  /** Retry the last fetch (max 5 attempts) */
  retry: () => void
  /** Whether the data is empty */
  isEmpty: boolean
  /** Function to manually fetch data */
  fetchData: (fetchFn: (signal: AbortSignal) => Promise<T>, forceRefresh?: boolean) => Promise<void>
  /** Clear cached data */
  clearCache: () => void
}

/**
 * Default empty-state predicate for arrays, objects, and primitive values.
 *
 * Objects with only nullish or otherwise empty values are treated as empty, so
 * `{ value: undefined }` does not accidentally count as populated data.
 */
function defaultIsEmptyValue(value: unknown, seen = new WeakSet<object>()): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0

  if (typeof value === 'object') {
    if (value instanceof Date) return false
    if (seen.has(value)) return false

    seen.add(value)
    const values = Object.values(value as Record<string, unknown>)
    return values.length === 0 || values.every((item) => defaultIsEmptyValue(item, seen))
  }

  return false
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

/**
 * Optimistic data hook with caching, abort support, retry and empty‑state handling.
 *
 * @param initialData – The initial value displayed before any fetch.
 * @param options – Configuration of cache duration, cache key, and empty-state detection.
 */
export function useOptimisticData<T>(
  initialData: T,
  options: UseOptimisticDataOptions<T> = {}
): UseOptimisticDataReturn<T> {
  const { cacheDuration = 30000, cacheKey = 'default', isEmpty: isEmptyOption } = options

  const [data, setData] = useState<T>(initialData)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [hasError, setHasError] = useState<boolean>(false)
  const [error, setError] = useState<unknown>(null)

  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map())
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastFetchFnRef = useRef<((signal: AbortSignal) => Promise<T>) | null>(null)
  const dataRef = useRef<T>(initialData)
  const retryCountRef = useRef<number>(0)
  const emptyPredicate = isEmptyOption ?? defaultIsEmptyValue
  const emptyPredicateRef = useRef<(data: T) => boolean>(emptyPredicate)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    emptyPredicateRef.current = emptyPredicate
  }, [emptyPredicate])

  const updateData = useCallback((nextData: T) => {
    dataRef.current = nextData
    setData(nextData)
  }, [])

  // Abort any in‑flight request when the component unmounts
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const fetchData = useCallback(
    async (fetchFn: (signal: AbortSignal) => Promise<T>, forceRefresh = false) => {
      const now = Date.now()
      lastFetchFnRef.current = fetchFn

      // Cancel any previous request
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller
      const signal = controller.signal

      // Serve from cache when possible
      const cached = cacheRef.current.get(cacheKey)
      if (!forceRefresh && cached && now - cached.timestamp < cacheDuration) {
        updateData(cached.data)
        setIsLoading(false)
        setHasError(false)
        setError(null)
        return
      }

      // Determine whether we already have data to decide loading state
      const hasExistingData = !emptyPredicateRef.current(dataRef.current)

      if (!hasExistingData) {
        setIsLoading(true)
      }

      setHasError(false)
      setError(null)

      try {
        const result = await fetchFn(signal)
        if (signal.aborted) return
        cacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() })
        updateData(result)
        setHasError(false)
        setError(null)
      } catch (err: unknown) {
        if (isAbortError(err) || signal.aborted) return
        logger.error('Failed to fetch data:', err)
        setHasError(true)
        setError(err)
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
          retryCountRef.current = 0
        }
      }
    },
    [cacheDuration, cacheKey, updateData]
  )

  const retry = useCallback(() => {
    const latestFetchFn = lastFetchFnRef.current
    if (retryCountRef.current < MAX_RETRIES && latestFetchFn) {
      retryCountRef.current += 1
      void fetchData(latestFetchFn, true)
    }
  }, [fetchData])

  const clearCache = useCallback(() => {
    cacheRef.current.clear()
  }, [])

  const isEmpty = useMemo(() => {
    return emptyPredicate(data)
  }, [data, emptyPredicate])

  return { data, isLoading, hasError, error, retry, isEmpty, fetchData, clearCache }
}
