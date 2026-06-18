"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { DecisionPanel } from "./senior-toolkit-decisions";
import { ActivitiesPanel, EssayPanel } from "./senior-toolkit-essay-activities";
import { DeadlinesPanel, InterviewPanel } from "./senior-toolkit-interview-deadlines";
import {
  countWords,
  daysUntil,
  deadlineSummary,
  findBestValue,
  Metric,
  money,
  netPrice,
  scoreEssay,
  SnapshotRow,
  ToolkitPanel,
  toolTabs,
  useLocalStorageState,
  type Activity,
  type Deadline,
  type Offer,
  type SeniorToolId,
} from "./senior-toolkit-utils";

export type { SeniorToolId } from "./senior-toolkit-utils";

export function SeniorToolkit({ initialTool }: { initialTool: SeniorToolId }) {
  const [activeTool, setActiveTool] = useState<SeniorToolId>(initialTool);
  const [essay, setEssay] = useLocalStorageState("halda.senior.essay", "");
  const [essayPrompt, setEssayPrompt] = useLocalStorageState("halda.senior.essayPrompt", "");
  const [activities, setActivities] = useLocalStorageState<Activity[]>("halda.senior.activities", []);
  const [deadlines, setDeadlines] = useLocalStorageState<Deadline[]>("halda.senior.deadlines", []);
  const [offers, setOffers] = useLocalStorageState<Offer[]>("halda.senior.offers", []);

  const openTool = useCallback((tool: SeniorToolId) => {
    setActiveTool(tool);
    window.history.replaceState(null, "", `/senior?tool=${tool}`);
  }, []);

  const nearestDeadline = useMemo(() => {
    return deadlines
      .filter((deadline) => deadline.date)
      .toSorted((a, b) => daysUntil(a.date) - daysUntil(b.date))[0];
  }, [deadlines]);
  const bestOffer = useMemo(() => findBestValue(offers), [offers]);
  const essayScore = useMemo(() => scoreEssay(essay, essayPrompt), [essay, essayPrompt]);

  return (
    <main className="min-h-screen bg-[#f4f8f8] text-[#172637]">
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)]">
        <SeniorSidebar
          activeTool={activeTool}
          deadlineCount={deadlines.length}
          openTool={openTool}
        />

        <section className="min-w-0 px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
          <SeniorHeader
            activityCount={activities.length}
            essayScore={essay ? essayScore : 0}
            offerCount={offers.length}
          />
          <MobileToolNav activeTool={activeTool} openTool={openTool} />

          <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              {activeTool === "essay" ? (
                <EssayPanel
                  essay={essay}
                  prompt={essayPrompt}
                  score={essayScore}
                  setEssay={setEssay}
                  setPrompt={setEssayPrompt}
                />
              ) : null}
              {activeTool === "activities" ? (
                <ActivitiesPanel activities={activities} setActivities={setActivities} />
              ) : null}
              {activeTool === "interview" ? <InterviewPanel /> : null}
              {activeTool === "deadlines" ? (
                <DeadlinesPanel deadlines={deadlines} setDeadlines={setDeadlines} />
              ) : null}
              {activeTool === "decisions" ? <DecisionPanel offers={offers} setOffers={setOffers} /> : null}
            </div>

            <SeniorSnapshot
              bestOffer={bestOffer}
              essay={essay}
              nearestDeadline={nearestDeadline}
            />
          </section>
        </section>
      </div>
    </main>
  );
}

function SeniorSidebar({
  activeTool,
  deadlineCount,
  openTool,
}: {
  activeTool: SeniorToolId;
  deadlineCount: number;
  openTool: (tool: SeniorToolId) => void;
}) {
  return (
    <aside className="hidden min-h-screen border-r border-[#dbe6e8] bg-[#fbfdfd] px-4 py-5 lg:block">
      <Link className="flex items-center gap-3" href="/">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#193247] text-sm font-semibold text-white">
          h
        </span>
        <span>
          <span className="block font-semibold">halda</span>
          <span className="block text-xs text-[#6b7d8b]">senior toolkit</span>
        </span>
      </Link>

      <nav className="mt-8 grid gap-1">
        {toolTabs.map((tool) => (
          <button
            aria-pressed={activeTool === tool.id}
            className={`rounded-md px-3 py-3 text-left transition ${
              activeTool === tool.id
                ? "bg-[#e5f2ef] text-[#113c3b]"
                : "text-[#607283] hover:bg-[#edf4f4] hover:text-[#193247]"
            }`}
            key={tool.id}
            onClick={() => openTool(tool.id)}
            type="button"
          >
            <span className="block text-sm font-semibold">{tool.label}</span>
            <span className="mt-0.5 block text-xs">{tool.detail}</span>
          </button>
        ))}
      </nav>

      <div className="mt-8 rounded-lg border border-[#dbe6e8] bg-white p-4">
        <div className="text-xs font-medium text-[#6b7d8b]">finish line</div>
        <div className="mt-2 text-lg font-semibold">{deadlineCount} deadline(s)</div>
        <p className="mt-2 text-sm leading-relaxed text-[#607283]">
          essays, activities, interviews, money, and final choice in one senior lane.
        </p>
      </div>
    </aside>
  );
}

function SeniorHeader({
  activityCount,
  essayScore,
  offerCount,
}: {
  activityCount: number;
  essayScore: number;
  offerCount: number;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link className="text-sm font-medium text-[#2a8c84] hover:underline" href="/">
          back to mission control
        </Link>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-[#172637] sm:text-4xl">
          senior application toolkit
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#607283]">
          the deeper workspace halda can send a student to when sms gets too tiny.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric value={essayScore} label="essay score" />
        <Metric value={activityCount} label="activities" />
        <Metric value={offerCount} label="offers" />
      </div>
    </header>
  );
}

function MobileToolNav({
  activeTool,
  openTool,
}: {
  activeTool: SeniorToolId;
  openTool: (tool: SeniorToolId) => void;
}) {
  return (
    <div className="mt-5 grid gap-2 sm:grid-cols-5 lg:hidden">
      {toolTabs.map((tool) => (
        <button
          aria-pressed={activeTool === tool.id}
          className={`rounded-md border px-3 py-2 text-left text-sm transition ${
            activeTool === tool.id
              ? "border-[#2a8c84] bg-[#e5f2ef] text-[#113c3b]"
              : "border-[#dbe6e8] bg-white text-[#607283]"
          }`}
          key={tool.id}
          onClick={() => openTool(tool.id)}
          type="button"
        >
          <span className="block font-semibold">{tool.label}</span>
          <span className="text-xs">{tool.detail}</span>
        </button>
      ))}
    </div>
  );
}

function SeniorSnapshot({
  bestOffer,
  essay,
  nearestDeadline,
}: {
  bestOffer: Offer | null;
  essay: string;
  nearestDeadline: Deadline | undefined;
}) {
  return (
    <ToolkitPanel title="live senior snapshot">
      <div className="grid gap-3">
        <SnapshotRow label="nearest deadline" value={nearestDeadline ? deadlineSummary(nearestDeadline) : "none yet"} />
        <SnapshotRow label="essay draft" value={essay ? `${countWords(essay)} words` : "not started"} />
        <SnapshotRow label="best value" value={bestOffer ? `${bestOffer.school}, ${money(netPrice(bestOffer))}/yr` : "add offers"} />
      </div>
    </ToolkitPanel>
  );
}
