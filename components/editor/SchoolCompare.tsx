"use client";

import { useState } from "react";
import { Building2, Loader2, Sparkles, X } from "lucide-react";

interface CompareResult {
  fit: number;
  summary: string;
  tips: string[];
}

interface SchoolCompareProps {
  getEssayText: () => string;
}

function fitColor(fit: number) {
  if (fit >= 78) return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", label: "Strong fit" };
  if (fit >= 58) return { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", label: "Promising" };
  return { text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500", label: "Not yet tailored" };
}

/** "Compare your essay to a school of your choice", shown above the score. */
export function SchoolCompare({ getEssayText }: SchoolCompareProps) {
  const [open, setOpen] = useState(false);
  const [school, setSchool] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [comparedTo, setComparedTo] = useState("");

  const compare = async () => {
    const name = school.trim();
    const essay = getEssayText().trim();
    if (!name || !essay || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/compare-school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essay, school: name }),
      });
      const data: CompareResult = await res.json();
      setResult(data);
      setComparedTo(name);
    } catch {
      setResult({ fit: 0, summary: "Couldn't run the comparison. Please try again.", tips: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
          <Building2 className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Compare to a school</span>
        <span className="ml-auto text-slate-400 dark:text-slate-500">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            See how your essay would land at a specific school, from their admissions officer's view.
          </p>
          <div className="flex gap-2">
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && compare()}
              placeholder="e.g. Stanford"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
            />
            <button
              onClick={compare}
              disabled={!school.trim() || loading}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Compare
            </button>
          </div>

          {result && !loading && <CompareCard result={result} school={comparedTo} onClear={() => setResult(null)} />}
        </div>
      )}
    </div>
  );
}

function CompareCard({
  result,
  school,
  onClear,
}: {
  result: CompareResult;
  school: string;
  onClear: () => void;
}) {
  const c = fitColor(result.fit);
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">vs. {school}</span>
        <button onClick={onClear} aria-label="Clear comparison" className="ml-auto text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {result.fit > 0 && (
        <>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${c.text}`}>{result.fit}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">/ 100</span>
            <span className={`text-xs font-semibold ${c.text}`}>· {c.label}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${result.fit}%` }} />
          </div>
        </>
      )}

      <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{result.summary}</p>

      {result.tips.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {result.tips.map((t, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <span className="text-indigo-400">•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SchoolCompare;
