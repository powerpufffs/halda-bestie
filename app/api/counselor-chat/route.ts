import { NextRequest, NextResponse } from "next/server";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

interface ChatBody {
  /** The application prompt the essay is responding to, for context. */
  prompt?: string;
  /** The advice note this conversation is about. */
  point?: string;
  /** The counselor's opening question. */
  question?: string;
  /** The passage of the essay the advice is anchored to, if any. */
  anchor?: string;
  /** Full conversation so far (counselor + writer turns). */
  messages?: ChatMessage[];
}

/**
 * POST /api/counselor-chat
 * Returns: { reply: string } — the counselor's next message.
 *
 * Uses an LLM when a key is configured; otherwise a deterministic coaching
 * fallback so the chat works with zero configuration.
 */
export async function POST(req: NextRequest) {
  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];

  try {
    let reply: string;
    if (process.env.ANTHROPIC_API_KEY) {
      reply = await chatWithAnthropic(body, messages);
    } else if (process.env.OPENAI_API_KEY) {
      reply = await chatWithOpenAI(body, messages);
    } else {
      reply = simulateReply(messages);
    }
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[counselor-chat] falling back to simulation:", err);
    return NextResponse.json({ reply: simulateReply(messages) });
  }
}

/* -------------------------------------------------------------------------- */
/* Prompt                                                                     */
/* -------------------------------------------------------------------------- */

function systemPrompt(body: ChatBody): string {
  return `You are a warm, encouraging college admissions counselor coaching a high
school student through their application essay in a back-and-forth chat.
${body.prompt ? `\nThe essay is responding to this application prompt: "${body.prompt}"\n` : ""}
You previously gave this advice: "${body.point ?? ""}"
${body.anchor ? `It refers to this passage: "${body.anchor}"` : ""}
You opened with the question: "${body.question ?? ""}"

Your job in each reply:
  - React warmly and specifically to what the student just said.
  - Ask ONE focused follow-up question that pushes them toward concrete, vivid,
    honest material they could put in the essay (sensory details, turning points,
    what they felt, what they learned).
  - When they've given you something strong, nudge them to draft a sentence from
    it for the essay.
Keep replies to 2-3 sentences. Speak directly to the student as "you". Plain text only.`;
}

/* -------------------------------------------------------------------------- */
/* Providers                                                                  */
/* -------------------------------------------------------------------------- */

async function chatWithAnthropic(body: ChatBody, messages: ChatMessage[]): Promise<string> {
  // @ts-ignore - optional peer dependency, types present only if installed
  const Anthropic = (await import(/* webpackIgnore: true */ "@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: systemPrompt(body),
    messages: messages.map((m) => ({
      role: m.role === "writer" ? "user" : "assistant",
      content: m.text,
    })),
  });

  return res.content
    .filter((b: { type: string }): b is { type: "text"; text: string } => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("")
    .trim();
}

async function chatWithOpenAI(body: ChatBody, messages: ChatMessage[]): Promise<string> {
  // @ts-ignore - optional peer dependency, types present only if installed
  const OpenAI = (await import(/* webpackIgnore: true */ "openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const res = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 512,
    messages: [
      { role: "system", content: systemPrompt(body) },
      ...messages.map((m) => ({
        role: (m.role === "writer" ? "user" : "assistant") as "user" | "assistant",
        content: m.text,
      })),
    ],
  });

  return (res.choices[0]?.message?.content ?? "").trim();
}

/* -------------------------------------------------------------------------- */
/* Deterministic coaching fallback                                            */
/* -------------------------------------------------------------------------- */

function simulateReply(messages: ChatMessage[]): string {
  const writerTurns = messages.filter((m) => m.role === "writer").length;
  const last = [...messages].reverse().find((m) => m.role === "writer")?.text.trim() ?? "";
  const short = last.length < 25;

  if (short) {
    return "Good start — but give me more to work with. Paint the scene: where were you, who else was there, and what did it actually feel like in that moment?";
  }

  const followups = [
    "That's exactly the kind of specific detail admissions readers remember. Now dig one layer deeper — how did that moment change the way you saw yourself?",
    "I can picture that. What did you learn from it that a transcript or résumé could never show?",
    "Love it. Try turning what you just told me into a single vivid sentence you could drop straight into your essay — want to take a shot?",
    "Strong material. Why did that matter so much to you, specifically? That 'why' is what makes an essay feel like you.",
  ];
  return followups[writerTurns % followups.length];
}
