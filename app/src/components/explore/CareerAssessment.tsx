"use client";

import { useEffect, useMemo, useState } from "react";
import { BUCKETS, type BucketKey } from "./data";
import { useChecklist, useInterests } from "./state";
import { Card, SectionHeader } from "../research/ui";
import type { ExploreView } from "./ExploreTab";

interface Option {
  label: string;
  // How strongly this answer points at each direction.
  weights: Partial<Record<BucketKey, number>>;
}

interface Question {
  id: string;
  prompt: string;
  options: Option[];
}

// The 3 questions Halda asks to go deeper on fit (sophomore profile, item 4).
const QUESTIONS: Question[] = [
  {
    id: "workday",
    prompt:
      "When you imagine your ideal workday, you're mostly…",
    options: [
      { label: "Working with people", weights: { "helping people": 2, business: 1 } },
      { label: "Solving problems", weights: { science: 2, engineering: 1, business: 1 } },
      { label: "Building / making things", weights: { engineering: 2, art: 1 } },
    ],
  },
  {
    id: "values",
    prompt: "You care more about…",
    options: [
      { label: "Making good money", weights: { business: 2, engineering: 1, science: 1 } },
      { label: "Making a difference", weights: { "helping people": 2, science: 1 } },
      { label: "Doing something creative", weights: { art: 2, engineering: 1 } },
    ],
  },
  {
    id: "environment",
    prompt: "Day to day, you'd rather be…",
    options: [
      { label: "Remote / flexible", weights: { science: 1, art: 1, business: 1 } },
      { label: "In-person / on-site", weights: { "helping people": 1, engineering: 1 } },
    ],
  },
];

const REASONING: Record<BucketKey, string> = {
  engineering: "you like building things and solving concrete problems",
  "helping people": "you're driven by working with and supporting people",
  business: "you're drawn to money, leadership, and making things happen",
  art: "you want to make things and express yourself",
  science: "you like figuring out how things work and digging into problems",
};

/**
 * Tab 4 — "Take the career assessment."
 * Three quick questions, then two suggested directions you can fold into your
 * interests. Not a verdict — a nudge toward what to explore next.
 */
export function CareerAssessment({
  onNavigate,
}: {
  onNavigate?: (view: ExploreView) => void;
}) {
  const { toggle, interests } = useInterests();
  const { complete } = useChecklist();
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const allAnswered = Object.keys(answers).length === QUESTIONS.length;

  useEffect(() => {
    if (allAnswered) complete("assessment");
  }, [allAnswered, complete]);

  // Top two directions by accumulated weight.
  const suggestions = useMemo(() => {
    if (!allAnswered) return [];
    const score: Record<string, number> = {};
    for (const q of QUESTIONS) {
      const opt = q.options[answers[q.id]];
      if (!opt) continue;
      for (const [k, w] of Object.entries(opt.weights)) {
        score[k] = (score[k] ?? 0) + (w ?? 0);
      }
    }
    return (Object.entries(score) as [BucketKey, number][])
      .toSorted((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k]) => k);
  }, [answers, allAnswered]);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Career assessment"
        subtitle="Three quick questions. No wrong answers — this just points you at a couple directions worth exploring."
      />

      {QUESTIONS.map((q, qi) => (
        <Card key={q.id}>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            <span className="text-zinc-400">{qi + 1}.</span> {q.prompt}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {q.options.map((opt, oi) => {
              const on = answers[q.id] === oi;
              return (
                <button
                  key={opt.label}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                  className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                    on
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                      : "border-black/[.1] text-zinc-600 hover:bg-zinc-50 dark:border-white/[.12] dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Card>
      ))}

      {allAnswered ? (
        <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/30">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Based on that, two directions worth a look 👇
          </p>
          <div className="mt-3 space-y-3">
            {suggestions.map((k) => {
              const b = BUCKETS.find((x) => x.key === k);
              const already = interests.includes(k);
              if (!b) return null;
              return (
                <div
                  key={k}
                  className="flex items-start justify-between gap-3 rounded-xl border border-black/[.08] bg-white p-3 dark:border-white/[.1] dark:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {b.emoji} {b.label}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {REASONING[k]}
                    </p>
                  </div>
                  <button
                    onClick={() => !already && toggle(k)}
                    disabled={already}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      already
                        ? "cursor-default bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    }`}
                  >
                    {already ? "✓ In your interests" : "Add to interests"}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => onNavigate?.("careers")}
              className="rounded-full border border-black/[.12] px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-white/[.14] dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              See careers in these areas →
            </button>
          </div>
        </Card>
      ) : (
        <p className="px-1 text-sm text-zinc-500 dark:text-zinc-400">
          Answer all three to see your directions.
        </p>
      )}
    </div>
  );
}
