"use client";

import { useMemo, useState } from "react";
import { profile, schools } from "./data";
import { computeFit, estimateNetPrice, pct, satMidpoint, usd } from "./lib";
import type { School } from "./types";
import { Card, Meter, Pill, SectionHeader, fitTone } from "./ui";

const REACH_TONE = {
  likely: "green",
  target: "blue",
  reach: "amber",
  "far-reach": "red",
} as const;

export function SchoolComparison() {
  const [selected, setSelected] = useState<string[]>(
    schools.slice(0, 4).map((s) => s.id),
  );

  const toggle = (id: string) =>
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );

  const active = schools.filter((s) => selected.includes(s.id));

  const ranked = useMemo(
    () =>
      [...active]
        .map((s) => ({ school: s, fit: computeFit(s, profile) }))
        .sort((a, b) => b.fit.overall - a.fit.overall),
    [active],
  );

  const best = ranked[0];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Deep school comparison"
        subtitle={`Scored for ${profile.name} — ${profile.intendedMajor}, ${profile.gpa.toFixed(1)} GPA, SAT ${profile.sat}, budget ${usd(profile.budget)}/yr.`}
      />

      <Card>
        <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Schools you&apos;re considering
        </p>
        <div className="flex flex-wrap gap-2">
          {schools.map((s) => {
            const on = selected.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  on
                    ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                    : "border-black/[.1] text-zinc-600 hover:bg-zinc-50 dark:border-white/[.12] dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {on ? "✓ " : "+ "}
                {s.name}
              </button>
            );
          })}
        </div>
      </Card>

      {best ? (
        <Card className="border-sky-200 bg-sky-50/50 dark:border-sky-900 dark:bg-sky-950/30">
          <div className="flex items-center gap-2">
            <Pill tone="blue">Best overall fit</Pill>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {best.school.name}
            </span>
            <span className="ml-auto text-2xl font-bold tabular-nums text-sky-600 dark:text-sky-400">
              {best.fit.overall}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Strong on{" "}
            {best.fit.affordability >= 75
              ? "affordability for your family"
              : "your intended program"}
            , and your stats land it as a{" "}
            <span className="font-medium">{best.fit.reach}</span> school.
          </p>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-zinc-500">
            Select at least one school to compare.
          </p>
        </Card>
      )}

      <div className="overflow-x-auto">
        <ComparisonTable active={active} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ranked.map(({ school, fit }) => (
          <Card key={school.id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {school.name}
                </h3>
                <p className="text-sm text-zinc-500">
                  {school.city}, {school.state} · {school.kind} ·{" "}
                  {school.setting}
                </p>
              </div>
              <div className="text-right">
                <div
                  className={`text-2xl font-bold tabular-nums ${
                    fit.overall >= 75
                      ? "text-emerald-600 dark:text-emerald-400"
                      : fit.overall >= 55
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {fit.overall}
                </div>
                <Pill tone={REACH_TONE[fit.reach]}>{fit.reach}</Pill>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <Meter label="Affordability" value={fit.affordability} tone={fitTone(fit.affordability)} />
              <Meter label="Program strength" value={fit.program} tone={fitTone(fit.program)} />
              <Meter label="Academic match" value={fit.academic} tone={fitTone(fit.academic)} />
              <Meter label="Setting fit" value={fit.setting} tone={fitTone(fit.setting)} />
            </div>

            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
              {school.blurb}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ComparisonTable({ active }: { active: School[] }) {
  if (active.length === 0) return null;

  const rows: {
    label: string;
    get: (s: School) => string;
    best?: (s: School) => number;
    higherIsBetter?: boolean;
  }[] = [
    { label: "Net price (you)", get: (s) => usd(estimateNetPrice(s, profile.householdIncome)), best: (s) => estimateNetPrice(s, profile.householdIncome), higherIsBetter: false },
    { label: "Sticker price", get: (s) => usd(s.stickerPrice), best: (s) => s.stickerPrice, higherIsBetter: false },
    { label: "Admit rate", get: (s) => pct(s.admitRate) },
    { label: "SAT (mid)", get: (s) => String(satMidpoint(s.satRange)) },
    { label: "Grad rate", get: (s) => pct(s.gradRate), best: (s) => s.gradRate, higherIsBetter: true },
    { label: "CS program", get: (s) => `${s.program.strength}/100`, best: (s) => s.program.strength, higherIsBetter: true },
    { label: "Grad earnings (10yr)", get: (s) => usd(s.medianEarnings), best: (s) => s.medianEarnings, higherIsBetter: true },
    { label: "Undergrads", get: (s) => s.size.toLocaleString() },
  ];

  const bestId = (row: (typeof rows)[number]): string | null => {
    if (!row.best) return null;
    let id: string | null = null;
    let bestVal = row.higherIsBetter ? -Infinity : Infinity;
    for (const s of active) {
      const v = row.best(s);
      if (row.higherIsBetter ? v > bestVal : v < bestVal) {
        bestVal = v;
        id = s.id;
      }
    }
    return id;
  };

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className="sticky left-0 bg-white p-2 text-left font-medium text-zinc-500 dark:bg-zinc-950">
            <span className="sr-only">Metric</span>
          </th>
          {active.map((s) => (
            <th
              key={s.id}
              className="p-2 text-left align-bottom font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {s.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const winner = bestId(row);
          return (
            <tr key={row.label} className="border-t border-black/[.06] dark:border-white/[.08]">
              <td className="sticky left-0 bg-white p-2 font-medium text-zinc-500 dark:bg-zinc-950">
                {row.label}
              </td>
              {active.map((s) => (
                <td
                  key={s.id}
                  className={`p-2 tabular-nums ${
                    winner === s.id
                      ? "font-semibold text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {row.get(s)}
                  {winner === s.id ? " ★" : ""}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
