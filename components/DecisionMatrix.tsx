"use client";

import { Scale, Plus, Trash2, BadgeDollarSign, Star } from "lucide-react";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { STORAGE_KEYS, uid, type Offer } from "@/lib/applyTypes";

export function DecisionMatrix() {
  const [offers, setOffers] = useLocalStorage<Offer[]>(STORAGE_KEYS.offers, []);

  const addColumn = () =>
    setOffers((prev) => [
      ...prev,
      { id: uid(), school: "", status: "Accepted", cost: 0, aid: 0, fitScore: 5, notes: "" },
    ]);
  const update = (id: string, patch: Partial<Offer>) =>
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const remove = (id: string) => setOffers((prev) => prev.filter((o) => o.id !== id));

  const net = (o: Offer) => Math.max(0, o.cost - o.aid);

  const priced = offers.filter((o) => o.cost > 0);
  const bestValueId = priced.length
    ? priced.reduce((m, o) => (net(o) < net(m) ? o : m)).id
    : null;
  const named = offers.filter((o) => o.school.trim() || o.fitScore);
  const topFitId = named.length
    ? offers.reduce((m, o) => (o.fitScore > m.fitScore ? o : m)).id
    : null;

  const bestValue = offers.find((o) => o.id === bestValueId);
  const topFit = offers.find((o) => o.id === topFitId);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Decision &amp; Financial Aid Matrix</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Compare your offers side by side. Net price updates automatically; rate each school's fit.
          </p>
        </div>
      </header>

      {/* Summary tags */}
      {(bestValue?.school?.trim() || topFit?.school?.trim()) && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryTag
            icon={<BadgeDollarSign className="h-5 w-5" />}
            color="emerald"
            label="Best Financial Value"
            value={bestValue?.school?.trim() ? `${bestValue.school} · ${money(net(bestValue))}/yr` : "—"}
          />
          <SummaryTag
            icon={<Star className="h-5 w-5" />}
            color="violet"
            label="Highest Student Satisfaction"
            value={topFit?.school?.trim() ? `${topFit.school} · ${topFit.fitScore}/10 fit` : "—"}
          />
        </div>
      )}

      {offers.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 py-12 text-center dark:border-slate-600">
          <p className="text-sm text-slate-500 dark:text-slate-400">No schools yet. Add the offers you're deciding between.</p>
          <button
            onClick={addColumn}
            className="mx-auto mt-3 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Add a school
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-40 border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                  Metric
                </th>
                {offers.map((o) => (
                  <th
                    key={o.id}
                    className={`min-w-[200px] border-b border-slate-200 px-4 py-3 align-top dark:border-slate-700 ${
                      o.id === bestValueId ? "bg-emerald-50/50 dark:bg-emerald-500/10" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        value={o.school}
                        onChange={(e) => update(o.id, { school: e.target.value })}
                        placeholder="School name"
                        aria-label="School name"
                        className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-500"
                      />
                      <button
                        onClick={() => remove(o.id)}
                        aria-label={`Remove ${o.school || "school"}`}
                        className="mt-1 text-slate-300 hover:text-rose-500 dark:text-slate-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {o.id === bestValueId && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                          Best value
                        </span>
                      )}
                      {o.id === topFitId && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                          Top fit
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="border-b border-slate-200 px-3 py-3 align-top dark:border-slate-700">
                  <button
                    onClick={addColumn}
                    aria-label="Add school"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 transition hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-600 dark:text-slate-500"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <MetricRow label="Total Cost of Attendance" hint="Tuition + room & board">
                {offers.map((o) => (
                  <Cell key={o.id} highlight={o.id === bestValueId}>
                    <MoneyInput value={o.cost} onChange={(v) => update(o.id, { cost: v })} />
                  </Cell>
                ))}
              </MetricRow>

              <MetricRow label="Grants / Scholarships" hint="Money you don't repay">
                {offers.map((o) => (
                  <Cell key={o.id} highlight={o.id === bestValueId}>
                    <MoneyInput value={o.aid} onChange={(v) => update(o.id, { aid: v })} />
                  </Cell>
                ))}
              </MetricRow>

              <MetricRow label="Net Price" hint="Cost − grants (auto)">
                {offers.map((o) => (
                  <Cell key={o.id} highlight={o.id === bestValueId}>
                    <span className="text-base font-bold tabular-nums text-slate-800 dark:text-slate-100">
                      {money(net(o))}
                      <span className="text-xs font-normal text-slate-400 dark:text-slate-500"> / yr</span>
                    </span>
                  </Cell>
                ))}
              </MetricRow>

              <MetricRow label="Personal Fit Score" hint="How well it fits you (1–10)">
                {offers.map((o) => (
                  <Cell key={o.id} highlight={o.id === topFitId}>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={o.fitScore}
                        onChange={(e) => update(o.id, { fitScore: Number(e.target.value) })}
                        aria-label={`Fit score for ${o.school || "school"}`}
                        className="w-full accent-violet-500"
                      />
                      <span className="w-10 shrink-0 text-right text-sm font-bold tabular-nums text-violet-600 dark:text-violet-300">
                        {o.fitScore}/10
                      </span>
                    </div>
                  </Cell>
                ))}
              </MetricRow>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryTag({
  icon,
  color,
  label,
  value,
}: {
  icon: React.ReactNode;
  color: "emerald" | "violet";
  label: string;
  value: string;
}) {
  const styles =
    color === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
      : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300";
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${styles}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/70 dark:bg-white/10">{icon}</div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <tr className="border-b border-slate-100 last:border-0 dark:border-slate-700">
      <th
        scope="row"
        className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50 px-4 py-3 text-left align-middle dark:border-slate-700 dark:bg-slate-800"
      >
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
      </th>
      {children}
      <td className="bg-white dark:bg-slate-800" />
    </tr>
  );
}

function Cell({ highlight, children }: { highlight?: boolean; children: React.ReactNode }) {
  return <td className={`px-4 py-3 align-middle ${highlight ? "bg-emerald-50/40 dark:bg-emerald-500/10" : ""}`}>{children}</td>;
}

function MoneyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center rounded-lg border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 dark:border-slate-600">
      <span className="pl-2.5 text-sm text-slate-400 dark:text-slate-500">$</span>
      <input
        type="number"
        min={0}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder="0"
        className="w-full rounded-lg px-1.5 py-1.5 text-sm tabular-nums outline-none dark:bg-transparent dark:text-slate-100"
      />
    </div>
  );
}

function money(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default DecisionMatrix;
