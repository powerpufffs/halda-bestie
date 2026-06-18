"use client";

import { useState } from "react";
import type { AdviceCategory, ChatMessage, CounselorAdvice } from "@/lib/types";

interface AdviceSidebarProps {
  advice: CounselorAdvice[];
  /** Conversation per advice id (seeded with the counselor's opening question). */
  chats: Record<string, ChatMessage[]>;
  activeId: string | null;
  /** Advice id currently awaiting a counselor reply, if any. */
  sendingId: string | null;
  loading: boolean;
  onFocus: (a: CounselorAdvice) => void;
  onSend: (adviceId: string, text: string) => void;
}

const CATEGORY_STYLES: Record<AdviceCategory, string> = {
  Hook: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Specificity: "bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300",
  Structure: "bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300",
  Voice: "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300",
  Reflection: "bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300",
};

export function AdviceSidebar({
  advice,
  chats,
  activeId,
  sendingId,
  loading,
  onFocus,
  onSend,
}: AdviceSidebarProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
        ))}
      </div>
    );
  }

  if (advice.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-slate-400 dark:text-slate-500">
        No counselor notes yet. Click{" "}
        <span className="font-medium text-slate-500 dark:text-slate-400">Analyze Essay</span> for
        big-picture advice — then chat it through right here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 p-3">
      {advice.map((a) => (
        <AdviceCard
          key={a.id}
          advice={a}
          messages={chats[a.id] ?? []}
          active={a.id === activeId}
          sending={a.id === sendingId}
          onFocus={() => onFocus(a)}
          onSend={(text) => onSend(a.id, text)}
        />
      ))}
    </div>
  );
}

function AdviceCard({
  advice,
  messages,
  active,
  sending,
  onFocus,
  onSend,
}: {
  advice: CounselorAdvice;
  messages: ChatMessage[];
  active: boolean;
  sending: boolean;
  onFocus: () => void;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (!text || sending) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div
      onClick={onFocus}
      className={[
        "cursor-pointer rounded-lg border bg-white dark:bg-slate-800 p-3 shadow-sm transition border-l-4 border-l-amber-400",
        active ? "border-amber-400 ring-2 ring-amber-200" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
      ].join(" ")}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-amber-500 dark:text-amber-300" aria-hidden>•</span>
        {advice.category && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CATEGORY_STYLES[advice.category]}`}
          >
            {advice.category}
          </span>
        )}
        {advice.anchor && (
          <span className="ml-auto text-[11px] font-medium text-amber-600 dark:text-amber-300">Jump to text →</span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{advice.point}</p>

      {/* Coaching chat thread */}
      <div
        className="mt-3 flex flex-col gap-2 border-t border-slate-100 dark:border-slate-700 pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}

        {sending && (
          <div className="flex items-center gap-1 self-start rounded-2xl rounded-bl-sm bg-amber-50 dark:bg-amber-500/10 px-3 py-2">
            <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
          </div>
        )}

        <div className="mt-1 flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Type your answer…"
            className="min-h-[38px] max-h-32 min-w-0 flex-1 resize-none rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim() || sending}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isWriter = message.role === "writer";
  return (
    <div
      className={[
        "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
        isWriter
          ? "self-end rounded-br-sm bg-blue-600 text-white"
          : "self-start rounded-bl-sm bg-amber-50 dark:bg-amber-500/10 text-slate-700 dark:text-slate-100",
      ].join(" ")}
    >
      {!isWriter && (
        <span className="mb-0.5 block text-[11px] font-semibold text-amber-600 dark:text-amber-300">Counselor</span>
      )}
      {message.text}
    </div>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400"
      style={{ animationDelay: delay }}
    />
  );
}

export default AdviceSidebar;
