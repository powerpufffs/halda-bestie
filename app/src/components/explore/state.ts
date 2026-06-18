"use client";

import { useCallback, useEffect, useState } from "react";
import type { BucketKey, RoadmapId } from "./data";

/**
 * Tiny localStorage-backed state. Explore tabs mount one at a time (only the
 * active view renders), so persistence is how a choice on one tab — say, the
 * interest you picked — reaches the next. Reads on mount, writes on change.
 */
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore malformed / unavailable storage
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / unavailable storage
    }
  }, [key, value, hydrated]);

  return [value, setValue, hydrated] as const;
}

const INTERESTS_KEY = "explore.interests";
const CHECKLIST_KEY = "explore.checklist";

/** Interests Halda has picked up on, shared across every Explore tab. */
export function useInterests() {
  const [interests, setInterests] = useLocalStorage<BucketKey[]>(INTERESTS_KEY, []);

  const toggle = useCallback(
    (key: BucketKey) =>
      setInterests((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
      ),
    [setInterests],
  );

  return { interests, setInterests, toggle };
}

/** The sophomore roadmap checklist, marked off as the student works through it. */
export function useChecklist() {
  const [done, setDone] = useLocalStorage<RoadmapId[]>(CHECKLIST_KEY, []);

  const complete = useCallback(
    (id: RoadmapId) =>
      setDone((prev) => (prev.includes(id) ? prev : [...prev, id])),
    [setDone],
  );

  const toggle = useCallback(
    (id: RoadmapId) =>
      setDone((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      ),
    [setDone],
  );

  return { done, complete, toggle, setDone };
}
