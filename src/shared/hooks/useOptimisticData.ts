import { useState, useCallback, useRef, useEffect } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UseOptimisticDataOptions {
  cacheDuration?: number;
  cacheKey?: string;
}

interface UseOptimisticDataReturn<T> {
  data: T;
  isLoading: boolean;
  hasError: boolean;
  fetchData: (fetchFn: (signal: AbortSignal) => Promise<T>, forceRefresh?: boolean) => Promise<void>;
  clearCache: () => void;
}

/**
 * useOptimisticData hook
 * 
 * @param initialData - Default data to show initially
 * @param options - Configure cache duration and cacheKey
 * 
 * Includes a keyed Map cache for caching data by `cacheKey`.
 * Uses AbortController to cancel previous fetches when a new one starts or unmounts.
 */
export function useOptimisticData<T>(
  initialData: T,
  options: UseOptimisticDataOptions = {}
): UseOptimisticDataReturn<T> {
  const { cacheDuration = 30000, cacheKey = 'default' } = options;
  
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Abort on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchData = useCallback(
    async (fetchFn: (signal: AbortSignal) => Promise<T>, forceRefresh: boolean = false) => {
      const now = Date.now();
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const signal = abortController.signal;
      
      const cached = cacheRef.current.get(cacheKey);
      if (
        !forceRefresh &&
        cached &&
        now - cached.timestamp < cacheDuration
      ) {
        setData(cached.data);
        setIsLoading(false);
        setHasError(false);
        return;
      }

      const hasExistingData = 
        data !== initialData || 
        (Array.isArray(data) && data.length > 0) ||
        (typeof data === 'object' && data !== null && Object.keys(data).length > 0);

      if (!hasExistingData) {
        setIsLoading(true);
      }
      
      setHasError(false);

      try {
        const result = await fetchFn(signal);
        
        if (signal.aborted) {
          return;
        }
        
        cacheRef.current.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
        
        setData(result);
        setIsLoading(false);
        setHasError(false);
      } catch (err: any) {
        // Swallow AbortErrors and do not log to prevent leaking secure tokens or failing noisily
        if (err.name === 'AbortError' || signal.aborted) {
          return;
        }

        console.error('Failed to fetch data:', err);
        
        const isNetworkError =
          err instanceof TypeError ||
          (err instanceof Error &&
            (err.message.includes('fetch') ||
              err.message.includes('network') ||
              err.message.includes('Unable to connect') ||
              err.message.includes('Failed to fetch')));

        if (isNetworkError) {
          setHasError(true);
        } else {
          setIsLoading(false);
          setHasError(true);
        }
      }
    },
    [data, initialData, cacheDuration, cacheKey]
  );

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    data,
    isLoading,
    hasError,
    fetchData,
    clearCache,
  };
}