"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";

interface ChatBotProps {
  /** Returns the current essay text, sent to the API for context. */
  getEssayText: () => string;
  /** Returns the prompt the essay is responding to, sent for context. */
  getPrompt?: () => string;
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const GREETING: ChatMessage = {
  id: "greeting",
  role: "counselor",
  text: "Hi! I'm your essay counselor. Ask me anything — brainstorming a topic, sharpening your hook, structure, tone, or what colleges look for.",
};

/** Docked, collapsible counselor chatbot pinned to the bottom of the page. */
export function ChatBot({ getEssayText, getPrompt }: ChatBotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, sending]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    const writerMsg: ChatMessage = { id: uid(), role: "writer", text };
    const history = [...messages, writerMsg];
    setMessages(history);
    setDraft("");
    setSending(true);
    setOpen(true);
    try {
      const res = await fetch("/api/essay-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essay: getEssayText(),
          prompt: getPrompt?.() ?? "",
          messages: history.filter((m) => m.id !== "greeting"),
        }),
      });
      const data: { reply?: string } = await res.json();
      const reply = (data.reply ?? "").trim();
      if (reply) {
        setMessages((prev) => [...prev, { id: uid(), role: "counselor", text: reply }]);
      }
    } catch (err) {
      console.error("Essay chat failed", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="absolute bottom-5 left-5 z-40 flex flex-col items-start">
      {/* Expanded chat panel — floats above the island */}
      {open && (
        <div className="mb-3 flex h-[26rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm">
              💬
            </span>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Essay Counselor</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-100"
            >
              ✕
            </button>
          </div>

          {/* Conversation */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
            <div className="flex flex-col gap-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={[
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "writer"
                      ? "self-end rounded-br-sm bg-blue-600 text-white"
                      : "self-start rounded-bl-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100",
                  ].join(" ")}
                >
                  {m.text}
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-1 self-start rounded-2xl rounded-bl-sm bg-slate-100 dark:bg-slate-700 px-3 py-2">
                  {["0ms", "150ms", "300ms"].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: d }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-2.5">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Ask anything about your essay…"
                className="min-h-[40px] max-h-32 min-w-0 flex-1 resize-none rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim() || sending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Oval island toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 py-3 pl-3 pr-5 text-white shadow-lg transition hover:from-indigo-700 hover:to-violet-700"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm">
          💬
        </span>
        <span className="text-sm font-semibold">Counselor Chat</span>
      </button>
    </div>
  );
}

export default ChatBot;
