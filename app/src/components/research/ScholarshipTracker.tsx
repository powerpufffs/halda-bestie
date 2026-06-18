"use client";

import { useMemo, useState } from "react";
import { profile, scholarships as seed } from "./data";
import { daysUntil, formatDeadline, usd } from "./lib";
import type { Scholarship, ScholarshipStatus } from "./types";
import { Card, Pill, SectionHeader, Stat } from "./ui";

const STATUS_FLOW: ScholarshipStatus[] = [
  "not_started",
  "tracking",
  "in_progress",
  "submitted",
  "won",
];

const STATUS_LABEL: Record<ScholarshipStatus, string> = {
  not_started: "Not started",
  tracking: "Tracking",
  in_progress: "In progress",
  submitted: "Submitted",
  won: "Won 🎉",
};

const STATUS_TONE = {
  not_started: "neutral",
  tracking: "blue",
  in_progress: "amber",
  submitted: "violet",
  won: "green",
} as const;

/** Decide whether the seeded profile meets a scholarship's eligibility. */
function eligibility(s: Scholarship): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  let ok = true;
  if (s.match.minGpa && profile.gpa < s.match.minGpa) {
    ok = false;
    reasons.push(`Needs ${s.match.minGpa.toFixed(1)} GPA`);
  }
  if (s.match.firstGenOnly && !profile.firstGen) {
    ok = false;
    reasons.push("First-gen only");
  }
  if (s.match.states && !s.match.states.includes(profile.homeState)) {
    ok = false;
    reasons.push(`${s.match.states.join("/")} residents only`);
  }
  if (
    s.match.majors &&
    !s.match.majors.some((m) =>
      profile.intendedMajor.toLowerCase().includes(m.toLowerCase()),
    ) &&
    !s.match.majors.includes("Engineering")
  ) {
    ok = false;
    reasons.push(`For ${s.match.majors.join("/")} majors`);
  }
  return { ok, reasons };
}

export function ScholarshipTracker() {
  const [items, setItems] = useState<Scholarship[]>(seed);
  const [onlyEligible, setOnlyEligible] = useState(false);
  const [sort, setSort] = useState<"deadline" | "amount">("deadline");

  const advance = (id: string) =>
    setItems((cur) =>
      cur.map((s) => {
        if (s.id !== id) return s;
        const next =
          STATUS_FLOW[(STATUS_FLOW.indexOf(s.status) + 1) % STATUS_FLOW.length];
        return { ...s, status: next };
      }),
    );

  const view = useMemo(() => {
    let list = [...items];
    if (onlyEligible) list = list.filter((s) => eligibility(s).ok);
    list.sort((a, b) =>
      sort === "deadline"
        ? daysUntil(a.deadline) - daysUntil(b.deadline)
        : b.amount - a.amount,
    );
    return list;
  }, [items, onlyEligible, sort]);

  const eligibleItems = items.filter((s) => eligibility(s).ok);
  const potential = eligibleItems.reduce((sum, s) => sum + s.amount, 0);
  const inFlight = items.filter((s) =>
    ["in_progress", "submitted", "won"].includes(s.status),
  ).length;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Scholarship discovery & tracking"
        subtitle="Matched to your profile, then tracked from first look to award."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card><Stat label="Matches" value={`${eligibleItems.length} of ${items.length}`} hint="you're eligible" /></Card>
        <Card><Stat label="Potential" value={usd(potential)} hint="if you win matches" /></Card>
        <Card><Stat label="In flight" value={inFlight} hint="started or submitted" /></Card>
        <Card><Stat label="Next due" value={formatDeadline(view[0]?.deadline ?? "2026-06-18")} hint={`${Math.max(0, daysUntil(view[0]?.deadline ?? "2026-06-18"))} days`} /></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setOnlyEligible((v) => !v)}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            onlyEligible
              ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "border-black/[.1] text-zinc-600 dark:border-white/[.12] dark:text-zinc-400"
          }`}
        >
          {onlyEligible ? "✓ " : ""}Eligible only
        </button>
        <div className="ml-auto flex items-center gap-2 text-sm text-zinc-500">
          <span>Sort:</span>
          {(["deadline", "amount"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`rounded-md px-2 py-1 ${
                sort === k
                  ? "bg-zinc-200 font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {k === "deadline" ? "Deadline" : "Amount"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {view.map((s) => (
          <ScholarshipRow
            key={s.id}
            scholarship={s}
            elig={eligibility(s)}
            onAdvance={advance}
          />
        ))}
      </div>
    </div>
  );
}

function ScholarshipRow({
  scholarship: s,
  elig,
  onAdvance,
}: {
  scholarship: Scholarship;
  elig: { ok: boolean; reasons: string[] };
  onAdvance: (id: string) => void;
}) {
  const days = daysUntil(s.deadline);
  const urgent = days <= 30;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {s.name}
            </h3>
            {elig.ok ? (
              <Pill tone="green">Eligible</Pill>
            ) : (
              <Pill tone="neutral">Not a match</Pill>
            )}
            {s.renewable ? <Pill tone="violet">Renewable</Pill> : null}
          </div>
          <p className="text-sm text-zinc-500">{s.sponsor}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {usd(s.amount)}
            {s.renewable ? <span className="text-xs font-normal text-zinc-400">/yr</span> : null}
          </div>
          <div className={`text-xs ${urgent ? "font-semibold text-rose-600 dark:text-rose-400" : "text-zinc-500"}`}>
            {formatDeadline(s.deadline)} · {days} days
          </div>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        {s.eligibility.map((e) => (
          <li key={e} className="list-inside list-disc">{e}</li>
        ))}
      </ul>

      {!elig.ok && elig.reasons.length ? (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          Gap: {elig.reasons.join(" · ")}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-zinc-400">~{s.effortHours}h to apply</span>
        <button
          onClick={() => onAdvance(s.id)}
          className="inline-flex items-center gap-2 rounded-full border border-black/[.1] px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/[.12] dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <Pill tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Pill>
          <span className="text-zinc-400">→ advance</span>
        </button>
      </div>
    </Card>
  );
}
