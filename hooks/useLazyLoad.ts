import { useState, useEffect, useCallback, useRef, RefObject } from 'react';

interface UseLazyLoadOptions {
  threshold?: number; // Distance from bottom to trigger load (in pixels)
  rootMargin?: string; // Root margin for IntersectionObserver
  enabled?: boolean; // Enable/disable lazy loading
}

interface UseLazyLoadReturn {
  isFetching: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  reset: () => void;
}

/**
 * Custom hook for lazy loading data with pagination
 * @param fetchFn - Function that fetches data, receives page number and returns { data, hasMore }
 * @param options - Configuration options
 */
export function useLazyLoad<T>(
  fetchFn: (page: number) => Promise<{ data: T[]; hasMore: boolean }>,
  options: UseLazyLoadOptions = {}
): UseLazyLoadReturn & { items: T[]; sentinelRef: RefObject<HTMLDivElement | null> } {
  const {
    threshold = 200,
    rootMargin = '0px',
    enabled = true,
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  const loadMore = useCallback(async () => {
    if (isFetching || !hasMore || !enabled) return;

    setIsFetching(true);
    setError(null);

    try {
      const result = await fetchFn(page);
      setItems(prev => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setIsFetching(false);
    }
  }, [page, isFetching, hasMore, enabled, fetchFn]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    setIsFetching(false);
    isInitialLoad.current = true;
  }, []);

  // Initial load
  useEffect(() => {
    if (enabled && isInitialLoad.current && hasMore && !isFetching) {
      isInitialLoad.current = false;
      loadMore();
    }
  }, [enabled, hasMore, isFetching, loadMore]);

  // Intersection Observer for auto-loading
  useEffect(() => {
    if (!enabled || !sentinelRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting && hasMore && !isFetching) {
          loadMore();
        }
      },
      {
        rootMargin,
        threshold: 0.1,
      }
    );

    const currentSentinel = sentinelRef.current;
    observerRef.current.observe(currentSentinel);

    return () => {
      if (observerRef.current && currentSentinel) {
        observerRef.current.unobserve(currentSentinel);
      }
    };
  }, [enabled, hasMore, isFetching, loadMore, rootMargin]);

  return {
    items,
    isFetching,
    hasMore,
    error,
    loadMore,
    reset,
    sentinelRef,
  };
}

/**
 * Simplified hook for manual lazy loading (without IntersectionObserver)
 */
export function useManualLazyLoad<T>(
  fetchFn: (page: number) => Promise<{ data: T[]; hasMore: boolean }>,
  options: { enabled?: boolean } = {}
): UseLazyLoadReturn & { items: T[]; loadInitial: () => void } {
  const { enabled = true } = options;

  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMore = useCallback(async () => {
    if (isFetching || !hasMore || !enabled) return;

    setIsFetching(true);
    setError(null);

    try {
      const result = await fetchFn(page);
      setItems(prev => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setIsFetching(false);
    }
  }, [page, isFetching, hasMore, enabled, fetchFn]);

  const loadInitial = useCallback(async () => {
    if (isFetching || !enabled) return;

    setIsFetching(true);
    setError(null);
    setPage(1);
    setHasMore(true);

    try {
      const result = await fetchFn(1);
      setItems(result.data);
      setHasMore(result.hasMore);
      setPage(2);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setIsFetching(false);
    }
  }, [isFetching, enabled, fetchFn]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    setIsFetching(false);
  }, []);

  return {
    items,
    isFetching,
    hasMore,
    error,
    loadMore,
    loadInitial,
    reset,
  };
}
