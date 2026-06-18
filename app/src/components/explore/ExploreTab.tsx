"use client";

import { useQueryState } from "nuqs";
import { profile } from "./data";
import { InterestFinder } from "./InterestFinder";
import { SchoolMatch } from "./SchoolMatch";
import { CareerExplorer } from "./CareerExplorer";
import { CareerAssessment } from "./CareerAssessment";
import { MonthlyCheckIn } from "./MonthlyCheckIn";
import { Pill } from "../research/ui";

const FEATURES = [
  { key: "interests", label: "What you're into", icon: "✨", Component: InterestFinder },
  { key: "schools", label: "School match", icon: "🎓", Component: SchoolMatch },
  { key: "careers", label: "Careers & pay", icon: "💸", Component: CareerExplorer },
  { key: "assessment", label: "Career quiz", icon: "🧭", Component: CareerAssessment },
  { key: "checkin", label: "Monthly check-in", icon: "🗓️", Component: MonthlyCheckIn },
] as const;

export type ExploreView = (typeof FEATURES)[number]["key"];

export function ExploreTab() {
  const [view, setView] = useQueryState<ExploreView>("view", {
    defaultValue: "interests",
    parse: (v) =>
      (FEATURES.some((f) => f.key === v) ? v : "interests") as ExploreView,
    serialize: (v) => v,
  });

  const Active =
    FEATURES.find((f) => f.key === view)?.Component ?? InterestFinder;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Explore
          </h1>
          <Pill tone="violet">{profile.grade}</Pill>
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {profile.name} · {profile.homeState} · no pressure to have it figured
          out yet. Start anywhere — Halda keeps your progress.
        </p>
      </header>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {FEATURES.map((f) => {
          const on = f.key === view;
          return (
            <button
              key={f.key}
              onClick={() => setView(f.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                on
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "border-black/[.1] text-zinc-600 hover:bg-zinc-50 dark:border-white/[.12] dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <span aria-hidden>{f.icon}</span>
              {f.label}
            </button>
          );
        })}
      </nav>

      <Active onNavigate={setView} />
    </div>
  );
}
