"use client";

import { useState } from "react";
import { Plus, Trash2, Sparkles, Check, Award, Loader2 } from "lucide-react";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { ACTIVITY_TYPES, STORAGE_KEYS, uid, type Activity } from "@/lib/applyTypes";

const MAX = 150;

export function ActivitiesCoach() {
  const [activities, setActivities] = useLocalStorage<Activity[]>(STORAGE_KEYS.activities, []);

  const add = () =>
    setActivities((prev) =>
      prev.length >= 10
        ? prev
        : [
            ...prev,
            { id: uid(), activityType: "", position: "", organization: "", description: "" },
          ],
    );

  const update = (id: string, patch: Partial<Activity>) =>
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const remove = (id: string) => setActivities((prev) => prev.filter((a) => a.id !== id));

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300">
          <Award className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Activities List Coach</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Build your Common App activities list (max 10). Lead with impact, use strong action
            verbs, and quantify results.
          </p>
        </div>
      </header>

      <div className="space-y-4">
        {activities.map((a, i) => (
          <ActivityCard
            key={a.id}
            index={i}
            activity={a}
            onChange={(patch) => update(a.id, patch)}
            onRemove={() => remove(a.id)}
          />
        ))}
      </div>

      {activities.length < 10 ? (
        <button
          onClick={add}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 transition hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-300"
        >
          <Plus className="h-4 w-4" /> Add activity ({activities.length}/10)
        </button>
      ) : (
        <p className="mt-4 text-center text-sm text-slate-400 dark:text-slate-500">
          You've reached the Common App limit of 10 activities.
        </p>
      )}
    </div>
  );
}

function ActivityCard({
  index,
  activity,
  onChange,
  onRemove,
}: {
  index: number;
  activity: Activity;
  onChange: (patch: Partial<Activity>) => void;
  onRemove: () => void;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rewrite, setRewrite] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const remaining = MAX - activity.description.length;
  const over = remaining < 0;

  const enhance = async () => {
    if (!activity.description.trim()) return;
    setLoading(true);
    setFeedback(null);
    setRewrite(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "activity", input: activity.description }),
      });
      const data: { feedback?: string; rewrite?: string } = await res.json();
      setFeedback(data.feedback ?? "");
      setRewrite(data.rewrite ?? null);
    } catch {
      setFeedback("Couldn't reach the enhancer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400">
          {index + 1}
        </span>
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Activity {index + 1}</span>
        <button
          onClick={onRemove}
          aria-label="Remove activity"
          className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-400 dark:text-slate-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300"
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Activity Type">
          <select
            value={activity.activityType}
            onChange={(e) => onChange({ activityType: e.target.value })}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          >
            <option value="">Select type…</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Position / Leadership">
          <input
            value={activity.position}
            onChange={(e) => onChange({ position: e.target.value })}
            placeholder="President, Captain, Founder…"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field label="Organization Name">
          <input
            value={activity.organization}
            onChange={(e) => onChange({ organization: e.target.value })}
            placeholder="Coding Club, Local Food Bank…"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />
        </Field>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Description
          </label>
          <span
            className={`text-xs font-medium tabular-nums ${
              over ? "text-rose-500" : remaining <= 20 ? "text-amber-500" : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {remaining} characters left
          </span>
        </div>
        <textarea
          value={activity.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          aria-invalid={over}
          placeholder="Led 20-member club; built a homework-tracking app used by 300+ students…"
          className={`w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 ${
            over
              ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
              : "border-slate-200 dark:border-slate-600 focus:border-amber-400 focus:ring-amber-100"
          }`}
        />
        {/* Progress bar */}
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className={`h-full rounded-full transition-all ${over ? "bg-rose-400" : "bg-amber-400"}`}
            style={{ width: `${Math.min(100, (activity.description.length / MAX) * 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 pt-4">
        <button
          onClick={enhance}
          disabled={loading || !activity.description.trim()}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-amber-600 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Enhancing…" : "AI Bullet Enhancer"}
        </button>
      </div>

      {feedback && (
        <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{feedback}</p>
          {rewrite && (
            <div className="mt-2 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Enhanced version
              </p>
              <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-200">{rewrite}</p>
              <button
                onClick={() => {
                  onChange({ description: rewrite.slice(0, MAX) });
                  setRewrite(null);
                }}
                className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
              >
                <Check className="h-3.5 w-3.5" /> Use this version
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

export default ActivitiesCoach;
