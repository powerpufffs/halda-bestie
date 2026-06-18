"use client";

import { useMemo, useState } from "react";
import {
  Flame,
  Zap,
  Trophy,
  Check,
  ChevronRight,
  Sparkles,
  FileText,
  Award,
  Mic,
  CalendarClock,
  Users,
  Gift,
  Lock,
} from "lucide-react";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { Bestie, BESTIE_STAGES, MAX_STAGE, stageForGrowth } from "@/components/Bestie";
import { Stories } from "@/components/Stories";

/** Tabs the home page can deep-link into. */
export type NavTab = "explore" | "research";

type Challenge = {
  id: string;
  title: string;
  blurb: string;
  icon: React.ComponentType<{ className?: string }>;
  goal: number;
  xp: number;
  growth: number;
  tab?: NavTab;
  accent: string; // tailwind gradient classes
};

const CHALLENGES: Challenge[] = [
  {
    id: "interests",
    title: "Find your spark",
    blurb: "Run the interest finder",
    icon: Sparkles,
    goal: 1,
    xp: 60,
    growth: 3,
    tab: "explore",
    accent: "from-fuchsia-500 to-purple-600",
  },
  {
    id: "careers",
    title: "Scope a career",
    blurb: "Explore 1 career path",
    icon: Award,
    goal: 1,
    xp: 40,
    growth: 2,
    tab: "explore",
    accent: "from-amber-400 to-orange-500",
  },
  {
    id: "schools",
    title: "Match a school",
    blurb: "Compare 1 school in Research",
    icon: Mic,
    goal: 1,
    xp: 50,
    growth: 2,
    tab: "research",
    accent: "from-sky-400 to-blue-600",
  },
  {
    id: "scholarship",
    title: "Stack some aid",
    blurb: "Track 1 scholarship",
    icon: CalendarClock,
    goal: 1,
    xp: 30,
    growth: 1,
    tab: "research",
    accent: "from-emerald-400 to-teal-600",
  },
  {
    id: "hype",
    title: "Hype your squad",
    blurb: "Send a friend some love",
    icon: Users,
    goal: 1,
    xp: 25,
    growth: 1,
    accent: "from-rose-400 to-pink-600",
  },
];

type Friend = {
  name: string;
  avatar: string;
  streak: number;
  level: number;
  stage: number;
  online?: boolean;
  // Story content (Instagram-style rail)
  caption: string;
  bg: string;
  art: string;
};

const FRIENDS: Friend[] = [
  { name: "Maya", avatar: "🦊", streak: 34, level: 12, stage: 4, online: true, caption: "interest quiz = DONE 😮‍💨", bg: "from-fuchsia-500 via-purple-600 to-pink-500", art: "✨" },
  { name: "Theo", avatar: "🐧", streak: 21, level: 9, stage: 3, online: true, caption: "career deep-dive grind", bg: "from-sky-500 via-blue-600 to-indigo-600", art: "🎤" },
  { name: "Priya", avatar: "🦋", streak: 12, level: 6, stage: 2, caption: "my bestie hit Lv6 🥹", bg: "from-rose-500 via-fuchsia-500 to-purple-600", art: "🦋" },
  { name: "Leo", avatar: "🐲", streak: 5, level: 4, stage: 1, caption: "found 3 scholarships!!", bg: "from-emerald-500 via-teal-600 to-cyan-600", art: "🎉" },
];

const XP_PER_LEVEL = 150;

type Progress = Record<string, number>;

const DEFAULT_PROGRESS: Progress = {};

export function HaldaBestieHome({ onNavigate }: { onNavigate?: (tab: NavTab) => void }) {
  const [xp, setXp] = useLocalStorage<number>("hb.xp", 90);
  const [streak] = useLocalStorage<number>("hb.streak", 7);
  const [progress, setProgress] = useLocalStorage<Progress>("hb.progress", DEFAULT_PROGRESS);

  const [hearts, setHearts] = useState<number[]>([]);
  const [heartSeq, setHeartSeq] = useState(0);
  const [levelUp, setLevelUp] = useState<{ name: string } | null>(null);
  const [confetti, setConfetti] = useState(false);

  // Derived game state -------------------------------------------------------
  const completed = useMemo(
    () => CHALLENGES.filter((c) => (progress[c.id] ?? 0) >= c.goal),
    [progress]
  );
  const growth = useMemo(
    () => completed.reduce((sum, c) => sum + c.growth, 0),
    [completed]
  );
  const stage = stageForGrowth(growth);
  const nextStage =
    stage < BESTIE_STAGES.length - 1 ? BESTIE_STAGES[stage + 1] : null;
  const growthToNext = nextStage ? nextStage.min - growth : 0;

  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;
  const levelPct = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100);

  const weeklyDone = completed.length;
  const weeklyPct = Math.round((weeklyDone / CHALLENGES.length) * 100);

  // Pet interaction ----------------------------------------------------------
  function pet() {
    const id = heartSeq + 1;
    setHeartSeq(id);
    setHearts((h) => [...h, id]);
    setTimeout(() => setHearts((h) => h.filter((x) => x !== id)), 1100);
  }

  function bump(c: Challenge) {
    const current = progress[c.id] ?? 0;
    if (current >= c.goal) return;
    const next = current + 1;
    const willComplete = next >= c.goal;
    const prevStage = stage;

    setProgress({ ...progress, [c.id]: next });

    if (willComplete) {
      const newXp = xp + c.xp;
      setXp(newXp);
      const newGrowth = growth + c.growth;
      const newStage = stageForGrowth(newGrowth);
      if (newStage > prevStage) {
        setLevelUp({ name: BESTIE_STAGES[newStage].name });
        setConfetti(true);
        setTimeout(() => setConfetti(false), 2200);
        setTimeout(() => setLevelUp(null), 2400);
      }
    }
  }

  function go(tab?: NavTab) {
    if (tab && onNavigate) onNavigate(tab);
  }

  return (
    <div className="relative mx-auto min-h-full w-full max-w-2xl px-4 pb-10 pt-4 sm:px-6">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 overflow-hidden">
        <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-fuchsia-400/30 blur-3xl dark:bg-fuchsia-600/20" />
        <div className="absolute -right-16 top-0 h-56 w-56 rounded-full bg-sky-400/30 blur-3xl dark:bg-sky-600/20" />
      </div>

      {/* Greeting + top stats ------------------------------------------------ */}
      <header className="pop-in flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400">
            Tuesday · let&apos;s lock in
          </p>
          <h1 className="truncate text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Yo, Alex 👋
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatPill
            icon={<Flame className="h-4 w-4 flame-flicker text-orange-500" />}
            value={streak}
            label="streak"
            tone="from-orange-100 to-amber-100 text-orange-700 dark:from-orange-500/20 dark:to-amber-500/20 dark:text-orange-300"
          />
          <StatPill
            icon={<Zap className="h-4 w-4 text-violet-500" />}
            value={`Lv${level}`}
            label={`${xpIntoLevel}/${XP_PER_LEVEL}`}
            tone="from-violet-100 to-fuchsia-100 text-violet-700 dark:from-violet-500/20 dark:to-fuchsia-500/20 dark:text-violet-300"
          />
        </div>
      </header>

      {/* Instagram-style stories rail --------------------------------------- */}
      <section className="pop-in mt-4">
        <Stories friends={FRIENDS} />
      </section>

      {/* Hero — the Halda Bestie -------------------------------------------- */}
      <section className="pop-in mt-4 overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 p-5 shadow-xl shadow-purple-500/20 dark:border-white/10">
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

        {/* Mascot stage */}
        <div className="relative mt-1 flex justify-center">
          {/* floating sparkles */}
          <Sparkles className="sparkle-twinkle absolute left-6 top-2 h-5 w-5 text-yellow-200" />
          <Sparkles className="sparkle-twinkle absolute right-8 top-8 h-4 w-4 text-pink-200" style={{ animationDelay: "0.8s" }} />

          <button
            onClick={pet}
            aria-label="Pet your bestie"
            className="relative h-44 w-44 select-none focus:outline-none sm:h-52 sm:w-52"
          >
            <Bestie stage={stage} className="bestie-bob h-full w-full drop-shadow-2xl" />
            {/* pet hearts */}
            {hearts.map((id) => (
              <span
                key={id}
                className="float-up pointer-events-none absolute left-1/2 top-6 text-2xl"
                style={{ marginLeft: `${(id % 5) * 8 - 16}px` }}
              >
                💜
              </span>
            ))}
          </button>
        </div>

        <p className="text-center text-sm font-medium text-white/80">
          {BESTIE_STAGES[stage].blurb}
        </p>

        {/* Growth-to-next bar */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-white/80">
            <span>Growth</span>
            <span>
              {nextStage
                ? `${growthToNext} more to ${nextStage.name}`
                : "Fully grown — legend 👑"}
            </span>
          </div>
          <Bar pct={nextStage ? Math.min(100, Math.round((growth / nextStage.min) * 100)) : 100} />
        </div>

        <p className="mt-3 text-center text-xs font-medium text-white/70">
          Tap to pet · complete challenges to grow 🌱
        </p>
      </section>

      {/* XP / weekly progress ride along -------------------------------------- */}
      <div className="pop-in mt-4 grid grid-cols-2 gap-3">
        <MiniCard
          icon={<Zap className="h-5 w-5 text-violet-500" />}
          title={`Level ${level}`}
          sub={`${levelPct}% to Lv${level + 1}`}
          pct={levelPct}
          barClass="from-violet-500 to-fuchsia-500"
        />
        <MiniCard
          icon={<Trophy className="h-5 w-5 text-amber-500" />}
          title={`${weeklyDone}/${CHALLENGES.length} weekly`}
          sub={weeklyPct === 100 ? "All done! 🔥" : "challenges done"}
          pct={weeklyPct}
          barClass="from-amber-400 to-orange-500"
        />
      </div>

      {/* Weekly challenges ---------------------------------------------------- */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <span className="text-xl">🌱</span> Weekly challenges
          </h3>
          <span className="text-xs font-semibold text-slate-400">resets in 4d</span>
        </div>

        <div className="space-y-3">
          {CHALLENGES.map((c) => {
            const cur = progress[c.id] ?? 0;
            const done = cur >= c.goal;
            return (
              <div
                key={c.id}
                className={`pop-in flex items-center gap-3 rounded-2xl border p-3 transition ${
                  done
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                    : "border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.accent} text-white shadow`}
                >
                  <c.icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {c.title}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {c.blurb}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${c.accent} transition-all`}
                        style={{ width: `${Math.min(100, (cur / c.goal) * 100)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-slate-400">
                      {Math.min(cur, c.goal)}/{c.goal}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                    <Zap className="h-3 w-3" /> {c.xp}
                  </span>
                  {done ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <Check className="h-4 w-4" /> done
                    </span>
                  ) : (
                    <button
                      onClick={() => (c.tab ? go(c.tab) : bump(c))}
                      className={`flex items-center gap-0.5 rounded-full bg-gradient-to-r ${c.accent} px-3 py-1 text-xs font-bold text-white shadow active:scale-95`}
                    >
                      {c.tab ? "Go" : "Do it"} <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Friend streaks / squad ---------------------------------------------- */}
      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <span className="text-xl">🔥</span> Friend streaks
          </h3>
          <button className="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400">
            See all
          </button>
        </div>

        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {FRIENDS.map((f) => (
            <div
              key={f.name}
              className="pop-in flex w-24 shrink-0 flex-col items-center gap-1 rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-100 to-violet-100 text-2xl dark:from-fuchsia-500/20 dark:to-violet-500/20">
                  {f.avatar}
                </div>
                {f.online && (
                  <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-800" />
                )}
              </div>
              <p className="w-full truncate text-xs font-bold text-slate-900 dark:text-white">
                {f.name}
              </p>
              <span className="flex items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-black text-orange-600 dark:bg-orange-500/20 dark:text-orange-300">
                <Flame className="h-3 w-3" /> {f.streak}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Squad leaderboard --------------------------------------------------- */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Squad leaderboard</h3>
        </div>
        <ul>
          {[
            { name: "Maya", avatar: "🦊", xp: 1820 },
            { name: "Theo", avatar: "🐧", xp: 1340 },
            { name: "You", avatar: "🌟", xp: 900 + xp, me: true },
            { name: "Priya", avatar: "🦋", xp: 760 },
          ]
            .sort((a, b) => b.xp - a.xp)
            .map((row, i) => (
              <li
                key={row.name}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  (row as { me?: boolean }).me
                    ? "bg-violet-50 dark:bg-violet-500/10"
                    : ""
                } ${i > 0 ? "border-t border-slate-50 dark:border-slate-700/50" : ""}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                    i === 0
                      ? "bg-amber-400 text-white"
                      : i === 1
                      ? "bg-slate-300 text-white"
                      : i === 2
                      ? "bg-orange-300 text-white"
                      : "text-slate-400"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="text-xl">{row.avatar}</span>
                <span className="flex-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                  {row.name}
                </span>
                <span className="flex items-center gap-1 text-xs font-black text-violet-600 dark:text-violet-300">
                  <Zap className="h-3.5 w-3.5" /> {row.xp.toLocaleString()}
                </span>
              </li>
            ))}
        </ul>
      </section>

      {/* Rewards shelf ------------------------------------------------------- */}
      <section className="mt-6">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <Gift className="h-5 w-5 text-rose-500" /> Rewards
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { emoji: "🎩", label: "Top hat", unlocked: growth >= 2 },
            { emoji: "🕶️", label: "Shades", unlocked: growth >= 5 },
            { emoji: "🌈", label: "Aura", unlocked: growth >= 8 },
            { emoji: "👑", label: "Crown", unlocked: growth >= 12 },
          ].map((r) => (
            <div
              key={r.label}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border text-center ${
                r.unlocked
                  ? "border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-violet-50 dark:border-fuchsia-500/30 dark:from-fuchsia-500/10 dark:to-violet-500/10"
                  : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
              }`}
            >
              <span className={`text-2xl ${r.unlocked ? "" : "opacity-30 grayscale"}`}>
                {r.unlocked ? r.emoji : <Lock className="h-5 w-5 text-slate-400" />}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {r.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Level-up celebration overlay --------------------------------------- */}
      {levelUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 backdrop-blur-sm">
          <div className="celebrate w-full max-w-xs rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-600 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-2 h-28 w-28">
              <Bestie stage={stage} className="h-full w-full" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">
              Your bestie grew!
            </p>
            <p className="text-2xl font-black text-white">{levelUp.name} 🎉</p>
          </div>
        </div>
      )}

      {confetti && <Confetti />}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Small building blocks                                                   */
/* ---------------------------------------------------------------------- */

function StatPill({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  tone: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-2xl bg-gradient-to-br px-2.5 py-1.5 ${tone}`}
    >
      {icon}
      <div className="leading-none">
        <div className="text-sm font-black">{value}</div>
        <div className="text-[9px] font-semibold uppercase opacity-70">{label}</div>
      </div>
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/25">
      <div
        className="h-full rounded-full bg-gradient-to-r from-lime-300 to-emerald-300 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
      <div className="bar-shine absolute inset-y-0 left-0 w-1/3 bg-white/40 blur-sm" />
    </div>
  );
}

function MiniCard({
  icon,
  title,
  sub,
  pct,
  barClass,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  pct: number;
  barClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-black text-slate-900 dark:text-white">{title}</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barClass} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] font-semibold text-slate-400">{sub}</p>
    </div>
  );
}

/** Lightweight CSS confetti — no dependency. */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 10) * 0.12,
        dur: 1.6 + (i % 5) * 0.25,
        color: ["#f472b6", "#a78bfa", "#fbbf24", "#34d399", "#60a5fa"][i % 5],
        size: 7 + (i % 3) * 3,
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-fall absolute top-0"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.4,
            background: p.color,
            borderRadius: 2,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

export default HaldaBestieHome;
