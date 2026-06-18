"use client";

import type { AiSuggestion, SuggestionType } from "@/lib/types";

interface AiEditsSidebarProps {
  suggestions: AiSuggestion[];
  activeId: string | null;
  loading: boolean;
  onFocus: (s: AiSuggestion) => void;
  onAccept: (s: AiSuggestion) => void;
  onReject: (s: AiSuggestion) => void;
}

const TYPE_STYLES: Record<SuggestionType, string> = {
  Grammar: "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300",
  Structure: "bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300",
  Tone: "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

export function AiEditsSidebar({
  suggestions,
  activeId,
  loading,
  onFocus,
  onAccept,
  onReject,
}: AiEditsSidebarProps) {
  const pending = suggestions.filter((s) => s.status === "pending");

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
        ))}
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-slate-400 dark:text-slate-500">
        No pending suggestions. Click{" "}
        <span className="font-medium text-slate-500 dark:text-slate-400">Analyze Essay</span> to get
        feedback from the AI admissions counselor.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {pending.map((s) => (
        <div
          key={s.id}
          onClick={() => onFocus(s)}
          className={[
            "cursor-pointer rounded-lg border bg-white dark:bg-slate-800 p-3 shadow-sm transition",
            s.id === activeId
              ? "border-emerald-400 ring-2 ring-emerald-200"
              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
          ].join(" ")}
        >
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_STYLES[s.type]}`}
          >
            {s.type}
          </span>

          {/* Original */}
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-through decoration-rose-300">
            {s.original}
          </p>

          {/* Suggested revision */}
          <div className="mt-2 rounded-md border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Suggested revision
            </p>
            <p className="mt-0.5 text-sm text-emerald-900 dark:text-emerald-200">
              {s.suggestion ? s.suggestion : <em className="text-emerald-700 dark:text-emerald-300">(remove this text)</em>}
            </p>
          </div>

          {/* Grammar fixes stay brief — no explanation. Only show a note for
              higher-level (Structure/Tone) suggestions where it adds value. */}
          {s.type !== "Grammar" && s.explanation && (
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{s.explanation}</p>
          )}

          <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onAccept(s)}
              className="flex-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => onReject(s)}
              className="flex-1 rounded-md border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AiEditsSidebar;
