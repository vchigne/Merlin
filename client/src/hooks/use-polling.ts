import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  interval?: number; // milliseconds
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export function usePolling<T>(
  fetchFn: () => Promise<T>,
  { interval = 30000, enabled = true, onError }: UsePollingOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current || !enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchFn();
      if (isMountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        if (onError) onError(error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        
        // Schedule next poll if enabled
        if (enabled) {
          timerRef.current = setTimeout(fetchData, interval);
        }
      }
    }
  }, [fetchFn, interval, enabled, onError]);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch
    if (enabled) {
      fetchData();
    } else {
      setLoading(false);
    }
    
    return () => {
      isMountedRef.current = false;
      clearTimer();
    };
  }, [fetchData, enabled, clearTimer]);

  // Handle changes to interval or enabled status
  useEffect(() => {
    if (enabled) {
      clearTimer();
      timerRef.current = setTimeout(fetchData, interval);
    } else {
      clearTimer();
    }
    
    return clearTimer;
  }, [interval, enabled, fetchData, clearTimer]);

  const refetch = useCallback(() => {
    clearTimer();
    return fetchData();
  }, [fetchData, clearTimer]);

  return {
    data,
    loading,
    error,
    refetch
  };
}
