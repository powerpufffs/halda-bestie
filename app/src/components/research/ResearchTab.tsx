"use client";

import { useQueryState } from "nuqs";
import { CampusVisitPlanner } from "./CampusVisitPlanner";
import { profile } from "./data";
import { FinancialAidEstimator } from "./FinancialAidEstimator";
import { ProgramExplorer } from "./ProgramExplorer";
import { ScholarshipTracker } from "./ScholarshipTracker";
import { SchoolComparison } from "./SchoolComparison";
import { Pill } from "./ui";

const FEATURES = [
  { key: "compare", label: "Compare schools", icon: "⚖️", Component: SchoolComparison },
  { key: "scholarships", label: "Scholarships", icon: "🎓", Component: ScholarshipTracker },
  { key: "visits", label: "Campus visits", icon: "📍", Component: CampusVisitPlanner },
  { key: "aid", label: "Aid estimator", icon: "💰", Component: FinancialAidEstimator },
  { key: "programs", label: "Programs & careers", icon: "🧭", Component: ProgramExplorer },
] as const;

type FeatureKey = (typeof FEATURES)[number]["key"];

export function ResearchTab() {
  const [view, setView] = useQueryState<FeatureKey>("view", {
    defaultValue: "compare",
    parse: (v) =>
      (FEATURES.some((f) => f.key === v) ? v : "compare") as FeatureKey,
    serialize: (v) => v,
  });

  const Active =
    FEATURES.find((f) => f.key === view)?.Component ?? SchoolComparison;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Research
          </h1>
          <Pill tone="blue">{profile.grade}</Pill>
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {profile.name} · {profile.homeState} · {profile.intendedMajor} ·{" "}
          aiming at {profile.careerInterest.toLowerCase()}. Everything here is
          scored against your profile.
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

      <Active />
    </div>
  );
}
