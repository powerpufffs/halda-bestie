"use client";

interface ScoreGaugeProps {
  /** 1-100, or null before the essay has been analyzed. */
  score: number | null;
  summary?: string;
  loading?: boolean;
}

function colorFor(score: number): { ring: string; text: string; label: string } {
  if (score >= 80) return { ring: "#10b981", text: "text-emerald-600", label: "Strong" };
  if (score >= 60) return { ring: "#f59e0b", text: "text-amber-600", label: "Solid" };
  return { ring: "#ef4444", text: "text-rose-600", label: "Needs work" };
}

export function ScoreGauge({ score, summary, loading }: ScoreGaugeProps) {
  const R = 26;
  const C = 2 * Math.PI * R;
  const pct = score != null ? Math.min(100, Math.max(0, score)) / 100 : 0;
  const c = score != null ? colorFor(score) : null;

  return (
    <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
      <div className="relative h-16 w-16 shrink-0">
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
          <circle cx="32" cy="32" r={R} fill="none" stroke="#e2e8f0" strokeWidth="6" />
          {score != null && (
            <circle
              cx="32"
              cy="32"
              r={R}
              fill="none"
              stroke={c!.ring}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {loading ? (
            <span className="text-xs text-slate-400 dark:text-slate-500">…</span>
          ) : score != null ? (
            <span className={`text-lg font-bold ${c!.text}`}>{score}</span>
          ) : (
            <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Essay Score</h2>
          {score != null && <span className="text-xs text-slate-400 dark:text-slate-500">/ 100</span>}
          {c && <span className={`text-xs font-medium ${c.text}`}>· {c.label}</span>}
        </div>
        <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">
          {loading
            ? "Scoring your essay…"
            : score != null
              ? summary || "Based on voice, specificity, structure, and mechanics."
              : "Click Analyze Essay to get your score."}
        </p>
      </div>
    </div>
  );
}

export default ScoreGauge;
