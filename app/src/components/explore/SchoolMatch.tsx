"use client";

import { useMemo, useState } from "react";
import { BUCKETS, profile, schools } from "./data";
import { useChecklist, useInterests } from "./state";
import { computeFit } from "../research/lib";
import { usd, pct } from "../research/lib";
import { Card, Meter, Pill, SectionHeader, Stat, fitTone } from "../research/ui";
import type { ExploreView } from "./ExploreTab";

const REACH_TONE = {
  likely: "green",
  target: "blue",
  reach: "amber",
  "far-reach": "red",
} as const;

/**
 * Tab 2 — "Find schools that match you."
 * A light discovery view over the shared school catalog, ranked against the
 * sophomore's profile. Deeper, direction-specific search lives with Halda
 * (the college_match_search tool) — this is the at-a-glance version.
 */
export function SchoolMatch({
  onNavigate,
}: {
  onNavigate?: (view: ExploreView) => void;
}) {
  const { interests } = useInterests();
  const { complete } = useChecklist();
  const [openId, setOpenId] = useState<string | null>(null);

  const ranked = useMemo(
    () =>
      schools
        .map((s) => ({ school: s, fit: computeFit(s, profile) }))
        .sort((a, b) => b.fit.overall - a.fit.overall),
    [],
  );

  const open = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
    complete("schools"); // looking into a match checks off roadmap item 2
  };

  const interestLabels = interests
    .map((k) => BUCKETS.find((b) => b.key === k)?.label)
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Schools that match you"
        subtitle={`Ranked against your profile — ${profile.homeState}, around ${usd(profile.budget)}/yr, first-gen. ${
          interestLabels ? `Leaning ${interestLabels.toLowerCase()}.` : ""
        }`}
      />

      {/* Handoff to the live, direction-aware search Halda runs. */}
      <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/30">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {interests.length === 0 ? (
            <>
              <button
                onClick={() => onNavigate?.("interests")}
                className="font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
              >
                Pick a direction
              </button>{" "}
              and this list gets sharper. Want a full search? Halda can pull live
              matches for your exact budget and state over text.
            </>
          ) : (
            <>
              This is the quick view. For a full list tuned to{" "}
              <span className="font-medium">{interestLabels}</span> with live
              cost and acceptance data, ask Halda to run a college search.
            </>
          )}
        </p>
      </Card>

      <div className="space-y-2">
        {ranked.map(({ school: s, fit }) => {
          const isOpen = openId === s.id;
          return (
            <Card key={s.id} className="p-0">
              <button
                onClick={() => open(s.id)}
                aria-expanded={isOpen}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {s.name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {s.city}, {s.state} · {s.setting} · {s.kind}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Pill tone={REACH_TONE[fit.reach]}>{fit.reach}</Pill>
                    <span className="text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {fit.overall}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <Meter value={fit.overall} tone={fitTone(fit.overall)} label="Overall fit" />
                </div>
              </button>

              {isOpen ? (
                <div className="space-y-4 border-t border-black/[.06] px-4 py-4 dark:border-white/[.08]">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">{s.blurb}</p>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Stat label="Admit rate" value={pct(s.admitRate)} />
                    <Stat label="Grad rate" value={pct(s.gradRate)} />
                    <Stat label="Sticker / yr" value={usd(s.stickerPrice)} hint="before aid" />
                    <Stat label="Grads earn" value={usd(s.medianEarnings)} hint="10 yrs out" />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <FitBar label="Academic" value={fit.academic} />
                    <FitBar label="Affordability" value={fit.affordability} />
                    <FitBar label="Program" value={fit.program} />
                  </div>

                  <p className="text-xs text-zinc-400">
                    Earnings are medians 10 years after entry (College Scorecard
                    style). You&apos;ve got two years to move these numbers in your
                    favor — that&apos;s the whole point of starting now.
                  </p>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function FitBar({ label, value }: { label: string; value: number }) {
  return <Meter value={value} tone={fitTone(value)} label={label} />;
}
