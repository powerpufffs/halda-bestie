"use client";

import { useEffect, useState } from "react";

/**
 * Persist a piece of state to localStorage. Returns [value, setValue, loaded].
 * `loaded` flips true once the stored value (if any) has been read on the
 * client, so consumers can avoid flashing default data during hydration.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore malformed storage */
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full / unavailable */
    }
  }, [key, value, loaded]);

  return [value, setValue, loaded] as const;
}
