"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type SeniorToolId = "essay" | "activities" | "interview" | "deadlines" | "decisions";

export type Activity = {
  id: string;
  type: string;
  role: string;
  organization: string;
  description: string;
};

export type Deadline = {
  id: string;
  school: string;
  round: "ED" | "ED II" | "EA" | "REA" | "RD" | "Rolling";
  date: string;
  status: "not started" | "in progress" | "submitted" | "decision received";
};

export type Offer = {
  id: string;
  school: string;
  status: "pending" | "accepted" | "waitlisted" | "denied";
  cost: number;
  aid: number;
  fit: number;
  notes: string;
};

export const toolTabs: Array<{ id: SeniorToolId; label: string; detail: string }> = [
  { id: "essay", label: "essay", detail: "draft review" },
  { id: "activities", label: "activities", detail: "150 chars" },
  { id: "interview", label: "interview", detail: "practice" },
  { id: "deadlines", label: "deadlines", detail: "finish line" },
  { id: "decisions", label: "decisions", detail: "aid + fit" },
];

export const activityTypes = [
  "academic",
  "art",
  "athletics",
  "community service",
  "career-oriented",
  "debate / speech",
  "family responsibilities",
  "music",
  "research",
  "robotics",
  "student government",
  "work",
  "other",
];

export const rounds: Deadline["round"][] = ["ED", "ED II", "EA", "REA", "RD", "Rolling"];
export const deadlineStatuses: Deadline["status"][] = ["not started", "in progress", "submitted", "decision received"];
export const offerStatuses: Offer["status"][] = ["pending", "accepted", "waitlisted", "denied"];

export function ToolkitPanel({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-[#dbe6e8] bg-white p-5 shadow-[0_14px_36px_rgba(35,62,76,0.05)]">
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

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "teal" | "coral" }) {
  const className =
    tone === "teal"
      ? "bg-[#e7f4f1] text-[#11635d]"
      : tone === "coral"
        ? "bg-[#fff0ee] text-[#a34030]"
        : "bg-[#eef3f4] text-[#607283]";

  return <span className={`inline-flex w-fit items-center rounded-full px-2 py-1 text-xs font-medium ${className}`}>{children}</span>;
}

export function EmptyState({ action, text }: { action?: ReactNode; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#cad8dc] bg-[#fbfdfd] px-4 py-8 text-center text-sm text-[#758694]">
      <p>{text}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] p-3">
      <div className="text-xs text-[#758694]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#172637]">{value}</div>
    </div>
  );
}

export function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] p-4">
      <div className="text-xs font-medium text-[#607283]">{label}</div>
      <div className="mt-2 text-lg font-semibold text-[#172637]">{value}</div>
    </div>
  );
}

export function useLocalStorageState<T>(key: string, fallback: T): [T, (value: T | ((previous: T) => T)) => void] {
  const [value, setValue] = useState<T>(fallback);
  const [loaded, setLoaded] = useState(false);
  const fallbackRef = useRef(fallback);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) setValue(JSON.parse(raw) as T);
      } catch {
        setValue(fallbackRef.current);
      } finally {
        setLoaded(true);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [key]);

  const update = useCallback((next: T | ((previous: T) => T)) => {
    setValue((previous) => typeof next === "function" ? (next as (previous: T) => T)(previous) : next);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, loaded, value]);

  return [value, update];
}

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export function scoreEssay(text: string, prompt: string): number {
  if (!text.trim()) return 0;

  const words = countWords(text);
  const hasScene = /\b(when|after|before|during|walked|sat|heard|saw|felt|remember)\b/i.test(text);
  const hasReflection = /\b(learned|realized|understood|changed|because|now i|taught me)\b/i.test(text);
  const hasSpecifics = /\d|"|named|called|mrs\.|mr\.|dr\./i.test(text);
  const hasCliche = /\b(passionate|hardworking|ever since i was young|changed my life|from a young age)\b/i.test(text);

  let score = 58;
  if (words >= 250) score += 9;
  else if (words < 120) score -= 10;
  if (hasScene) score += 9;
  if (hasReflection) score += 9;
  if (hasSpecifics) score += 7;
  if (prompt && words < 200) score -= 4;
  if (hasCliche) score -= 10;

  return Math.min(94, Math.max(35, score));
}

export function scoreSummary(score: number): string {
  if (score >= 82) return "strong draft. now sharpen voice, reflection, and school fit.";
  if (score >= 65) return "solid start. add more specific scenes and a clearer so-what.";
  return "early draft. there is raw material here, but it needs a stronger moment and arc.";
}

export function essayAdvice(text: string, prompt: string): string[] {
  if (!text.trim()) {
    return [
      "start with one scene, not your whole life story.",
      "write the messy draft first. polish comes later.",
      "use the prompt as a constraint, not a decoration.",
    ];
  }

  const advice = [
    "open closer to the moment where something actually happens.",
    "swap broad traits for details that only you could write.",
    "make the final third show what changed in how you think or act.",
  ];

  if (prompt) advice.unshift("check that the draft directly answers the prompt before polishing style.");
  if (countWords(text) > 650) advice.push("cut repeated lessons before cutting vivid details.");

  return advice.slice(0, 4);
}

export function coachActivity(description: string): { feedback: string; rewrite?: string } {
  if (!description.trim()) return { feedback: "add a rough bullet first." };

  const tips: string[] = [];
  if (description.length > 150) tips.push(`trim to 150 characters, currently ${description.length}.`);
  if (!/^(led|founded|built|organized|launched|coordinated|designed|directed|mentored|raised|created|managed)\b/i.test(description)) {
    tips.push("start with a strong action verb.");
  }
  if (!/\d/.test(description)) tips.push("add a number if one exists.");
  if (tips.length === 0) tips.push("solid. now make the result even clearer.");

  const cleaned = description.replace(/^(i\s+|we\s+|member of\s+)/i, "").trim();
  const rewrite = /^(led|founded|built|organized|launched|coordinated|designed|directed|mentored|raised|created|managed)\b/i.test(cleaned)
    ? cleaned.slice(0, 150)
    : `led ${cleaned}`.slice(0, 150);

  return { feedback: tips.join(" "), rewrite };
}

export function interviewQuestions(school: string) {
  const name = school.trim() || "the school";
  return [
    { question: "tell me about yourself." },
    { question: `why ${name}?` },
    { question: `what would you contribute to ${name}?` },
    { question: "what do you want to study, and why?" },
    { question: "tell me about a challenge and what changed after it." },
  ];
}

export function interviewFeedback(answer: string, question: string): string {
  const words = countWords(answer);
  if (!answer.trim()) return "draft an answer and halda will check length, directness, and specificity.";
  if (words < 40) return `good start. for "${question}", answer directly, then add a short story so it is not a one-liner.`;
  if (words > 220) return "good material, but it is probably too long spoken out loud. aim for a focused 60 to 90 seconds.";
  return "solid length. now make sure the first sentence answers the question and the last sentence connects back to campus.";
}

export function daysUntil(iso: string): number {
  const target = new Date(`${iso}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function deadlineSummary(deadline: Deadline): string {
  const days = daysUntil(deadline.date);
  return `${deadline.school}, ${days < 0 ? "passed" : `${days} days`}`;
}

export function nextDeadlineMove(deadline: Deadline): string {
  if (deadline.status === "submitted") return "check portal and aid docs";
  if (deadline.status === "decision received") return "compare offer and deposit date";
  if (daysUntil(deadline.date) <= 7) return "finish the smallest unblocker today";
  return "keep it moving before it becomes urgent";
}

export function netPrice(offer: Offer): number {
  return Math.max(0, offer.cost - offer.aid);
}

export function findBestValue(offers: Offer[]): Offer | null {
  const priced = offers.filter((offer) => offer.school.trim() && offer.cost > 0);
  if (priced.length === 0) return null;
  return priced.reduce((best, offer) => (netPrice(offer) < netPrice(best) ? offer : best));
}

export function findTopFit(offers: Offer[]): Offer | null {
  const named = offers.filter((offer) => offer.school.trim());
  if (named.length === 0) return null;
  return named.reduce((best, offer) => (offer.fit > best.fit ? offer : best));
}

export function money(value: number): string {
  return value.toLocaleString(undefined, {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  });
}
