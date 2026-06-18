"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { WebChatMessage } from "@/lib/web-chat";

export function WebChatWidget({
  enabled,
  initialMessages,
}: {
  enabled: boolean;
  initialMessages: WebChatMessage[];
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { error, messages, sendMessage, status } = useChat<WebChatMessage>({
    id: "halda-web-chat",
    messages: initialMessages,
    transport,
  });
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !enabled || isBusy) return;
    setDraft("");
    sendMessage({
      metadata: { source: "website_chat" },
      text,
    });
  }

  return (
    <section className="mt-4 scroll-mt-6 rounded-[8px] border-2 border-[#17202a] bg-[#fffaf0] p-4 shadow-[5px_5px_0_#17202a]" id="chat">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-[#17202a]">chat with halda</h2>
          <p className="mt-1 text-xs font-semibold text-[#596673]">
            {enabled ? "continues from the same student profile" : "sign in from the text link to continue here"}
          </p>
        </div>
        <span className="rounded-[4px] border-2 border-[#17202a] bg-[#d7eee9] px-2 py-1 text-xs font-bold uppercase tracking-[0.04em] text-[#17202a]">
          web
        </span>
      </div>

      <div
        className="mt-4 grid max-h-[360px] min-h-[260px] gap-3 overflow-y-auto rounded-[8px] border-2 border-[#17202a] bg-[#f4efdf] p-3"
        ref={scrollRef}
      >
        {messages.length === 0 ? (
          <div className="self-end rounded-[8px] border-2 border-[#17202a] bg-[#fffaf0] p-3 text-sm font-medium leading-6 text-[#596673] shadow-[3px_3px_0_#17202a]">
            Ask me what to do next, which schools fit, or what deadlines need attention.
          </div>
        ) : null}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isBusy ? (
          <div className="w-fit rounded-[8px] border-2 border-[#17202a] bg-[#fffaf0] px-3 py-2 text-sm font-semibold text-[#596673] shadow-[3px_3px_0_#17202a]">
            halda is typing
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-[6px] border-2 border-[#17202a] bg-[#f3c7bb] px-3 py-2 text-sm font-semibold text-[#17202a]">
          halda had trouble answering from the web. try once more.
        </p>
      ) : null}

      <form className="mt-3 flex gap-2" onSubmit={submit}>
        <input
          aria-label="message halda"
          className="h-11 min-w-0 flex-1 rounded-[6px] border-2 border-[#17202a] bg-[#fffaf0] px-3 text-sm font-semibold outline-none transition focus:ring-2 focus:ring-[#2a8c84]/30 disabled:bg-[#d8d2c6]"
          disabled={!enabled}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={enabled ? "message halda..." : "finish sms sign in first"}
          value={draft}
        />
        <button
          className="h-11 rounded-[6px] border-2 border-[#17202a] bg-[#17202a] px-4 text-sm font-bold text-[#fffaf0] shadow-[4px_4px_0_#17202a] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-[#9aa9b3]"
          disabled={!enabled || isBusy || draft.trim().length === 0}
          type="submit"
        >
          send
        </button>
      </form>
    </section>
  );
}

function MessageBubble({ message }: { message: WebChatMessage }) {
  const isUser = message.role === "user";
  const text = message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (!text) return null;

  return (
    <div className={`grid ${isUser ? "justify-items-end" : "justify-items-start"}`}>
      <div
        className={`max-w-[82%] rounded-[8px] border-2 border-[#17202a] px-3 py-2 text-sm font-medium leading-6 shadow-[3px_3px_0_#17202a] ${
          isUser
            ? "bg-[#17202a] text-[#fffaf0]"
            : "bg-[#fffaf0] text-[#536576]"
        }`}
      >
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
      {message.metadata?.occurredAt ? (
        <span className="mt-1 text-[11px] font-semibold text-[#796f62]">
          {formatChatTime(message.metadata.occurredAt)}
        </span>
      ) : null}
    </div>
  );
}

function formatChatTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
