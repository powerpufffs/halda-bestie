import { NextRequest, NextResponse } from "next/server";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

interface ChatBody {
  /** Current full text of the essay, for context. */
  essay?: string;
  /** The application prompt the essay is responding to, for context. */
  prompt?: string;
  messages?: ChatMessage[];
}

/**
 * POST /api/essay-chat
 * General-purpose counselor chatbot for the docked bottom panel.
 * Returns: { reply: string }
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
    console.error("[essay-chat] falling back to simulation:", err);
    return NextResponse.json({ reply: simulateReply(messages) });
  }
}

function systemPrompt(essay?: string, prompt?: string): string {
  return `You are a friendly, knowledgeable college admissions counselor chatting with a
high school student inside their essay editor. Help with anything about their
essay or the application process: brainstorming, structure, tone, what colleges
look for, how to handle a prompt, etc. Be warm, concrete, and concise (2-4
sentences). Speak directly to the student as "you". Plain text only.
${prompt ? `\nThe essay is responding to this application prompt:\n"""\n${prompt.slice(0, 2000)}\n"""\nKeep your guidance anchored to how well the essay answers this prompt.` : ""}
${essay ? `\nThe student's current essay draft:\n"""\n${essay.slice(0, 6000)}\n"""` : ""}`;
}

async function chatWithAnthropic(body: ChatBody, messages: ChatMessage[]): Promise<string> {
  // @ts-ignore - optional peer dependency, types present only if installed
  const Anthropic = (await import(/* webpackIgnore: true */ "@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: systemPrompt(body.essay, body.prompt),
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
    max_tokens: 600,
    messages: [
      { role: "system", content: systemPrompt(body.essay, body.prompt)},
      ...messages.map((m) => ({
        role: (m.role === "writer" ? "user" : "assistant") as "user" | "assistant",
        content: m.text,
      })),
    ],
  });
  return (res.choices[0]?.message?.content ?? "").trim();
}

/* Deterministic fallback so the chatbot works with no API key. */
function simulateReply(messages: ChatMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "writer")?.text.toLowerCase() ?? "";

  if (/start|begin|stuck|idea|brainstorm|what do i write/.test(last)) {
    return "Start with a moment, not a summary. Think of one specific scene where you were fully yourself — then we can build the essay outward from there. What's a small story that feels like 'you'?";
  }
  if (/hook|intro|opening|first line|beginning/.test(last)) {
    return "A strong hook drops the reader into action or an honest, surprising thought — skip the throat-clearing. Tell me the moment your essay is really about and I'll help you open on it.";
  }
  if (/conclusion|ending|end|wrap/.test(last)) {
    return "Great endings echo the opening image and show how you've changed, without summarizing. What do you understand now that you didn't at the start of your story?";
  }
  if (/structure|organize|flow|paragraph/.test(last)) {
    return "Aim for one clear throughline so the essay reads as a single story, not a list. What's the one idea you most want the reader to remember about you?";
  }
  if (/tone|voice|formal|sound/.test(last)) {
    return "Write like you'd talk to a teacher you trust — specific, honest, and a little vulnerable beats polished and generic every time. Want to paste a sentence and I'll help you make it sound more like you?";
  }
  return "Happy to help with your essay. Tell me what you're working on — brainstorming a topic, sharpening your hook, tightening structure, or fixing the tone — and we'll take it step by step.";
}
