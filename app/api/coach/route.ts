import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type CoachKind = "activity" | "interview" | "school-tips" | "school-questions";

interface CoachBody {
  kind?: CoachKind;
  /** Text to evaluate (activity description, interview answer, or school name). */
  input?: string;
  /** Optional extra context, e.g. the interview question being answered. */
  context?: string;
}

export interface SchoolQuestion {
  question: string;
  /** What admissions officers are really evaluating. */
  looking: string;
}

/**
 * POST /api/coach — counselor feedback + school-specific interview questions.
 * - kind "school-questions" → { questions: SchoolQuestion[] }
 * - all other kinds         → { feedback: string, rewrite?: string }
 * Uses an LLM when a key is set; otherwise deterministic fallbacks.
 */
export async function POST(req: NextRequest) {
  let body: CoachBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const kind = (body.kind ?? "activity") as CoachKind;
  const input = (body.input ?? "").trim();
  if (!input) {
    return NextResponse.json({ error: "Field 'input' is required." }, { status: 400 });
  }

  try {
    if (kind === "school-questions") {
      const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
      const questions = hasKey ? await questionsWithLLM(input) : simulateQuestions(input);
      return NextResponse.json({ questions });
    }

    if (process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY) {
      return NextResponse.json(await withLLM(kind, input, body.context));
    }
    return NextResponse.json(simulate(kind, input, body.context));
  } catch (err) {
    console.error("[coach] falling back to simulation:", err);
    if (kind === "school-questions") {
      return NextResponse.json({ questions: simulateQuestions(input) });
    }
    return NextResponse.json(simulate(kind, input, body.context));
  }
}

/* ------------------------- School-specific questions -------------------- */

const QUESTIONS_SYSTEM = `You are a college admissions interview coach. Given a school name,
produce the interview questions an applicant is most likely to face there — a mix of
universal questions and ones tailored to that school's culture, values, and well-known
programs or traditions. Reply with JSON ONLY:
{ "questions": [ { "question": "<the question>", "looking": "<1-2 sentences on what the interviewer is really evaluating>" } ] }
Return 5-7 questions. Phrase school-specific ones using the school's name.`;

async function questionsWithLLM(school: string): Promise<SchoolQuestion[]> {
  let raw: string;
  if (process.env.ANTHROPIC_API_KEY) {
    // @ts-ignore - optional peer dependency
    const Anthropic = (await import(/* webpackIgnore: true */ "@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: QUESTIONS_SYSTEM,
      messages: [{ role: "user", content: `School: ${school}` }],
    });
    raw = res.content
      .filter((b: { type: string }): b is { type: "text"; text: string } => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
  } else {
    // @ts-ignore - optional peer dependency
    const OpenAI = (await import(/* webpackIgnore: true */ "openai")).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: QUESTIONS_SYSTEM },
        { role: "user", content: `School: ${school}` },
      ],
    });
    raw = res.choices[0]?.message?.content ?? "{}";
  }

  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
    questions?: unknown;
  };
  const arr = Array.isArray(parsed.questions) ? parsed.questions : [];
  return arr
    .map((q): SchoolQuestion | null => {
      if (typeof q !== "object" || q === null) return null;
      const o = q as Record<string, unknown>;
      if (typeof o.question !== "string" || typeof o.looking !== "string") return null;
      return { question: o.question, looking: o.looking };
    })
    .filter((q): q is SchoolQuestion => q !== null);
}

function simulateQuestions(school: string): SchoolQuestion[] {
  const s = school.trim();
  return [
    {
      question: "Tell me about yourself.",
      looking:
        "Self-awareness and what you choose to lead with — a throughline backed by a story, not a résumé recap.",
    },
    {
      question: `Why ${s}?`,
      looking: `Genuine fit and demonstrated interest. Name specific ${s} programs, professors, or traditions — avoid rankings and prestige.`,
    },
    {
      question: `What would you contribute to the ${s} community?`,
      looking: `A community mindset. Point to ${s} clubs or initiatives you'd join or start, and the perspective only you bring.`,
    },
    {
      question: "What do you want to study, and why?",
      looking: `Intellectual curiosity and direction — and ideally how ${s}'s resources would help you pursue it.`,
    },
    {
      question: "Tell me about a challenge you overcame.",
      looking: "Resilience and reflection. A real, specific obstacle and what you learned — growth over drama.",
    },
    {
      question: "What do you do for fun, outside of class?",
      looking: "Authenticity and dimension. Be honest — it reveals personality and balance.",
    },
    {
      question: `Do you have any questions for me about ${s}?`,
      looking: `Curiosity and preparation. Ask something specific to ${s} you couldn't just Google.`,
    },
  ];
}

/* ------------------------------- Feedback ------------------------------- */

function systemFor(kind: CoachKind): string {
  switch (kind) {
    case "activity":
      return `You are a college admissions counselor reviewing a single Common App
activities-list entry (150 character max). Coach the student to use a strong action
verb, lead with impact, and quantify results. Reply with JSON:
{ "feedback": "<2-3 sentences of specific advice>", "rewrite": "<an improved <=150 char version>" }`;
    case "interview":
      return `You are a college interview coach. The student is practicing an answer.
Give warm, concrete feedback: what landed, what to tighten, and one thing to add.
Reply with JSON: { "feedback": "<3-4 sentences>" }`;
    default:
      return `You are a college admissions counselor. Given a school name, give 3-4
concise, practical interview tips specific to that school's culture and values.
Reply with JSON: { "feedback": "<short markdown bullet list>" }`;
  }
}

async function withLLM(kind: CoachKind, input: string, context?: string) {
  const user =
    kind === "interview"
      ? `Question: ${context ?? "(general)"}\n\nMy answer:\n"""${input}"""`
      : kind === "school-tips"
        ? `School: ${input}`
        : `Activity entry:\n"""${input}"""`;

  let raw: string;
  if (process.env.ANTHROPIC_API_KEY) {
    // @ts-ignore - optional peer dependency
    const Anthropic = (await import(/* webpackIgnore: true */ "@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system: systemFor(kind),
      messages: [{ role: "user", content: user }],
    });
    raw = res.content
      .filter((b: { type: string }): b is { type: "text"; text: string } => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
  } else {
    // @ts-ignore - optional peer dependency
    const OpenAI = (await import(/* webpackIgnore: true */ "openai")).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemFor(kind) },
        { role: "user", content: user },
      ],
    });
    raw = res.choices[0]?.message?.content ?? "{}";
  }

  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
    feedback?: string;
    rewrite?: string;
  };
  return {
    feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
    rewrite: typeof parsed.rewrite === "string" ? parsed.rewrite : undefined,
  };
}

const ACTION_VERBS = [
  "Led", "Founded", "Built", "Organized", "Launched", "Coordinated", "Designed",
  "Directed", "Mentored", "Raised", "Created", "Managed",
];

function simulate(kind: CoachKind, input: string, context?: string) {
  if (kind === "activity") {
    const tips: string[] = [];
    const len = input.length;
    if (len > 150) tips.push(`Trim to 150 characters (currently ${len}) — every word has to earn its place.`);
    const startsWithVerb = ACTION_VERBS.some((v) => input.trim().toLowerCase().startsWith(v.toLowerCase()));
    if (!startsWithVerb) tips.push("Open with a strong action verb (Led, Founded, Built) instead of “I” or “Member of”.");
    if (!/\d/.test(input)) tips.push("Quantify your impact — members recruited, dollars raised, hours, % growth.");
    if (tips.length === 0) tips.push("Solid entry. Push the impact even harder: what changed because you did this?");

    const cleaned = input.replace(/^(i\s+|we\s+|member of\s+)/i, "").trim();
    const verb = startsWithVerb ? "" : `${ACTION_VERBS[len % ACTION_VERBS.length]} `;
    return { feedback: tips.join(" "), rewrite: `${verb}${cleaned}`.slice(0, 150) };
  }

  if (kind === "school-tips") {
    return {
      feedback: `Here are quick tips for your **${input}** interview:\n\n- Research one specific program, professor, or tradition and weave it in naturally.\n- Be ready for “Why ${input}?” — go beyond rankings to fit and values.\n- Prepare a thoughtful question that shows you've done your homework.\n- Bring one genuine story that shows who you are outside of grades.`,
    };
  }

  const words = input.trim() ? input.trim().split(/\s+/).length : 0;
  const parts: string[] = [];
  if (words < 40) parts.push("Good start, but flesh it out — interviewers want a short story, not a one-liner.");
  else if (words > 220) parts.push("Strong detail, but tighten it — aim for a focused 60–90 second answer.");
  else parts.push("Nice length — concise but substantial.");
  parts.push(
    context
      ? `For “${context}”, answer directly in the first sentence, then back it with one concrete example.`
      : "Lead with a direct answer, then support it with one specific example.",
  );
  parts.push("End by connecting it to why you'd thrive on that campus.");
  return { feedback: parts.join(" ") };
}
