import type { ReactNode } from "react";

export const navItems = ["mission", "schools", "inbox", "chat"];

export const quickActions = [
  { label: "find likely schools", detail: "starter list", tone: "teal" },
  { label: "clean up deadlines", detail: "inbox scan", tone: "gold" },
  { label: "ask about money", detail: "aid planner", tone: "coral" },
];

export const schoolMatches = [
  { name: "Dartmouth", fit: "reach", signal: "strong writing" },
  { name: "University of Utah", fit: "target", signal: "honors route" },
  { name: "BYU", fit: "target", signal: "cost edge" },
];

export const crewUpdates = [
  "kai finished fafsa prep",
  "maya added 4 target schools",
  "jonah needs essay feedback",
];

export function MissionPanel() {
  return (
    <div className="grid gap-3">
      {[
        ["week 1", "pick 2 majors to compare", "active"],
        ["week 2", "build a 12 school starter list", "next"],
        ["week 3", "decide test plan", "queued"],
      ].map(([time, title, state]) => (
        <div className="flex items-center gap-3 rounded-[8px] border-2 border-[#17202a] bg-[#fffaf0] p-4 shadow-[3px_3px_0_#17202a]" key={title}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[6px] border-2 border-[#17202a] bg-[#d7eee9] text-xs font-bold text-[#17202a]">
            {time}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-xs text-[#758694]">{state}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SchoolPanel() {
  return (
    <div className="grid gap-3">
      {schoolMatches.map((school) => (
        <div className="rounded-[8px] border-2 border-[#17202a] bg-[#fffaf0] p-4 shadow-[3px_3px_0_#17202a]" key={school.name}>
          <div className="text-sm font-semibold">{school.name}</div>
          <div className="mt-1 text-xs text-[#758694]">{school.signal}</div>
          <div className="mt-4">
            <Tag tone={school.fit === "reach" ? "coral" : "teal"}>{school.fit}</Tag>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CrewPanel() {
  return (
    <div className="grid gap-3">
      {crewUpdates.map((update) => (
        <div className="rounded-[8px] border-2 border-[#17202a] bg-[#fffaf0] p-4 text-sm font-medium text-[#536576] shadow-[3px_3px_0_#17202a]" key={update}>
          {update}
        </div>
      ))}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  compact = false,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={`rounded-[8px] border-2 border-[#17202a] bg-[#fffaf0] ${
        compact ? "p-4" : "p-5"
      } shadow-[5px_5px_0_#17202a]`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-[#17202a]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[8px] border-2 border-[#17202a] bg-[#f4efdf] px-4 py-3 shadow-[3px_3px_0_#17202a]">
      <div className="text-2xl font-bold tabular-nums text-[#17202a]">{value}</div>
      <div className="text-xs text-[#758694]">{label}</div>
    </div>
  );
}

export function Status({
  tone,
  children,
}: {
  tone: "bad" | "good" | "info";
  children: ReactNode;
}) {
  const className =
    tone === "bad"
      ? "border-[#17202a] bg-[#f3c7bb] text-[#17202a]"
      : tone === "good"
        ? "border-[#17202a] bg-[#d7eee9] text-[#17202a]"
        : "border-[#17202a] bg-[#dce8f5] text-[#17202a]";

  return <div className={`rounded-[8px] border-2 px-4 py-3 text-sm font-semibold shadow-[3px_3px_0_#17202a] ${className}`}>{children}</div>;
}

export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "teal" | "coral";
}) {
  const className =
    tone === "teal"
      ? "border-[#17202a] bg-[#d7eee9] text-[#17202a]"
      : tone === "coral"
        ? "border-[#17202a] bg-[#f3c7bb] text-[#17202a]"
        : "border-[#17202a] bg-[#e7e0d4] text-[#17202a]";

  return (
    <span className={`inline-flex items-center rounded-[4px] border-2 px-2 py-1 text-xs font-bold uppercase tracking-[0.04em] ${className}`}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[8px] border-2 border-dashed border-[#17202a] bg-[#f4efdf] px-4 py-6 text-sm font-medium text-[#596673]">
      {children}
    </div>
  );
}

export function formatLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export function stringifyExtraction(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "saved action item";
  }
}

export function formatDate(value: Date | string | null): string {
  if (!value) return "never";
  return new Date(value).toLocaleString();
}
