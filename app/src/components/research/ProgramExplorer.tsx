"use client";

import { useMemo, useState } from "react";
import { profile, schools } from "./data";
import { usd } from "./lib";
import { Card, Meter, Pill, SectionHeader, Stat, fitTone } from "./ui";

export function ProgramExplorer() {
  const offering = useMemo(
    () =>
      schools
        .filter((s) => s.program.offered)
        .sort((a, b) => b.program.strength - a.program.strength),
    [],
  );

  const [activeId, setActiveId] = useState(offering[0]?.id ?? "");
  const active = offering.find((s) => s.id === activeId) ?? offering[0];

  const allCareers = useMemo(() => {
    const set = new Set<string>();
    for (const s of offering) for (const c of s.program.careers) set.add(c);
    return [...set];
  }, [offering]);

  const earningsLift = active
    ? active.program.medianEarnings - active.medianEarnings
    : 0;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Program & career-fit explorer"
        subtitle={`Where ${profile.intendedMajor} actually leads — your goal: ${profile.careerInterest.toLowerCase()}.`}
      />

      <Card>
        <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {profile.intendedMajor} program strength across your schools
        </p>
        <div className="space-y-3">
          {offering.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`block w-full rounded-xl border p-3 text-left transition-colors ${
                s.id === activeId
                  ? "border-sky-500 bg-sky-50/60 dark:border-sky-700 dark:bg-sky-950/40"
                  : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {s.name}
                </span>
                <span className="tabular-nums text-zinc-500">
                  {s.program.strength}/100 · {usd(s.program.medianEarnings)}
                </span>
              </div>
              <div className="mt-2">
                <Meter value={s.program.strength} tone={fitTone(s.program.strength)} />
              </div>
            </button>
          ))}
        </div>
      </Card>

      {active ? (
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {active.name} — {active.program.major}
            </h3>
            <Pill tone={fitTone(active.program.strength)}>
              {active.program.strength}/100
            </Pill>
          </div>

          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            {active.program.highlight}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat
              label="Major earnings (10yr)"
              value={usd(active.program.medianEarnings)}
              hint="graduates of this field"
            />
            <Stat
              label="vs. all-school avg"
              value={`${earningsLift >= 0 ? "+" : ""}${usd(earningsLift)}`}
              hint="earnings lift from major"
            />
            <Stat
              label="School median"
              value={usd(active.medianEarnings)}
              hint="all graduates"
            />
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              Common career paths
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {active.program.careers.map((c) => (
                <Pill key={c} tone="violet">
                  {c}
                </Pill>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Careers this major opens, across all your schools
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {allCareers.map((c) => (
            <Pill key={c} tone="blue">
              {c}
            </Pill>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Earnings figures are field-of-study medians 10 years after entry
          (College Scorecard style). Your path and outcomes will vary.
        </p>
      </Card>
    </div>
  );
}
