"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ClipboardList, Pencil, X } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";

import { ActiveHighlight } from "./editor/extensions/ActiveHighlight";
import { SuggestionUnderlines } from "./editor/extensions/SuggestionUnderlines";
import { Toolbar } from "./editor/Toolbar";
import { AiEditsSidebar } from "./editor/AiEditsSidebar";
import { AdviceSidebar } from "./editor/AdviceSidebar";
import { ChatBot } from "./editor/ChatBot";
import { ScoreGauge } from "./editor/ScoreGauge";
import { SchoolCompare } from "./editor/SchoolCompare";
import { findTextRange } from "@/lib/findText";
import type { EssayDraft } from "@/lib/essayDrafts";
import type {
  AiSuggestion,
  AnalyzePayload,
  ChatMessage,
  CounselorAdvice,
} from "@/lib/types";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/** Word + character counts from the editor's plain text. */
function countText(text: string): { words: number; chars: number } {
  const trimmed = text.trim();
  return {
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    chars: text.length,
  };
}

interface EssayEditorProps {
  /** The draft being edited. Switching drafts remounts via a `key`. */
  draft: EssayDraft;
  /** Return to the drafts home page. */
  onBack: () => void;
  /** Persist changes back to this draft (debounced by the caller's store). */
  onSave: (patch: Partial<EssayDraft>) => void;
}

export default function EssayEditor({ draft, onBack, onSave }: EssayEditorProps) {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [advice, setAdvice] = useState<CounselorAdvice[]>([]);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [sendingChatId, setSendingChatId] = useState<string | null>(null);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  const [activeAdviceId, setActiveAdviceId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [counts, setCounts] = useState({ words: 0, chars: 0 });
  const [score, setScore] = useState<number | null>(null);
  const [scoreSummary, setScoreSummary] = useState("");

  /* --- Title + essay prompt (both saved per-draft) ------------------------ */
  const [title, setTitle] = useState(draft.title);
  const [essayPrompt, setEssayPrompt] = useState(draft.prompt);
  // Ask for a prompt up front only on a fresh, empty draft.
  const [promptModalOpen, setPromptModalOpen] = useState(
    !draft.prompt && !draft.contentHtml,
  );

  const savePrompt = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setEssayPrompt(trimmed);
      onSave({ prompt: trimmed });
      setPromptModalOpen(false);
    },
    [onSave],
  );

  /* --- Mobile-only floating island anchored to a tapped underline --------- */
  const [island, setIsland] = useState<{
    kind: "suggestion" | "advice";
    id: string;
    anchor: { top: number; bottom: number; left: number };
  } | null>(null);
  const [islandPos, setIslandPos] = useState<{ top: number; left: number } | null>(null);
  const islandRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false, // required for Next.js SSR
    extensions: [StarterKit, Underline, ActiveHighlight, SuggestionUnderlines],
    content: draft.contentHtml || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[60vh] px-5 py-6 md:px-10 md:py-8",
      },
    },
    onCreate: ({ editor }) => setCounts(countText(editor.getText())),
    onUpdate: ({ editor }) => setCounts(countText(editor.getText())),
  });

  // Persist edits back to the draft (debounced) so the home list stays current.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        onSave({
          contentHtml: editor.getHTML(),
          words: countText(editor.getText()).words,
          updatedAt: Date.now(),
        });
      }, 700);
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [editor, onSave]);

  /* ------- Single source of truth for the transient highlight --------- */
  useEffect(() => {
    if (!editor) return;

    if (activeSuggestionId) {
      const s = suggestions.find((x) => x.id === activeSuggestionId);
      const range = s ? findTextRange(editor, s.original) : null;
      if (range) {
        editor.commands.setActiveHighlight({ ...range, variant: "suggestion" });
        editor.chain().setTextSelection(range.from).scrollIntoView().run();
        return;
      }
    } else if (activeAdviceId) {
      const a = advice.find((x) => x.id === activeAdviceId);
      const range = a?.anchor ? findTextRange(editor, a.anchor) : null;
      if (range) {
        editor.commands.setActiveHighlight({ ...range, variant: "comment" });
        editor.chain().setTextSelection(range.from).scrollIntoView().run();
        return;
      }
    }
    editor.commands.setActiveHighlight(null);
  }, [editor, activeSuggestionId, activeAdviceId, suggestions, advice]);

  /* ---- Persistent color-coded underlines: green grammar, yellow advice ---- */
  useEffect(() => {
    if (!editor) return;
    const grammarItems = suggestions
      .filter((s) => s.status === "pending")
      .map((s) => ({
        id: s.id,
        original: s.original,
        variant: s.type === "Grammar" ? ("grammar" as const) : ("content" as const),
      }));
    const adviceItems = advice
      .filter((a) => !!a.anchor)
      .map((a) => ({
        id: a.id,
        original: a.anchor as string,
        variant: "content" as const, // yellow
      }));
    editor.commands.setSuggestionUnderlines([...grammarItems, ...adviceItems]);
  }, [editor, suggestions, advice]);

  /* --------------------------- AI Suggestions --------------------------- */

  const handleAnalyze = useCallback(async () => {
    if (!editor) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editor.getText(), prompt: essayPrompt }),
      });
      const data: Partial<AnalyzePayload> = await res.json();
      setSuggestions(
        (data.suggestions ?? []).map((s) => ({ ...s, id: uid(), status: "pending" as const })),
      );
      const adviceWithIds: CounselorAdvice[] = (data.advice ?? []).map((a) => ({
        ...a,
        id: uid(),
      }));
      setAdvice(adviceWithIds);
      // Seed each advice thread with the counselor's opening question.
      const seeded: Record<string, ChatMessage[]> = {};
      for (const a of adviceWithIds) {
        seeded[a.id] = a.question
          ? [{ id: uid(), role: "counselor", text: a.question }]
          : [];
      }
      setChats(seeded);
      const newScore = typeof data.score === "number" ? data.score : null;
      setScore(newScore);
      setScoreSummary(data.scoreSummary ?? "");
      setActiveSuggestionId(null);
      setActiveAdviceId(null);
      // Cache the score on the draft so its home card shows it.
      onSave({ score: newScore, updatedAt: Date.now() });
    } catch (err) {
      console.error("Analyze failed", err);
    } finally {
      setAnalyzing(false);
    }
  }, [editor, essayPrompt, onSave]);

  const focusSuggestion = useCallback((s: AiSuggestion) => {
    setActiveSuggestionId(s.id);
    setActiveAdviceId(null);
  }, []);

  const focusAdvice = useCallback((a: CounselorAdvice) => {
    setActiveAdviceId(a.id);
    setActiveSuggestionId(null);
  }, []);

  const handleSendChat = useCallback(
    async (adviceId: string, text: string) => {
      const a = advice.find((x) => x.id === adviceId);
      const writerMsg: ChatMessage = { id: uid(), role: "writer", text };
      const history = [...(chats[adviceId] ?? []), writerMsg];

      setChats((prev) => ({ ...prev, [adviceId]: history }));
      setSendingChatId(adviceId);
      try {
        const res = await fetch("/api/counselor-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: essayPrompt,
            point: a?.point,
            question: a?.question,
            anchor: a?.anchor,
            messages: history,
          }),
        });
        const data: { reply?: string } = await res.json();
        const reply = (data.reply ?? "").trim();
        if (reply) {
          setChats((prev) => ({
            ...prev,
            [adviceId]: [
              ...(prev[adviceId] ?? []),
              { id: uid(), role: "counselor", text: reply },
            ],
          }));
        }
      } catch (err) {
        console.error("Counselor chat failed", err);
      } finally {
        setSendingChatId(null);
      }
    },
    [advice, chats, essayPrompt],
  );

  const acceptSuggestion = useCallback(
    (s: AiSuggestion) => {
      if (editor) {
        const range = findTextRange(editor, s.original);
        if (range) {
          if (s.suggestion) {
            editor.chain().focus().insertContentAt(range, s.suggestion).run();
          } else {
            editor.chain().focus().deleteRange(range).run();
          }
        }
      }
      setSuggestions((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, status: "accepted" } : x)),
      );
      setActiveSuggestionId((cur) => (cur === s.id ? null : cur));
    },
    [editor],
  );

  const rejectSuggestion = useCallback((s: AiSuggestion) => {
    setSuggestions((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, status: "rejected" } : x)),
    );
    setActiveSuggestionId((cur) => (cur === s.id ? null : cur));
  }, []);

  /* ----- Tap an underline → open the mobile floating island (≤ md only) ---- */
  const closeIsland = useCallback(() => {
    setIsland(null);
    setActiveSuggestionId(null);
    setActiveAdviceId(null);
  }, []);

  const handleEditorPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Island is a mobile affordance; on desktop the sidebar already shows everything.
      if (!window.matchMedia("(max-width: 767px)").matches) return;
      const hit = (e.target as HTMLElement).closest("[data-sug-id]");
      if (!hit) {
        if (island) closeIsland();
        return;
      }
      const id = hit.getAttribute("data-sug-id")!;
      const rect = hit.getBoundingClientRect();
      const anchor = { top: rect.top, bottom: rect.bottom, left: rect.left };
      const s = suggestions.find((x) => x.id === id && x.status === "pending");
      if (s) {
        focusSuggestion(s);
        setIsland({ kind: "suggestion", id, anchor });
        return;
      }
      const a = advice.find((x) => x.id === id);
      if (a) {
        focusAdvice(a);
        setIsland({ kind: "advice", id, anchor });
      }
    },
    [island, suggestions, advice, focusSuggestion, focusAdvice, closeIsland],
  );

  // Close the island on accept/reject of the suggestion it's showing.
  const acceptFromIsland = useCallback(
    (s: AiSuggestion) => {
      acceptSuggestion(s);
      closeIsland();
    },
    [acceptSuggestion, closeIsland],
  );
  const rejectFromIsland = useCallback(
    (s: AiSuggestion) => {
      rejectSuggestion(s);
      closeIsland();
    },
    [rejectSuggestion, closeIsland],
  );

  // Position the island next to its anchor, flipping above when there's no room
  // below and clamping to the viewport (leaving space for the bottom tab bar).
  useLayoutEffect(() => {
    if (!island || !islandRef.current) {
      setIslandPos(null);
      return;
    }
    const el = islandRef.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;
    const gap = 8;
    const bottomReserve = 76; // clear the mobile bottom tab bar
    const left = Math.min(Math.max(island.anchor.left, margin), vw - w - margin);
    let top = island.anchor.bottom + gap;
    if (top + h > vh - bottomReserve) {
      const above = island.anchor.top - gap - h;
      top = above >= margin ? above : Math.max(margin, vh - bottomReserve - h);
    }
    setIslandPos({ top, left });
  }, [island, activeSuggestionId, activeAdviceId, chats, sendingChatId, suggestions]);

  // Close the island when the editor scrolls (the anchor would drift away).
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!island) return;
    const node = scrollRef.current;
    if (!node) return;
    const onScroll = () => closeIsland();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [island, closeIsland]);

  const islandSuggestion =
    island?.kind === "suggestion" ? suggestions.find((s) => s.id === island.id) ?? null : null;
  const islandAdvice =
    island?.kind === "advice" ? advice.find((a) => a.id === island.id) ?? null : null;

  /* ------------------------------- Render ------------------------------- */

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;

  return (
    <div className="relative flex h-full flex-col bg-slate-50 dark:bg-slate-900">
      <Toolbar editor={editor} />

      {/* Draft header: back to all essays + editable title. */}
      <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to all essays"
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">All essays</span>
        </button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => onSave({ title: title.trim() || "Untitled draft" })}
          placeholder="Untitled draft"
          aria-label="Essay title"
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none hover:border-slate-200 focus:border-indigo-400 dark:text-slate-100 dark:placeholder-slate-500 dark:hover:border-slate-700"
        />
      </div>

      {/* Prompt bar: the essay prompt gives the AI context. */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
        <button
          type="button"
          onClick={() => setPromptModalOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-left text-sm transition hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50"
        >
          <ClipboardList className="h-4 w-4 shrink-0 text-indigo-500" />
          <span className={`min-w-0 flex-1 truncate ${essayPrompt ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}`}>
            {essayPrompt || "Add the essay prompt for sharper feedback"}
          </span>
          <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* pb on mobile reserves a strip for the floating islands so they sit
            below the editor instead of over it; the editor scrolls internally. */}
        <main className="flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto" onPointerDown={handleEditorPointerDown}>
            <div className="mx-auto mt-6 mb-6 max-w-3xl px-3 md:my-8 md:px-0">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                <EditorContent editor={editor} />
              </div>
              <div className="mt-2 px-1 text-xs text-slate-400 dark:text-slate-500">
                {counts.words} {counts.words === 1 ? "word" : "words"} · {counts.chars}{" "}
                characters
              </div>
            </div>
          </div>
        </main>

        <aside className="hidden w-[360px] shrink-0 flex-col border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 md:flex">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SchoolCompare getEssayText={() => editor?.getText() ?? ""} />
            <ScoreGauge score={score} summary={scoreSummary} loading={analyzing} />

            <CollapsibleSection title="Grammar Edits" count={pendingCount} accent="emerald" defaultOpen>
              <AiEditsSidebar
                suggestions={suggestions}
                activeId={activeSuggestionId}
                loading={analyzing}
                onFocus={focusSuggestion}
                onAccept={acceptSuggestion}
                onReject={rejectSuggestion}
              />
            </CollapsibleSection>

            <CollapsibleSection title="Counselor Advice" count={advice.length} accent="yellow" defaultOpen>
              <AdviceSidebar
                advice={advice}
                chats={chats}
                activeId={activeAdviceId}
                sendingId={sendingChatId}
                loading={analyzing}
                onFocus={focusAdvice}
                onSend={handleSendChat}
              />
            </CollapsibleSection>
          </div>

          {/* Primary action — anchored to the bottom-right of the suggestions. */}
          <div className="flex justify-end border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-4 py-3 backdrop-blur">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing || !editor}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {analyzing ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
                  </svg>
                  Analyzing…
                </>
              ) : (
                <>✨ Analyze Essay</>
              )}
            </button>
          </div>
        </aside>
      </div>

      <ChatBot getEssayText={() => editor?.getText() ?? ""} getPrompt={() => essayPrompt} />

      {/* Mobile-only Analyze button — the desktop one lives in the hidden sidebar. */}
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={analyzing || !editor}
        className="absolute bottom-5 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-60 md:hidden"
      >
        {analyzing ? (
          <>
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
            </svg>
            Analyzing…
          </>
        ) : (
          <>✨ Analyze</>
        )}
      </button>

      {/* Mobile-only floating island for the tapped suggestion / advice. */}
      {island && (islandSuggestion || islandAdvice) && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            onPointerDown={closeIsland}
            aria-hidden
          />
          <div
            ref={islandRef}
            role="dialog"
            aria-label={island.kind === "suggestion" ? "Suggestion" : "Counselor note"}
            style={islandPos ? { top: islandPos.top, left: islandPos.left } : undefined}
            className={[
              "fixed z-50 w-[20rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl md:hidden",
              islandPos ? "opacity-100" : "pointer-events-none opacity-0",
            ].join(" ")}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {island.kind === "suggestion" ? "Suggested edit" : "Counselor note"}
              </span>
              <button
                type="button"
                onClick={closeIsland}
                aria-label="Close"
                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {island.kind === "suggestion" && islandSuggestion && (
                <AiEditsSidebar
                  suggestions={[islandSuggestion]}
                  activeId={activeSuggestionId}
                  loading={false}
                  onFocus={focusSuggestion}
                  onAccept={acceptFromIsland}
                  onReject={rejectFromIsland}
                />
              )}
              {island.kind === "advice" && islandAdvice && (
                <AdviceSidebar
                  advice={[islandAdvice]}
                  chats={chats}
                  activeId={activeAdviceId}
                  sendingId={sendingChatId}
                  loading={false}
                  onFocus={focusAdvice}
                  onSend={handleSendChat}
                />
              )}
            </div>
          </div>
        </>
      )}

      {promptModalOpen && (
        <PromptModal
          initialValue={essayPrompt}
          onSave={savePrompt}
          onClose={() => setPromptModalOpen(false)}
        />
      )}
    </div>
  );
}

/** Modal that asks for (or edits) the prompt the essay is responding to. */
function PromptModal({
  initialValue,
  onSave,
  onClose,
}: {
  initialValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Essay prompt"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-700 px-5 py-4">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">What&apos;s the essay prompt?</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Paste the question your essay is answering so the counselor can judge how well you
              respond to it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            placeholder="e.g. Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. Share your story."
            className="w-full resize-none rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-100 dark:placeholder-slate-500 outline-none focus:border-indigo-400"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700 px-5 py-3">
          <button
            type="button"
            onClick={() => onSave("")}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={() => onSave(value)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Save prompt
          </button>
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  count,
  accent,
  defaultOpen = true,
  children,
}: {
  title: string;
  count: number;
  accent: "emerald" | "yellow";
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const dot = accent === "yellow" ? "bg-yellow-400" : "bg-emerald-500";

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="sticky top-0 z-[5] flex w-full items-center gap-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50/95 dark:bg-slate-900/95 px-4 py-3 text-left backdrop-blur hover:bg-slate-100/95 dark:hover:bg-slate-800/95"
      >
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
        {count > 0 && (
          <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            {count}
          </span>
        )}
        <svg
          className={`ml-auto h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && children}
    </div>
  );
}
