"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function useDemoPoll<T>(
  fetcher: () => Promise<T>,
  intervalMs = 3000,
): { data: T | null; isLoading: boolean; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
    const id = setInterval(run, intervalMs);
    return () => clearInterval(id);
  }, [run, intervalMs]);

  return { data, isLoading, refresh: run };
}
