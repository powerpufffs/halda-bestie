"use client";

import { useMemo, useState } from "react";
import { BUCKETS, CAREERS, type BucketKey, type Career } from "./data";
import { useChecklist, useInterests } from "./state";
import { Card, Pill, SectionHeader } from "../research/ui";
import type { ExploreView } from "./ExploreTab";

/**
 * Tab 3 — "Explore what careers actually pay."
 * Surfaces the same career data Halda's explore_career tool uses. Filters to
 * the student's picked directions by default; a search box looks up any career.
 */
export function CareerExplorer({
  onNavigate,
}: {
  onNavigate?: (view: ExploreView) => void;
}) {
  const { interests } = useInterests();
  const { complete } = useChecklist();

  // Filters default to whatever the student is into, and stay in sync with it
  // (interests hydrate from storage after first render). Once they tap a chip,
  // `override` takes over so their explicit choice sticks.
  const [override, setOverride] = useState<BucketKey[] | null>(null);
  const filters = override ?? interests;
  const [query, setQuery] = useState("");
  const [openName, setOpenName] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CAREERS.filter((c) => {
      const matchesBucket = filters.length === 0 || filters.includes(c.bucket);
      const matchesQuery =
        q === "" ||
        c.name.toLowerCase().includes(q) ||
        c.bucket.includes(q) ||
        c.dayInLife.toLowerCase().includes(q);
      // A search overrides the bucket filter so you can find anything.
      return q === "" ? matchesBucket : matchesQuery;
    });
  }, [filters, query]);

  const toggleFilter = (key: BucketKey) =>
    setOverride((prev) => {
      const base = prev ?? interests;
      return base.includes(key)
        ? base.filter((k) => k !== key)
        : [...base, key];
    });

  const open = (c: Career) => {
    setOpenName((prev) => (prev === c.name ? null : c.name));
    complete("careers"); // exploring a career checks off roadmap item 3
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Careers & what they pay"
        subtitle="Real day-to-day and pay ranges for where each direction leads. These are ranges, not guarantees — and not starting salary unless it says so."
        action={
          <button
            onClick={() => onNavigate?.("assessment")}
            className="shrink-0 rounded-full border border-black/[.12] px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-white/[.14] dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Not sure? Take the quiz →
          </button>
        }
      />

      {/* Search any career. */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a career — e.g. nurse, software, designer"
        className="w-full rounded-xl border border-black/[.1] bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-white/[.12] dark:bg-zinc-900 dark:text-zinc-100"
      />

      {/* Direction filters (hidden while searching). */}
      {query.trim() === "" ? (
        <div className="flex flex-wrap gap-2">
          {BUCKETS.map((b) => {
            const on = filters.includes(b.key);
            return (
              <button
                key={b.key}
                onClick={() => toggleFilter(b.key)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  on
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                    : "border-black/[.1] text-zinc-600 hover:bg-zinc-50 dark:border-white/[.12] dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <span aria-hidden>{b.emoji}</span>
                {b.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Career list. */}
      <div className="space-y-2">
        {visible.map((c) => (
          <CareerRow
            key={c.name}
            career={c}
            isOpen={openName === c.name}
            onToggle={() => open(c)}
          />
        ))}

        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-black/[.12] p-6 text-center text-sm text-zinc-500 dark:border-white/[.14] dark:text-zinc-400">
            No careers match that yet. Try a broader term, or ask Halda — she can
            dig into careers that aren&apos;t on this list.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CareerRow({
  career: c,
  isOpen,
  onToggle,
}: {
  career: Career;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="p-0">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="text-2xl" aria-hidden>
          {c.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {c.name}
          </span>
          <span className="block truncate text-xs text-emerald-700 dark:text-emerald-400">
            {c.salaryRange}
          </span>
        </span>
        <span className="shrink-0 text-zinc-400">{isOpen ? "−" : "+"}</span>
      </button>

      {isOpen ? (
        <div className="space-y-3 border-t border-black/[.06] px-4 py-3 dark:border-white/[.08]">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Day to day</p>
            <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">{c.dayInLife}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Pay</p>
            <p className="mt-0.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {c.salaryRange}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Outlook</p>
            <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">{c.growthOutlook}</p>
          </div>
          <Pill tone="violet">
            {BUCKETS.find((b) => b.key === c.bucket)?.label ?? c.bucket}
          </Pill>
        </div>
      ) : null}
    </Card>
  );
}
