import { useState, useCallback } from 'react';
import { executeQuery } from '@/lib/hasura-client';

interface UseHasuraQueryOptions {
  query: string;
  variables?: Record<string, any>;
  skip?: boolean;
  path?: string[];
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface UseHasuraQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<T | null>;
}

export function useHasuraQuery<T = any>({
  query,
  variables = {},
  skip = false,
  path = [],
  onSuccess,
  onError
}: UseHasuraQueryOptions): UseHasuraQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!skip);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (): Promise<T | null> => {
    if (skip) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await executeQuery(query, variables);
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      // Extract data from path if provided
      let extractedData = result.data;
      if (path.length > 0) {
        for (const key of path) {
          if (extractedData[key] === undefined) {
            throw new Error(`Path ${path.join('.')} not found in response`);
          }
          extractedData = extractedData[key];
        }
      }
      
      setData(extractedData);
      if (onSuccess) onSuccess(extractedData);
      return extractedData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      if (onError) onError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [query, variables, skip, path, onSuccess, onError]);

  // Initial fetch
  useState(() => {
    if (!skip) {
      fetchData();
    }
  });

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}
