"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Plus, Trash2, GripVertical, Clock } from "lucide-react";
import { useLocalStorage } from "@/lib/useLocalStorage";
import {
  DEADLINE_STATUSES,
  ROUNDS,
  STORAGE_KEYS,
  uid,
  type ApplicationRound,
  type Deadline,
  type DeadlineStatus,
} from "@/lib/applyTypes";

const COLUMN_ACCENT: Record<DeadlineStatus, string> = {
  "Not Started": "border-t-slate-400",
  "In Progress": "border-t-amber-400",
  Submitted: "border-t-sky-400",
  "Decision Received": "border-t-emerald-400",
};

const ROUND_STYLE: Record<string, string> = {
  ED: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  "ED II": "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  EA: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  REA: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  RD: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  Rolling: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export function DeadlineTracker() {
  const [deadlines, setDeadlines] = useLocalStorage<Deadline[]>(STORAGE_KEYS.deadlines, []);
  const [school, setSchool] = useState("");
  const [round, setRound] = useState<ApplicationRound>("RD");
  const [date, setDate] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  // Tick once a minute so countdowns stay live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const add = () => {
    if (!school.trim() || !date) return;
    setDeadlines((prev) => [
      ...prev,
      { id: uid(), school: school.trim(), round, date, status: "Not Started" },
    ]);
    setSchool("");
    setDate("");
    setRound("RD");
  };

  const move = (id: string, status: DeadlineStatus) =>
    setDeadlines((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  const remove = (id: string) => setDeadlines((prev) => prev.filter((d) => d.id !== id));

  const statusOf = (d: Deadline): DeadlineStatus => d.status ?? "Not Started";

  return (
    <div className="flex h-full flex-col px-6 py-8">
      <header className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Application Deadline Tracker</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Track every school across the finish line. Drag cards between columns as you progress.
          </p>
        </div>
      </header>

      {/* Add form */}
      <div className="mb-5 flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">School</label>
          <input
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="University name"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Type</label>
          <select
            value={round}
            onChange={(e) => setRound(e.target.value as ApplicationRound)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
          >
            {ROUNDS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Deadline</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
        <button
          onClick={add}
          disabled={!school.trim() || !date}
          className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {/* Kanban — on mobile each column snaps to fill the screen so you can't
          stop scrolled halfway between two; desktop shows them side by side. */}
      <div className="flex flex-1 snap-x snap-mandatory gap-4 overflow-auto pb-2 md:snap-none">
        {DEADLINE_STATUSES.map((col) => {
          const cards = deadlines.filter((d) => statusOf(d) === col);
          return (
            <div
              key={col}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || dragId;
                if (id) move(id, col);
                setDragId(null);
              }}
              className={`flex w-[calc(100vw-3rem)] shrink-0 snap-start flex-col rounded-2xl border border-t-4 border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/40 md:w-72 ${COLUMN_ACCENT[col]}`}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">{col}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 shadow-sm dark:bg-slate-700 dark:text-slate-300">
                  {cards.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
                {cards.map((d) => (
                  <KanbanCard
                    key={d.id}
                    deadline={d}
                    onDragStart={(e) => {
                      setDragId(d.id);
                      e.dataTransfer.setData("text/plain", d.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onMove={(s) => move(d.id, s)}
                    onRemove={() => remove(d.id)}
                  />
                ))}
                {cards.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-xs text-slate-300 dark:border-slate-700 dark:text-slate-600">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({
  deadline,
  onDragStart,
  onMove,
  onRemove,
}: {
  deadline: Deadline;
  onDragStart: (e: React.DragEvent) => void;
  onMove: (s: DeadlineStatus) => void;
  onRemove: () => void;
}) {
  const days = daysUntil(deadline.date);
  const countdown =
    days < 0
      ? { text: "Deadline passed", cls: "text-slate-400 dark:text-slate-500" }
      : days === 0
        ? { text: "Due today!", cls: "text-rose-600 font-bold" }
        : days <= 7
          ? { text: `${days} day${days === 1 ? "" : "s"} left`, cls: "text-rose-600 font-semibold" }
          : days <= 30
            ? { text: `${days} days left`, cls: "text-amber-600 font-semibold" }
            : { text: `${days} days left`, cls: "text-slate-500 dark:text-slate-400" };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
        <p className="flex-1 text-sm font-semibold leading-tight text-slate-800 dark:text-slate-100">{deadline.school}</p>
        <button
          onClick={onRemove}
          aria-label="Remove"
          className="text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-rose-500 dark:text-slate-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 pl-5">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ROUND_STYLE[deadline.round] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
          {deadline.round}
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatDate(deadline.date)}</span>
      </div>

      <div className="mt-2 flex items-center gap-1.5 pl-5">
        <Clock className={`h-3.5 w-3.5 ${countdown.cls}`} />
        <span className={`text-xs tabular-nums ${countdown.cls}`}>{countdown.text}</span>
      </div>

      {/* Accessible status control (alternative to drag) */}
      <label className="sr-only" htmlFor={`status-${deadline.id}`}>
        Move {deadline.school} to status
      </label>
      <select
        id={`status-${deadline.id}`}
        value={deadline.status ?? "Not Started"}
        onChange={(e) => onMove(e.target.value as DeadlineStatus)}
        className="mt-2.5 ml-5 w-[calc(100%-1.25rem)] rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 outline-none focus:border-sky-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
      >
        {DEADLINE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

function daysUntil(iso: string): number {
  const target = new Date(iso + "T00:00:00");
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - startOfToday.getTime()) / 86_400_000);
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default DeadlineTracker;
