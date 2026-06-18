"use client";

import { useState } from "react";
import { HaldaButton } from "./base-ui";
import {
  daysUntil,
  deadlineStatuses,
  EmptyState,
  formatDate,
  interviewFeedback,
  interviewQuestions,
  nextDeadlineMove,
  rounds,
  Tag,
  ToolkitPanel,
  uid,
  useLocalStorageState,
  type Deadline,
} from "./senior-toolkit-utils";

export function InterviewPanel() {
  const [school, setSchool] = useLocalStorageState("halda.senior.interviewSchool", "dartmouth");
  const [answer, setAnswer] = useLocalStorageState("halda.senior.interviewAnswer", "");
  const [question, setQuestion] = useState("tell me about yourself.");
  const questions = interviewQuestions(school);

  return (
    <ToolkitPanel title="interview prep">
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="grid content-start gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-[#607283]">school</span>
            <input
              className="h-10 min-w-0 rounded-md border border-[#cad8dc] bg-white px-3 text-sm outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
              onChange={(event) => setSchool(event.target.value)}
              value={school}
            />
          </label>

          <div className="rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] p-4">
            <div className="text-sm font-semibold text-[#172637]">question bank</div>
            <div className="mt-3 grid gap-2">
              {questions.map((item) => (
                <button
                  className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                    question === item.question
                      ? "border-[#2a8c84] bg-[#e7f4f1] text-[#113c3b]"
                      : "border-[#dbe6e8] bg-white text-[#536576] hover:border-[#b8ccd1]"
                  }`}
                  key={item.question}
                  onClick={() => setQuestion(item.question)}
                  type="button"
                >
                  {item.question}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] p-4">
            <div className="text-xs font-medium text-[#607283]">current question</div>
            <div className="mt-2 text-lg font-semibold text-[#172637]">{question}</div>
          </div>

          <textarea
            aria-label="interview answer"
            className="min-h-64 resize-y rounded-md border border-[#cad8dc] bg-white px-3 py-3 text-sm leading-6 outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="draft a natural spoken answer here"
            value={answer}
          />

          <div className="rounded-lg border border-[#dbe6e8] bg-white p-4">
            <div className="text-sm font-semibold text-[#172637]">feedback</div>
            <p className="mt-2 text-sm leading-6 text-[#607283]">{interviewFeedback(answer, question)}</p>
          </div>
        </div>
      </div>
    </ToolkitPanel>
  );
}

export function DeadlinesPanel({
  deadlines,
  setDeadlines,
}: {
  deadlines: Deadline[];
  setDeadlines: (value: Deadline[] | ((previous: Deadline[]) => Deadline[])) => void;
}) {
  const [draft, setDraft] = useState<Omit<Deadline, "id">>({
    school: "",
    round: "RD",
    date: "",
    status: "not started",
  });

  const addDeadline = () => {
    if (!draft.school.trim() || !draft.date) return;
    setDeadlines((previous) => [...previous, { ...draft, id: uid(), school: draft.school.trim() }]);
    setDraft({ school: "", round: "RD", date: "", status: "not started" });
  };

  const sorted = deadlines.toSorted((a, b) => daysUntil(a.date) - daysUntil(b.date));

  return (
    <ToolkitPanel title="deadline tracker">
      <div className="grid gap-4">
        <div className="grid gap-3 rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] p-4 md:grid-cols-[minmax(0,1fr)_120px_160px_160px_auto]">
          <input
            aria-label="deadline school"
            className="h-10 rounded-md border border-[#cad8dc] bg-white px-3 text-sm outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
            onChange={(event) => setDraft((previous) => ({ ...previous, school: event.target.value }))}
            placeholder="school"
            value={draft.school}
          />
          <select
            aria-label="deadline round"
            className="h-10 rounded-md border border-[#cad8dc] bg-white px-3 text-sm outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
            onChange={(event) => setDraft((previous) => ({ ...previous, round: event.target.value as Deadline["round"] }))}
            value={draft.round}
          >
            {rounds.map((round) => (
              <option key={round} value={round}>
                {round}
              </option>
            ))}
          </select>
          <input
            aria-label="deadline date"
            className="h-10 rounded-md border border-[#cad8dc] bg-white px-3 text-sm outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
            onChange={(event) => setDraft((previous) => ({ ...previous, date: event.target.value }))}
            type="date"
            value={draft.date}
          />
          <select
            aria-label="deadline status"
            className="h-10 rounded-md border border-[#cad8dc] bg-white px-3 text-sm outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
            onChange={(event) => setDraft((previous) => ({ ...previous, status: event.target.value as Deadline["status"] }))}
            value={draft.status}
          >
            {deadlineStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <HaldaButton disabled={!draft.school.trim() || !draft.date} onClick={addDeadline} type="button">
            add
          </HaldaButton>
        </div>

        {sorted.length === 0 ? (
          <EmptyState text="add a school and deadline. halda can send students here after asking about applications." />
        ) : (
          <div className="grid gap-3">
            {sorted.map((deadline) => (
              <DeadlineRow
                deadline={deadline}
                key={deadline.id}
                onRemove={() => setDeadlines((previous) => previous.filter((item) => item.id !== deadline.id))}
                onStatus={(status) =>
                  setDeadlines((previous) =>
                    previous.map((item) => (item.id === deadline.id ? { ...item, status } : item)),
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </ToolkitPanel>
  );
}

function DeadlineRow({
  deadline,
  onRemove,
  onStatus,
}: {
  deadline: Deadline;
  onRemove: () => void;
  onStatus: (status: Deadline["status"]) => void;
}) {
  const days = daysUntil(deadline.date);
  const urgent = days <= 14 && deadline.status !== "submitted" && deadline.status !== "decision received";

  return (
    <div className="grid gap-3 rounded-lg border border-[#dbe6e8] bg-[#fbfdfd] p-4 md:grid-cols-[minmax(0,1fr)_120px_140px_170px_auto] md:items-center">
      <div>
        <div className="text-sm font-semibold text-[#172637]">{deadline.school}</div>
        <div className="mt-1 text-xs text-[#758694]">{deadline.round} - {formatDate(deadline.date)}</div>
      </div>
      <Tag tone={urgent ? "coral" : "teal"}>{days < 0 ? "passed" : `${days} days`}</Tag>
      <select
        aria-label={`${deadline.school} status`}
        className="h-10 rounded-md border border-[#cad8dc] bg-white px-3 text-sm outline-none transition focus:border-[#2a8c84] focus:ring-2 focus:ring-[#2a8c84]/20"
        onChange={(event) => onStatus(event.target.value as Deadline["status"])}
        value={deadline.status}
      >
        {deadlineStatuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <div className="text-sm text-[#607283]">{nextDeadlineMove(deadline)}</div>
      <button className="text-sm font-medium text-[#a34030] hover:underline" onClick={onRemove} type="button">
        remove
      </button>
    </div>
  );
}
