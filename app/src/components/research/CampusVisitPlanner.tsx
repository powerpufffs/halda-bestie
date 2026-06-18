"use client";

import { useMemo, useState } from "react";
import { defaultChecklist, initialVisits, profile, schools, visitPrompts } from "./data";
import { formatDeadline } from "./lib";
import type { CampusVisit, VisitStatus } from "./types";
import { Card, Pill, SectionHeader } from "./ui";

const STATUS_TONE = {
  idea: "neutral",
  planned: "blue",
  scheduled: "violet",
  done: "green",
} as const;

const STATUS_LABEL: Record<VisitStatus, string> = {
  idea: "Idea",
  planned: "Planning",
  scheduled: "Scheduled",
  done: "Visited",
};

function freshVisit(schoolId: string): CampusVisit {
  return {
    schoolId,
    mode: "in_person",
    status: "planned",
    date: "",
    checklist: defaultChecklist.map((label, i) => ({
      id: `c${i}`,
      label,
      done: false,
    })),
  };
}

export function CampusVisitPlanner() {
  const [visits, setVisits] = useState<CampusVisit[]>(initialVisits);
  const [openPrompts, setOpenPrompts] = useState(true);

  const schoolById = useMemo(
    () => Object.fromEntries(schools.map((s) => [s.id, s])),
    [],
  );

  const planned = new Set(visits.map((v) => v.schoolId));
  const prompts = useMemo(() => visitPrompts(profile.intendedMajor), []);

  const update = (schoolId: string, patch: Partial<CampusVisit>) =>
    setVisits((cur) =>
      cur.map((v) => (v.schoolId === schoolId ? { ...v, ...patch } : v)),
    );

  const toggleItem = (schoolId: string, itemId: string) =>
    setVisits((cur) =>
      cur.map((v) =>
        v.schoolId === schoolId
          ? {
              ...v,
              checklist: v.checklist.map((c) =>
                c.id === itemId ? { ...c, done: !c.done } : c,
              ),
            }
          : v,
      ),
    );

  const addVisit = (schoolId: string) =>
    setVisits((cur) => [...cur, freshVisit(schoolId)]);

  const removeVisit = (schoolId: string) =>
    setVisits((cur) => cur.filter((v) => v.schoolId !== schoolId));

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Campus visit planning"
        subtitle="Plan each visit and walk in with questions worth asking."
      />

      <Card>
        <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Add a school to your visit plan
        </p>
        <div className="flex flex-wrap gap-2">
          {schools
            .filter((s) => !planned.has(s.id))
            .map((s) => (
              <button
                key={s.id}
                onClick={() => addVisit(s.id)}
                className="rounded-full border border-black/[.1] px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-white/[.12] dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                + {s.name}
              </button>
            ))}
          {schools.every((s) => planned.has(s.id)) ? (
            <span className="text-sm text-zinc-400">
              All your schools are on the plan.
            </span>
          ) : null}
        </div>
      </Card>

      <div className="space-y-4">
        {visits.map((v) => {
          const school = schoolById[v.schoolId];
          if (!school) return null;
          return (
            <VisitCard
              key={v.schoolId}
              visit={v}
              schoolName={school.name}
              location={`${school.city}, ${school.state}`}
              onUpdate={update}
              onToggle={toggleItem}
              onRemove={removeVisit}
            />
          );
        })}
      </div>

      <Card>
        <button
          onClick={() => setOpenPrompts((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            Questions to ask on a visit
          </span>
          <span className="text-zinc-400">{openPrompts ? "−" : "+"}</span>
        </button>
        <p className="mt-1 text-sm text-zinc-500">
          Tailored to a first-gen {profile.intendedMajor} applicant.
        </p>
        {openPrompts ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {prompts.map((group) => (
              <div key={group.category}>
                <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {group.category}
                </h4>
                <ul className="mt-1.5 space-y-1.5">
                  {group.questions.map((q) => (
                    <li
                      key={q}
                      className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
                    >
                      “{q}”
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function VisitCard({
  visit: v,
  schoolName,
  location,
  onUpdate,
  onToggle,
  onRemove,
}: {
  visit: CampusVisit;
  schoolName: string;
  location: string;
  onUpdate: (schoolId: string, patch: Partial<CampusVisit>) => void;
  onToggle: (schoolId: string, itemId: string) => void;
  onRemove: (schoolId: string) => void;
}) {
  const done = v.checklist.filter((c) => c.done).length;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {schoolName}
            </h3>
            <Pill tone={STATUS_TONE[v.status]}>{STATUS_LABEL[v.status]}</Pill>
          </div>
          <p className="text-sm text-zinc-500">
            {location}
            {v.date ? ` · ${formatDeadline(v.date)}` : " · no date yet"}
          </p>
        </div>
        <button
          onClick={() => onRemove(v.schoolId)}
          className="text-xs text-zinc-400 hover:text-rose-500"
        >
          remove
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(["in_person", "virtual"] as const).map((m) => (
          <button
            key={m}
            onClick={() => onUpdate(v.schoolId, { mode: m })}
            className={`rounded-md px-2.5 py-1 text-xs ${
              v.mode === m
                ? "bg-zinc-200 font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {m === "in_person" ? "In person" : "Virtual"}
          </button>
        ))}
        <input
          type="date"
          aria-label="Visit date"
          value={v.date}
          onChange={(e) =>
            onUpdate(v.schoolId, {
              date: e.target.value,
              status: e.target.value ? "scheduled" : v.status,
            })
          }
          className="rounded-md border border-black/[.1] bg-transparent px-2 py-1 text-xs text-zinc-700 dark:border-white/[.12] dark:text-zinc-300"
        />
        <span className="ml-auto text-xs text-zinc-400">
          {done}/{v.checklist.length} done
        </span>
      </div>

      <ul className="mt-3 space-y-1.5">
        {v.checklist.map((c) => (
          <li key={c.id}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={c.done}
                onChange={() => onToggle(v.schoolId, c.id)}
                className="h-4 w-4 rounded border-zinc-300 accent-sky-600"
              />
              <span
                className={
                  c.done
                    ? "text-zinc-400 line-through"
                    : "text-zinc-700 dark:text-zinc-300"
                }
              >
                {c.label}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Card>
  );
}
