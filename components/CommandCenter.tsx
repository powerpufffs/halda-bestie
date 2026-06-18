"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Award,
  Mic,
  CalendarClock,
  Scale,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { EssayWorkspace } from "@/components/EssayWorkspace";
import { ActivitiesCoach } from "@/components/ActivitiesCoach";
import { InterviewPrep } from "@/components/InterviewPrep";
import { DeadlineTracker } from "@/components/DeadlineTracker";
import { DecisionMatrix } from "@/components/DecisionMatrix";
import { ThemeToggle } from "@/components/ThemeToggle";

type TabId = "essay" | "activities" | "interview" | "deadlines" | "decisions";

const TABS: {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "essay", label: "Essay Reviewer", shortLabel: "Essay", icon: FileText },
  { id: "activities", label: "Activities Coach", shortLabel: "Activities", icon: Award },
  { id: "interview", label: "Interview Prep", shortLabel: "Interview", icon: Mic },
  { id: "deadlines", label: "Deadline Tracker", shortLabel: "Deadlines", icon: CalendarClock },
  { id: "decisions", label: "Decision Matrix", shortLabel: "Decisions", icon: Scale },
];

export function CommandCenter() {
  const [active, setActive] = useState<TabId>("essay");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          {/* Sidebar collapse toggle — desktop only; mobile uses the bottom tab bar. */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100 md:flex"
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          {/* Current tool name — shown on mobile where the sidebar is hidden. */}
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 md:hidden">
            {TABS.find((t) => t.id === active)?.label}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Profile />
        </div>
      </header>

      {/* Body: collapsible sidebar + content */}
      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Tools"
          className={`hidden shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-2 transition-[width] duration-200 dark:border-slate-700 dark:bg-slate-800 md:flex ${
            collapsed ? "w-16" : "w-56"
          }`}
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? t.label : undefined}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                  collapsed ? "justify-center" : "",
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white",
                ].join(" ")}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{t.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Panels stay mounted so in-progress work is preserved across tools. */}
        <div className="relative min-h-0 flex-1 bg-slate-50 dark:bg-slate-900">
          <Panel show={active === "essay"} fill>
            <EssayWorkspace />
          </Panel>
          <Panel show={active === "activities"}>
            <ActivitiesCoach />
          </Panel>
          <Panel show={active === "interview"}>
            <InterviewPrep />
          </Panel>
          <Panel show={active === "deadlines"} fill>
            <DeadlineTracker />
          </Panel>
          <Panel show={active === "decisions"}>
            <DecisionMatrix />
          </Panel>
        </div>
      </div>

      {/* Mobile bottom tab bar — replaces the sidebar on small screens. */}
      <nav
        aria-label="Tools"
        className="flex shrink-0 items-stretch justify-around border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-700 dark:bg-slate-800 md:hidden"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] font-semibold transition-colors",
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100",
              ].join(" ")}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="w-full truncate text-center leading-tight">{t.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** Profile menu pinned to the right of the top bar. */
function Profile() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
          AR
        </span>
        <div className="hidden text-left leading-tight sm:block">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Alex Rivera</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">Class of 2026</div>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Alex Rivera</p>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">alex.rivera@email.com</p>
          </div>
          <MenuItem icon={<User className="h-4 w-4" />} label="My Profile" />
          <MenuItem icon={<Settings className="h-4 w-4" />} label="Settings" />
          <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
          <MenuItem icon={<LogOut className="h-4 w-4" />} label="Sign out" danger />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      role="menuitem"
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 ${
        danger ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Keeps a tool mounted but hidden when inactive (preserves editor/scroll state).
 * `fill` tools manage their own height/scroll; others get a scroll container.
 */
function Panel({
  show,
  fill,
  children,
}: {
  show: boolean;
  fill?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${show ? "absolute inset-0" : "hidden"} ${fill ? "" : "overflow-y-auto"}`}>
      {children}
    </div>
  );
}

export default CommandCenter;
