"use client";

import { useEffect } from "react";
import { BUCKETS } from "./data";
import { useChecklist, useInterests } from "./state";
import { Card, Pill, SectionHeader } from "../research/ui";
import type { ExploreView } from "./ExploreTab";

/**
 * Tab 1 — "Figure out what you're into."
 * Mirrors how Halda texts a sophomore the 1–5 interest menu, but tappable.
 * Picking a direction is what tunes the rest of Explore (schools, careers).
 */
export function InterestFinder({
  onNavigate,
}: {
  onNavigate?: (view: ExploreView) => void;
}) {
  const { interests, toggle } = useInterests();
  const { complete } = useChecklist();

  // Picking even one direction checks off roadmap item 1.
  useEffect(() => {
    if (interests.length > 0) complete("interests");
  }, [interests.length, complete]);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="What you're into"
        subtitle="No pressure to have it figured out — pick whatever sounds like you. Halda tunes your schools and careers to it."
      />

      {/* Halda, texting you the interest menu. */}
      <Card>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg dark:bg-violet-950">
            🦊
          </span>
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-400">Halda</p>
            <div className="rounded-2xl rounded-tl-sm bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              real talk you&apos;re ahead of most people for even thinking about
              this 👇 what are you into?
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {BUCKETS.map((b) => {
            const on = interests.includes(b.key);
            return (
              <button
                key={b.key}
                onClick={() => toggle(b.key)}
                aria-pressed={on}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  on
                    ? "border-violet-500 bg-violet-50/70 dark:border-violet-700 dark:bg-violet-950/40"
                    : "border-black/[.08] hover:bg-zinc-50 dark:border-white/[.1] dark:hover:bg-zinc-800/60"
                }`}
              >
                <span className="text-xl" aria-hidden>
                  {b.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {b.label}
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {b.blurb}
                  </span>
                </span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                    on
                      ? "border-violet-500 bg-violet-500 text-white"
                      : "border-zinc-300 text-transparent dark:border-zinc-600"
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Recap + handoffs to the rest of Explore. */}
      {interests.length > 0 ? (
        <Card>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            What Halda has picked up so far
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {interests.map((k) => {
              const b = BUCKETS.find((x) => x.key === k);
              return b ? (
                <Pill key={k} tone="violet">
                  {b.emoji} {b.label}
                </Pill>
              ) : null;
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => onNavigate?.("careers")}
              className="rounded-full bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              See what these careers pay →
            </button>
            <button
              onClick={() => onNavigate?.("schools")}
              className="rounded-full border border-black/[.12] px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/[.14] dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Find matching schools →
            </button>
          </div>
        </Card>
      ) : (
        <p className="px-1 text-sm text-zinc-500 dark:text-zinc-400">
          Prefer to talk it out? You can always text Halda and pick this up from
          your phone — your progress saves either way.
        </p>
      )}
    </div>
  );
}
