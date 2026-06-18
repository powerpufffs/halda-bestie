"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { EssayDraft } from "@/lib/essayDrafts";

interface EssayHomeProps {
  drafts: EssayDraft[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onUpload: (file: File) => void;
  onDelete: (id: string) => void;
  uploading: boolean;
  uploadError: string | null;
  onDismissError: () => void;
}

const UPLOAD_ACCEPT =
  ".txt,.md,.markdown,.text,.pdf,.doc,.docx,.rtf," +
  "text/plain,text/markdown,application/pdf," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword";

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Bucket a timestamp into a date-section label. */
function sectionFor(ts: number): string {
  const startOfDay = (n: number) => {
    const d = new Date(n);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const diff = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "Previous 7 days";
  if (diff < 30) return "Previous 30 days";
  return "Older";
}

const SECTION_ORDER = ["Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"];

function chipFor(draft: EssayDraft): { label: string; cls: string } {
  const label = (draft.format || "essay").toUpperCase();
  const cls =
    label === "PDF"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
      : label === "DOCX" || label === "DOC"
        ? "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
        : label === "ESSAY"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  return { label, cls };
}

export function EssayHome({
  drafts,
  onOpen,
  onCreate,
  onUpload,
  onDelete,
  uploading,
  uploadError,
  onDismissError,
}: EssayHomeProps) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = drafts.filter(
    (d) => !q || d.title.toLowerCase().includes(q) || d.prompt.toLowerCase().includes(q),
  );
  const sorted = [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);

  // Group into date sections, preserving the canonical section order.
  const groups = SECTION_ORDER.map((label) => ({
    label,
    items: sorted.filter((d) => sectionFor(d.updatedAt) === label),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Toolbar */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Essays
          </h1>

          <button
            type="button"
            onClick={onCreate}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New essay
          </button>

          <label
            className={`flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 ${
              uploading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <input
              type="file"
              accept={UPLOAD_ACCEPT}
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onUpload(file);
              }}
              className="hidden"
            />
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Upload"}
          </label>

          {/* Search */}
          <div className="relative w-full sm:ml-auto sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search essays"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Upload error banner */}
        {uploadError && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <span className="flex-1">{uploadError}</span>
            <button
              type="button"
              onClick={onDismissError}
              aria-label="Dismiss"
              className="shrink-0 rounded p-0.5 hover:bg-rose-100 dark:hover:bg-rose-500/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Empty states */}
        {drafts.length === 0 ? (
          <EmptyState onCreate={onCreate} />
        ) : groups.length === 0 ? (
          <p className="mt-16 text-center text-sm text-slate-400 dark:text-slate-500">
            No essays match “{query}”.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.label} className="mb-8">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {group.label}
              </h2>
              <div className="grid grid-cols-1 gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                {group.items.map((draft) => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    onOpen={() => onOpen(draft.id)}
                    onDelete={() => onDelete(draft.id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No essays yet. Start a new one or upload a document.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4" />
        New essay
      </button>
    </div>
  );
}

function DraftCard({
  draft,
  onOpen,
  onDelete,
}: {
  draft: EssayDraft;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const chip = chipFor(draft);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group relative flex h-44 cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
    >
      <div className="flex items-center justify-between">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${chip.cls}`}>
          {chip.label}
        </span>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 focus:opacity-100 group-hover:opacity-100 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onOpen();
                }}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Open
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className="mt-3 line-clamp-3 flex-1 text-base font-bold leading-snug text-slate-800 dark:text-slate-100">
        {draft.title || "Untitled draft"}
      </h3>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <span>Edited {timeAgo(draft.updatedAt)}</span>
        {typeof draft.score === "number" && (
          <>
            <span aria-hidden>·</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{draft.score}/100</span>
          </>
        )}
      </div>
    </div>
  );
}

export default EssayHome;
