"use client";

import { HaldaButton } from "./base-ui";
import {
  activityTypes,
  coachActivity,
  countWords,
  EmptyState,
  essayAdvice,
  scoreSummary,
  ToolkitPanel,
  uid,
  type Activity,
} from "./senior-toolkit-utils";

export function EssayPanel({
  essay,
  prompt,
  score,
  setEssay,
  setPrompt,
}: {
  essay: string;
  prompt: string;
  score: number;
  setEssay: (value: string) => void;
  setPrompt: (value: string) => void;
}) {
  const words = countWords(essay);
  const advice = essayAdvice(essay, prompt);

  return (
    <ToolkitPanel action={<span className="text-xs text-[#758694]">{words} words</span>} title="essay lab">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-[#607283]">prompt</span>
            <input
              className="h-10 min-w-0 rounded-md border border-[#cad8dc] bg-white px-3 text-sm outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="optional common app or supplemental prompt"
              value={prompt}
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-[#607283]">draft</span>
            <textarea
              className="min-h-96 resize-y rounded-md border border-[#cad8dc] bg-white px-3 py-3 text-sm leading-6 outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
              onChange={(event) => setEssay(event.target.value)}
              placeholder="paste a draft here. halda will score the shape and give admissions-reader notes."
              value={essay}
            />
          </label>
        </div>

        <div className="grid content-start gap-3">
          <div className="rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] p-4">
            <div className="text-xs font-medium text-[#607283]">admissions read</div>
            <div className="mt-2 text-4xl font-semibold tabular-nums text-[#193247]">{essay ? score : "--"}</div>
            <p className="mt-2 text-sm leading-6 text-[#607283]">
              {essay ? scoreSummary(score) : "paste a draft to get a directional read."}
            </p>
          </div>

          <div className="rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] p-4">
            <div className="text-sm font-semibold text-[#172637]">next notes</div>
            <ul className="mt-3 grid gap-3 text-sm leading-6 text-[#607283]">
              {advice.map((item) => (
                <li className="rounded-md bg-white p-3" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </ToolkitPanel>
  );
}

export function ActivitiesPanel({
  activities,
  setActivities,
}: {
  activities: Activity[];
  setActivities: (value: Activity[] | ((previous: Activity[]) => Activity[])) => void;
}) {
  const addActivity = () => {
    setActivities((previous) => [
      ...previous.slice(0, 9),
      { id: uid(), type: "", role: "", organization: "", description: "" },
    ]);
  };

  const updateActivity = (id: string, patch: Partial<Activity>) => {
    setActivities((previous) => previous.map((activity) => (activity.id === id ? { ...activity, ...patch } : activity)));
  };

  return (
    <ToolkitPanel action={<span className="text-xs text-[#758694]">{activities.length}/10</span>} title="activities coach">
      {activities.length === 0 ? (
        <EmptyState
          action={<HaldaButton onClick={addActivity} type="button">add activity</HaldaButton>}
          text="add one activity and tighten it around impact, leadership, and the common app character limit."
        />
      ) : (
        <div className="grid gap-3">
          {activities.map((activity, index) => (
            <ActivityCard
              activity={activity}
              index={index}
              key={activity.id}
              onRemove={() => setActivities((previous) => previous.filter((item) => item.id !== activity.id))}
              onUpdate={(patch) => updateActivity(activity.id, patch)}
            />
          ))}
          {activities.length < 10 ? (
            <HaldaButton className="w-full" onClick={addActivity} tone="outline" type="button">
              add another activity
            </HaldaButton>
          ) : null}
        </div>
      )}
    </ToolkitPanel>
  );
}

function ActivityCard({
  activity,
  index,
  onRemove,
  onUpdate,
}: {
  activity: Activity;
  index: number;
  onRemove: () => void;
  onUpdate: (patch: Partial<Activity>) => void;
}) {
  const remaining = 150 - activity.description.length;
  const coach = coachActivity(activity.description);

  return (
    <div className="rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#172637]">activity {index + 1}</div>
          <div className={`mt-1 text-xs ${remaining < 0 ? "text-[#a34030]" : "text-[#758694]"}`}>
            {remaining} characters left
          </div>
        </div>
        <button className="text-sm font-medium text-[#a34030] hover:underline" onClick={onRemove} type="button">
          remove
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <select
          aria-label={`activity ${index + 1} type`}
          className="h-10 rounded-md border border-[#cad8dc] bg-white px-3 text-sm outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
          onChange={(event) => onUpdate({ type: event.target.value })}
          value={activity.type}
        >
          <option value="">activity type</option>
          {activityTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <input
          aria-label={`activity ${index + 1} role`}
          className="h-10 rounded-md border border-[#cad8dc] bg-white px-3 text-sm outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
          onChange={(event) => onUpdate({ role: event.target.value })}
          placeholder="role"
          value={activity.role}
        />
        <input
          aria-label={`activity ${index + 1} organization`}
          className="h-10 rounded-md border border-[#cad8dc] bg-white px-3 text-sm outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
          onChange={(event) => onUpdate({ organization: event.target.value })}
          placeholder="organization"
          value={activity.organization}
        />
      </div>

      <textarea
        aria-label={`activity ${index + 1} description`}
        className="mt-3 min-h-24 w-full resize-y rounded-md border border-[#cad8dc] bg-white px-3 py-3 text-sm leading-6 outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
        onChange={(event) => onUpdate({ description: event.target.value })}
        placeholder="led 20-member club; built an app used by 300 students"
        value={activity.description}
      />

      {activity.description ? (
        <div className="mt-3 rounded-md bg-white p-3 text-sm leading-6 text-[#607283]">
          <div className="font-semibold text-[#172637]">coach read</div>
          <p className="mt-1">{coach.feedback}</p>
          {coach.rewrite ? (
            <button
              className="mt-2 text-sm font-semibold text-[#11635d] hover:underline"
              onClick={() => onUpdate({ description: coach.rewrite })}
              type="button"
            >
              use rewrite: {coach.rewrite}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
