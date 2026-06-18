"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * SSR-safe localStorage-backed state. Starts from `initial` on the server and
 * the first client render (so markup matches), then hydrates from localStorage
 * in an effect to avoid hydration mismatches.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from storage once on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore malformed / unavailable storage
    }
    setHydrated(true);
  }, [key]);

  // Persist after hydration so we never clobber stored data with `initial`.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / unavailable storage
    }
  }, [key, value, hydrated]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => setValue((prev) => (typeof next === "function" ? (next as (p: T) => T)(prev) : next)),
    []
  );

  return [value, set] as const;
}

export default useLocalStorage;
