"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  GraduationCap,
  Sparkles,
  RotateCcw,
  Send,
  ChevronDown,
  Lightbulb,
  Video,
  MessageSquareText,
  PhoneOff,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { uid } from "@/lib/applyTypes";
import {
  COMMON_QUESTIONS,
  QUESTION_CATEGORIES,
  TOP_UNIVERSITIES,
  type CommonQuestion,
} from "@/lib/interviewQuestions";

type InterviewRole = "officer" | "student";
type InterviewMode = "text" | "video";
type VideoStatus = "idle" | "starting" | "live" | "error";

interface InterviewMessage {
  id: string;
  role: InterviewRole;
  text: string;
}

export function InterviewPrep() {
  const [school, setSchool] = useLocalStorage<string>("cp.interviewSchool", "");
  const [mode, setMode] = useLocalStorage<InterviewMode>("cp.interviewMode", "text");
  const [messages, setMessages] = useLocalStorage<InterviewMessage[]>(
    "cp.interviewChat",
    [],
  );
  const [schoolDraft, setSchoolDraft] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Live Tavus video session — intentionally NOT persisted; a WebRTC room can't
  // be resumed across reloads, so we re-create it on demand.
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>("idle");
  const [videoError, setVideoError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  // Guards the auto-open so a persisted-but-empty interview only kicks once.
  const bootedRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  /** Ask the admissions officer for their next turn given the conversation so far. */
  const officerTurn = async (schoolName: string, history: InterviewMessage[]) => {
    setSending(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school: schoolName,
          messages: history.map(({ role, text }) => ({ role, text })),
        }),
      });
      const data: { reply?: string } = await res.json();
      const reply = (data.reply ?? "").trim();
      if (reply) {
        setMessages((prev) => [...prev, { id: uid(), role: "officer", text: reply }]);
      }
    } catch (err) {
      console.error("Interview turn failed", err);
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "officer",
          text: "Sorry — I lost my train of thought there. Could you say that again?",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  // If we have a school but the (text) officer hasn't opened yet — fresh start
  // or a reload that landed mid-setup — have them begin the interview.
  useEffect(() => {
    if (mode === "text" && school && messages.length === 0 && !sending && !bootedRef.current) {
      bootedRef.current = true;
      officerTurn(school, []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school, mode]);

  /** Spin up a live Tavus video conversation with the admissions officer. */
  const startVideo = async (schoolName: string) => {
    setVideoStatus("starting");
    setVideoError("");
    try {
      const res = await fetch("/api/interview/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school: schoolName }),
      });
      const data: { id?: string; url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url) {
        setVideoError(data.error || "Couldn't start the video interview.");
        setVideoStatus("error");
        return;
      }
      setVideoId(data.id ?? null);
      setVideoUrl(data.url);
      setVideoStatus("live");
    } catch {
      setVideoError("Couldn't reach the video interview service.");
      setVideoStatus("error");
    }
  };

  /** End the live conversation (frees the Tavus slot, stops billing). */
  const endVideo = () => {
    if (videoId) {
      // Fire-and-forget; we don't block the UI on teardown.
      fetch(`/api/interview/video?id=${encodeURIComponent(videoId)}`, {
        method: "DELETE",
      }).catch(() => {});
    }
    setVideoUrl(null);
    setVideoId(null);
    setVideoStatus("idle");
  };

  const startInterview = () => {
    const name = schoolDraft.trim();
    if (!name) return;
    setSchoolDraft("");
    setSchool(name);
    if (mode === "video") {
      startVideo(name);
    } else {
      bootedRef.current = true;
      setMessages([]);
      officerTurn(name, []);
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    const studentMsg: InterviewMessage = { id: uid(), role: "student", text };
    const history = [...messages, studentMsg];
    setMessages(history);
    setDraft("");
    await officerTurn(school, history);
  };

  const reset = () => {
    bootedRef.current = false;
    endVideo();
    setSchool("");
    setMessages([]);
    setDraft("");
    setSchoolDraft("");
  };

  /* ------------------------------ Setup screen --------------------------- */
  if (!school) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Header />
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
          <div className="flex gap-3">
            <OfficerAvatar />
            <div className="rounded-2xl rounded-tl-sm bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              I'll play the part of an admissions officer and interview you, one question
              at a time — just like the real thing. Pick how you'd like to practice, then
              tell me which school.
            </div>
          </div>

          {/* Mode toggle: text chat vs. face-to-face video */}
          <div className="mt-4 inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-1">
            <ModeButton
              active={mode === "text"}
              onClick={() => setMode("text")}
              icon={<MessageSquareText className="h-4 w-4" />}
              label="Text chat"
            />
            <ModeButton
              active={mode === "video"}
              onClick={() => setMode("video")}
              icon={<Video className="h-4 w-4" />}
              label="Face-to-face"
            />
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={schoolDraft}
              onChange={(e) => setSchoolDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startInterview()}
              placeholder="e.g. Stanford, MIT, Williams College"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 px-3 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
            <button
              onClick={startInterview}
              disabled={!schoolDraft.trim()}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mode === "video" ? <Video className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {mode === "video" ? "Start video interview" : "Start interview"}
            </button>
          </div>
          {mode === "video" && (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              You'll join a live video call and speak with the officer — your camera and
              microphone will be requested.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-400 dark:text-slate-500">
          Answer naturally — I'll react and ask follow-ups, just like an admissions officer would.
        </p>

        <CommonQuestions />
      </div>
    );
  }

  /* ----------------------------- Interview chat -------------------------- */
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-6 py-8">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300">
          <Mic className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mock Interview</h1>
          <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
            With an admissions officer at <span className="font-semibold text-rose-600 dark:text-rose-300">{school}</span>
          </p>
        </div>
        <button
          onClick={reset}
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 transition hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300"
        >
          <RotateCcw className="h-4 w-4" /> New interview
        </button>
      </div>

      {mode === "text" && (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-4">
            {messages.map((m) =>
              m.role === "officer" ? (
                <div key={m.id} className="flex gap-3">
                  <OfficerAvatar />
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-rose-500 px-4 py-3 text-sm leading-relaxed text-white">
                    {m.text}
                  </div>
                </div>
              ),
            )}

            {sending && (
              <div className="flex gap-3">
                <OfficerAvatar />
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-rose-50 dark:bg-rose-500/10 px-4 py-3.5">
                  {["0ms", "150ms", "300ms"].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-rose-400"
                      style={{ animationDelay: d }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Answer box */}
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3">
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
              placeholder="Answer the officer…"
              className="min-h-[44px] max-h-40 min-w-0 flex-1 resize-none rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 px-3 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
            <button
              onClick={send}
              disabled={!draft.trim() || sending}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" /> Send
            </button>
          </div>
        </div>
      </div>
      )}

      {mode === "video" && (
        <VideoInterview
          status={videoStatus}
          url={videoUrl}
          error={videoError}
          onStart={() => startVideo(school)}
          onEnd={endVideo}
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="mb-6 flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300">
        <Mic className="h-5 w-5" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mock Interview</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Practice with an AI admissions officer who interviews you live, question by question.
        </p>
      </div>
    </header>
  );
}

/** Browsable bank of common questions, sampled from the top 100 universities. */
function CommonQuestions() {
  return (
    <section className="mt-10">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Common questions at top universities</h2>
        <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {COMMON_QUESTIONS.length}
        </span>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        A sample of what you might face — drawn from the kinds of questions commonly asked across the
        top {TOP_UNIVERSITIES.length} universities, from {TOP_UNIVERSITIES[0]} and{" "}
        {TOP_UNIVERSITIES[1]} to {TOP_UNIVERSITIES[TOP_UNIVERSITIES.length - 1]}. Tap any question to
        see what interviewers are really listening for.
      </p>

      {QUESTION_CATEGORIES.map((category) => {
        const questions = COMMON_QUESTIONS.filter((q) => q.category === category);
        if (questions.length === 0) return null;
        return (
          <div key={category} className="mb-5">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-600 dark:text-rose-300">
              {category}
            </h3>
            <div className="space-y-2">
              {questions.map((q) => (
                <QuestionAccordion key={q.question} q={q} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function QuestionAccordion({ q }: { q: CommonQuestion }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/15 text-rose-500 dark:text-rose-300">
          <Mic className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{q.question}</span>
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3">
          <div className="flex gap-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 p-3">
            <Lightbulb className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-300" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-rose-600 dark:text-rose-300">
                What they're really looking for
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{q.looking}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={[
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition",
        active ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

/** Live face-to-face interview via Tavus CVI (embedded WebRTC video room). */
function VideoInterview({
  status,
  url,
  error,
  onStart,
  onEnd,
}: {
  status: VideoStatus;
  url: string | null;
  error: string;
  onStart: () => void;
  onEnd: () => void;
}) {
  if (status === "live" && url) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-900 shadow-sm">
        <iframe
          src={url}
          title="Face-to-face admissions interview"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="min-h-0 w-full flex-1"
        />
        <button
          onClick={onEnd}
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-rose-700"
        >
          <PhoneOff className="h-4 w-4" /> End interview
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center shadow-sm">
      {status === "starting" ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Connecting you to the admissions officer…
          </p>
        </>
      ) : status === "error" ? (
        <>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-300">
            <AlertCircle className="h-6 w-6" />
          </span>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">{error}</p>
          <button
            onClick={onStart}
            className="mt-5 flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600"
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
        </>
      ) : (
        <>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300">
            <Video className="h-6 w-6" />
          </span>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Ready when you are. You'll join a live video call and speak with the admissions
            officer face-to-face — your camera and microphone will be requested.
          </p>
          <button
            onClick={onStart}
            className="mt-5 flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600"
          >
            <Video className="h-4 w-4" /> Start video interview
          </button>
        </>
      )}
    </div>
  );
}

function OfficerAvatar() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white">
      <GraduationCap className="h-5 w-5" />
    </span>
  );
}

export default InterviewPrep;
