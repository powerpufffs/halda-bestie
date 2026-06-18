import type { ReactNode } from "react";

export const navItems = ["mission", "schools", "inbox", "crew"];

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
        <div className="flex items-center gap-3 rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] p-4" key={title}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-xs font-semibold text-[#2a8c84] shadow-sm">
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
    <div className="grid gap-3 sm:grid-cols-3">
      {schoolMatches.map((school) => (
        <div className="rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] p-4" key={school.name}>
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
        <div className="rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] p-4 text-sm text-[#536576]" key={update}>
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
      className={`rounded-lg border border-[#dbe6e8] bg-white ${
        compact ? "p-4" : "p-5"
      } shadow-[0_14px_36px_rgba(35,62,76,0.05)]`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[#172637]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums text-[#172637]">{value}</div>
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
      ? "border-[#f0b7ad] bg-[#fff0ee] text-[#8c2f21]"
      : tone === "good"
        ? "border-[#b9ded5] bg-[#edf8f4] text-[#11635d]"
        : "border-[#b9cfec] bg-[#eff6ff] text-[#2d5d90]";

  return <div className={`rounded-lg border px-4 py-3 text-sm ${className}`}>{children}</div>;
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
      ? "bg-[#e7f4f1] text-[#11635d]"
      : tone === "coral"
        ? "bg-[#fff0ee] text-[#a34030]"
        : "bg-[#eef3f4] text-[#607283]";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[#cad8dc] bg-[#fbfdfd] px-4 py-6 text-sm text-[#758694]">
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
