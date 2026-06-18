"use client";

import { useMemo, useState } from "react";
import { Bestie, BESTIE_STAGES, MAX_STAGE, stageForGrowth } from "@/components/Bestie";

type Challenge = {
  id: string;
  emoji: string;
  title: string;
  blurb: string;
  growth: number;
};

// Completing challenges adds growth points; growth drives the egg's stage.
// Total growth here is 12 — enough to reach the final "Mega Bestie" stage.
const CHALLENGES: Challenge[] = [
  { id: "essay", emoji: "📝", title: "Glow up your essay", blurb: "Apply 1 counselor suggestion", growth: 3 },
  { id: "activity", emoji: "🏅", title: "Flex an activity", blurb: "Add or polish 1 activity", growth: 3 },
  { id: "interview", emoji: "🎤", title: "Run a mock interview", blurb: "Answer 2 practice questions", growth: 3 },
  { id: "deadline", emoji: "⏰", title: "Beat the clock", blurb: "Check 1 upcoming deadline", growth: 2 },
  { id: "hype", emoji: "💜", title: "Hype your squad", blurb: "Send a friend some love", growth: 1 },
];

export function BestieHome() {
  const [done, setDone] = useState<string[]>([]);

  const growth = useMemo(
    () =>
      CHALLENGES.filter((c) => done.includes(c.id)).reduce((sum, c) => sum + c.growth, 0),
    [done]
  );
  const stage = stageForGrowth(growth);
  const nextStage = stage < MAX_STAGE ? BESTIE_STAGES[stage + 1] : null;
  const growthToNext = nextStage ? nextStage.min - growth : 0;
  const pct = nextStage ? Math.min(100, Math.round((growth / nextStage.min) * 100)) : 100;

  const toggle = (id: string) =>
    setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  return (
    <div className="min-h-screen w-full bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-md">
        {/* Hero — the growing egg */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 p-5 shadow-xl shadow-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/70">
                Your Halda Bestie
              </p>
              <h2 className="text-xl font-black text-white">{BESTIE_STAGES[stage].name}</h2>
            </div>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur">
              Stage {stage + 1}/{MAX_STAGE + 1}
            </span>
          </div>

          <div className="mt-1 flex justify-center">
            <Bestie
              stage={stage}
              className="h-52 w-52 drop-shadow-2xl transition-transform duration-500"
            />
          </div>

          <p className="text-center text-sm font-medium text-white/80">
            {BESTIE_STAGES[stage].blurb}
          </p>

          {/* Growth-to-next bar */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-white/80">
              <span>Growth · {growth} pts</span>
              <span>
                {nextStage ? `${growthToNext} more to ${nextStage.name}` : "Fully grown — legend 👑"}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-gradient-to-r from-lime-300 to-emerald-300 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <p className="mt-3 text-center text-xs font-medium text-white/70">
            Complete challenges to grow 🌱
          </p>
        </section>

        {/* Challenges — completing them grows the egg */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
              <span className="text-xl">🌱</span> Weekly challenges
            </h3>
            <button
              onClick={() => setDone([])}
              className="text-xs font-bold text-fuchsia-600 hover:underline dark:text-fuchsia-400"
            >
              Reset
            </button>
          </div>

          <div className="space-y-3">
            {CHALLENGES.map((c) => {
              const isDone = done.includes(c.id);
              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                    isDone
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                      : "border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-xl shadow">
                    {c.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {c.title}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{c.blurb}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                      +{c.growth} 🌱
                    </span>
                    <button
                      onClick={() => toggle(c.id)}
                      className={`rounded-full px-3 py-1 text-xs font-bold shadow active:scale-95 ${
                        isDone
                          ? "bg-emerald-500 text-white"
                          : "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white"
                      }`}
                    >
                      {isDone ? "✓ done" : "Do it"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default BestieHome;
