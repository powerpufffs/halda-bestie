"use client";

import { useState } from "react";
import { Home, Compass, GraduationCap, Sparkles } from "lucide-react";
import { HaldaBestieHome, type NavTab } from "@/components/HaldaBestieHome";
import { ExploreTab } from "@/components/explore/ExploreTab";
import { ResearchTab } from "@/components/research/ResearchTab";

type TabId = "home" | NavTab;

type Tab = {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TABS: Tab[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "research", label: "Research", icon: GraduationCap },
];

const TITLES: Record<TabId, string> = {
  home: "Home",
  explore: "Explore",
  research: "Research",
};

/**
 * The single-page shell that ties the gamified home together with the sophomore
 * Explore + Research tools. Desktop gets a fixed left sidebar; mobile gets a
 * sticky bottom tab bar (Instagram/Duolingo style).
 */
export function AppShell() {
  const [active, setActive] = useState<TabId>("home");

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      {/* Desktop sidebar ------------------------------------------------- */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-lg font-black tracking-tight">Halda Bestie</span>
        </div>

        <nav className="flex flex-col gap-1">
          {TABS.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                  isActive
                    ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <t.icon className="h-5 w-5" />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-white/70">Sophomore track</p>
          <p className="mt-1 text-sm font-semibold leading-snug">
            Explore who you are, then find your fit. 🌱
          </p>
        </div>
      </aside>

      {/* Main column ----------------------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 md:hidden">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-base font-black tracking-tight">{TITLES[active]}</span>
        </header>

        {/* Active tab. pb-24 on mobile leaves room for the bottom nav. */}
        <main className="min-h-0 flex-1 pb-24 md:pb-0">
          {active === "home" && <HaldaBestieHome onNavigate={setActive} />}
          {active === "explore" && <ExploreTab />}
          {active === "research" && <ResearchTab />}
        </main>
      </div>

      {/* Mobile bottom tab bar ------------------------------------------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 md:hidden">
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold transition ${
                isActive
                  ? "text-fuchsia-600 dark:text-fuchsia-400"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              <t.icon className="h-5 w-5" />
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default AppShell;
