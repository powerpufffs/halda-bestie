import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** Who sent a turn in the mock interview. */
type InterviewRole = "officer" | "student";

interface InterviewTurn {
  role: InterviewRole;
  text: string;
}

interface InterviewBody {
  /** School the student is interviewing with. */
  school?: string;
  /** Conversation so far (officer + student turns). Empty → officer opens. */
  messages?: InterviewTurn[];
}

/**
 * POST /api/interview
 * Returns: { reply: string } — the admissions officer's next message.
 *
 * The model stays fully in character as an admissions officer at the given
 * school and conducts a back-and-forth interview. Uses an LLM when a key is
 * configured; otherwise a deterministic interview script so it works with zero
 * configuration.
 */
export async function POST(req: NextRequest) {
  let body: InterviewBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const school = (body.school ?? "").trim() || "our school";
  const messages = Array.isArray(body.messages) ? body.messages : [];

  try {
    let reply: string;
    if (process.env.ANTHROPIC_API_KEY) {
      reply = await interviewWithAnthropic(school, messages);
    } else if (process.env.OPENAI_API_KEY) {
      reply = await interviewWithOpenAI(school, messages);
    } else {
      reply = simulateOfficer(school, messages);
    }
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[interview] falling back to simulation:", err);
    return NextResponse.json({ reply: simulateOfficer(school, messages) });
  }
}

/* -------------------------------------------------------------------------- */
/* Prompt                                                                     */
/* -------------------------------------------------------------------------- */

function systemPrompt(school: string): string {
  return `You are an admissions officer at ${school} conducting a friendly but real
one-on-one admissions interview with a prospective applicant — a high school senior.
Stay fully in character as the officer for the entire conversation. You are the one
running the interview.

How to conduct it:
  - If the conversation is just starting, warmly introduce yourself as an admissions
    officer at ${school}, put the student at ease in a sentence, then ask your first
    question.
  - Ask ONE question at a time. Open broad ("Tell me about yourself", "Why ${school}?")
    and let later questions follow naturally from what the student just told you.
  - React genuinely and specifically to each answer before moving on — a brief, human
    acknowledgment, then either a follow-up that digs a layer deeper or a new question.
  - Somewhere in the interview, ask at least one question tailored to ${school}'s
    culture, values, or well-known programs and traditions.
  - When the conversation has run its natural course, thank the student warmly and
    close the interview.

Keep each of your turns short and conversational — 2 to 4 sentences. Never coach,
grade, lecture, or break character. Speak directly to the student as "you". Plain
text only, no markdown.`;
}

/* -------------------------------------------------------------------------- */
/* Providers                                                                  */
/* -------------------------------------------------------------------------- */

const OPENER_NUDGE =
  "Begin the interview now: introduce yourself and ask your first question.";

async function interviewWithAnthropic(
  school: string,
  messages: InterviewTurn[],
): Promise<string> {
  // @ts-ignore - optional peer dependency, types present only if installed
  const Anthropic = (await import(/* webpackIgnore: true */ "@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Anthropic requires the first message to be from the user, so when the
  // officer opens we seed a short instruction rather than an empty history.
  const turns =
    messages.length === 0
      ? [{ role: "user" as const, content: OPENER_NUDGE }]
      : messages.map((m) => ({
          role: (m.role === "student" ? "user" : "assistant") as "user" | "assistant",
          content: m.text,
        }));

  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: systemPrompt(school),
    messages: turns,
  });

  return res.content
    .filter((b: { type: string }): b is { type: "text"; text: string } => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("")
    .trim();
}

async function interviewWithOpenAI(
  school: string,
  messages: InterviewTurn[],
): Promise<string> {
  // @ts-ignore - optional peer dependency, types present only if installed
  const OpenAI = (await import(/* webpackIgnore: true */ "openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const turns =
    messages.length === 0
      ? [{ role: "user" as const, content: OPENER_NUDGE }]
      : messages.map((m) => ({
          role: (m.role === "student" ? "user" : "assistant") as "user" | "assistant",
          content: m.text,
        }));

  const res = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 512,
    messages: [{ role: "system", content: systemPrompt(school) }, ...turns],
  });

  return (res.choices[0]?.message?.content ?? "").trim();
}

/* -------------------------------------------------------------------------- */
/* Deterministic interview script (no API key required)                       */
/* -------------------------------------------------------------------------- */

function simulateOfficer(school: string, messages: InterviewTurn[]): string {
  const studentTurns = messages.filter((m) => m.role === "student").length;

  // Opening: introduce yourself and ask the first question.
  if (studentTurns === 0) {
    return `Hi there — I'm an admissions officer here at ${school}, and I'm really glad we could connect today. There's no need to be nervous; I just want to get to know you a bit. So let's start simply: tell me a little about yourself.`;
  }

  // React to each answer and move to the next question.
  const questions = [
    `Thanks for sharing that. So tell me — why ${school}? What is it about us that made you want to apply?`,
    `That's helpful to hear. What do you hope to study, and what first drew you to it?`,
    `I appreciate you being open about that. Can you tell me about a challenge you've faced and how you worked through it?`,
    `That says a lot about you. Once you're on campus, what would you want to contribute to the ${school} community?`,
    `Great. Outside of class and grades, what's something you genuinely love doing?`,
    `Wonderful — one last question from me: is there anything you'd like to ask me about ${school} or life on campus?`,
  ];

  const idx = studentTurns - 1;
  if (idx < questions.length) return questions[idx];

  // Wrap up the interview.
  return `Thank you — this has genuinely been a great conversation. You've given me a real sense of who you are, and that's exactly what these interviews are for. We'll be in touch soon, and best of luck with the rest of your application to ${school}.`;
}
