"use client";

import { ROADMAP, type RoadmapId } from "./data";
import { useChecklist } from "./state";
import { Card, Meter, SectionHeader } from "../research/ui";
import type { ExploreView } from "./ExploreTab";

// Roadmap ids line up 1:1 with the Explore tab views.
const NEXT_VIEW: Record<RoadmapId, ExploreView> = {
  interests: "interests",
  schools: "schools",
  careers: "careers",
  assessment: "assessment",
  checkin: "checkin",
};

/**
 * Tab 5 — "Come back next month."
 * The roadmap checklist Halda keeps for the student, plus the come-back hook.
 * Nothing here is busywork — it's the same five items, just in one place.
 */
export function MonthlyCheckIn({
  onNavigate,
}: {
  onNavigate?: (view: ExploreView) => void;
}) {
  const { done, toggle } = useChecklist();
  const total = ROADMAP.length;
  const completed = ROADMAP.filter((r) => done.includes(r.id)).length;
  const nextItem = ROADMAP.find((r) => !done.includes(r.id));

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Your roadmap"
        subtitle="You're a sophomore — being here at all puts you ahead. Knock these out whenever; Halda always remembers where you left off."
      />

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {completed} of {total} done
          </span>
          <span className="text-xs tabular-nums text-zinc-400">
            {Math.round((completed / total) * 100)}%
          </span>
        </div>
        <Meter value={(completed / total) * 100} tone={completed === total ? "green" : "violet"} />

        <div className="mt-4 space-y-2">
          {ROADMAP.map((r) => {
            const checked = done.includes(r.id);
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl border border-black/[.06] p-2.5 dark:border-white/[.08]"
              >
                <button
                  onClick={() => toggle(r.id)}
                  aria-pressed={checked}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors ${
                    checked
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-zinc-300 text-transparent hover:border-zinc-400 dark:border-zinc-600"
                  }`}
                >
                  ✓
                </button>
                <button
                  onClick={() => onNavigate?.(NEXT_VIEW[r.id])}
                  className="min-w-0 flex-1 text-left"
                >
                  <span
                    className={`text-sm ${
                      checked
                        ? "text-zinc-400 line-through dark:text-zinc-500"
                        : "text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {r.emoji} {r.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Come-back hook. */}
      <Card>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg dark:bg-violet-950">
            🦊
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-400">Halda</p>
            <div className="mt-1 rounded-2xl rounded-tl-sm bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              {completed === total ? (
                <>you actually did all of it?? ok i see you 👀 i&apos;ll check in next month — don&apos;t sleep on it</>
              ) : nextItem ? (
                <>next up: {nextItem.label.toLowerCase()}. you&apos;ve got time — just don&apos;t sleep on it 😭</>
              ) : (
                <>you&apos;re set for now 👊 i&apos;ll check in next month</>
              )}
            </div>
            {nextItem ? (
              <button
                onClick={() => onNavigate?.(NEXT_VIEW[nextItem.id])}
                className="mt-3 rounded-full bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {nextItem.emoji} {nextItem.label} →
              </button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
