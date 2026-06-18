import { NextRequest, NextResponse } from "next/server";
import type {
  AdviceCategory,
  AnalyzePayload,
  RawAdvice,
  RawSuggestion,
  SuggestionType,
} from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/analyze-essay
 * Body: { text: string }
 * Returns: { suggestions: RawSuggestion[], advice: RawAdvice[] }
 *
 *  - "suggestions": mechanical grammar/spelling fixes (inline accept/reject).
 *  - "advice": college-counselor guidance bullets, each optionally anchored to
 *    a passage in the essay.
 *
 * With an LLM key set (ANTHROPIC_API_KEY / OPENAI_API_KEY) it calls the model;
 * otherwise it falls back to a deterministic local analyzer so the prototype
 * works end-to-end with zero configuration.
 */
export async function POST(req: NextRequest) {
  let body: { text?: string; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  const prompt = (body.prompt ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Field 'text' is required." }, { status: 400 });
  }

  try {
    let payload: AnalyzePayload;
    if (process.env.ANTHROPIC_API_KEY) {
      payload = await analyzeWithAnthropic(text, prompt);
    } else if (process.env.OPENAI_API_KEY) {
      payload = await analyzeWithOpenAI(text, prompt);
    } else {
      payload = simulateAnalysis(text);
    }
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[analyze-essay] falling back to simulation:", err);
    return NextResponse.json(simulateAnalysis(text));
  }
}

/* -------------------------------------------------------------------------- */
/* Prompt                                                                     */
/* -------------------------------------------------------------------------- */

const SYSTEM_PROMPT = `You ARE a seasoned college admissions counselor and former admissions
officer reviewing a high school student's application essay. EVERY piece of feedback you
give — including grammar and mechanics — comes from this single perspective: how a real
admissions reader experiences this essay. You are warm and encouraging, but honest, because
your job is to help this student get in.

Across all of your feedback you care about: a vivid hook, concrete specifics over clichés,
a clear narrative throughline, authentic voice, genuine self-reflection ("so what did you
learn?"), and clean mechanics (because typos and errors quietly undermine an applicant's
credibility with the reader).

Return ONLY a JSON object (no prose, no markdown fences) with exactly these keys:

"score": an integer from 1 to 100 — your holistic admissions rating of how strong this essay
  currently is (voice, specificity, structure, reflection, mechanics). Be honest and
  calibrated: a generic but clean draft is around 55-70; a vivid, distinctive, polished
  essay is 85+.
"scoreSummary": ONE short sentence justifying the score, in your admissions-counselor voice.

"grammar": array of mechanical fixes. Each item:
  - "original": the exact substring to fix (verbatim quote from the essay)
  - "suggestion": the corrected replacement text
  - "explanation": ONE short sentence — STILL in your admissions-counselor voice, framing
    why the fix matters to a reader (e.g. "Small slips like this pull an admissions reader
    out of your story — clean them up so your ideas land."). Never sound like a detached
    grammar checker.

"advice": array of counselor notes that would strengthen the application. Each item:
  - "category": one of "Hook", "Specificity", "Structure", "Voice", "Reflection"
  - "point": one to three sentences of concrete, encouraging, actionable advice,
    spoken directly to the student as "you", in your admissions-counselor voice
  - "question": ONE open-ended reflective question that draws the student out and
    helps them generate raw material for the essay (e.g. "What were you actually
    doing the first time code clicked for you?"). Spoken directly to the student.
  - "anchor": OPTIONAL exact verbatim quote from the essay this advice refers to,
    so it can be underlined. Omit when the advice is about the essay as a whole.

Rules:
  - "original" and "anchor" MUST be exact, contiguous quotes from the essay.
  - Return 3-6 grammar items and 3-6 advice items.
  - Do not invent text that isn't in the essay.`;

function userPrompt(text: string, prompt: string): string {
  const promptBlock = prompt
    ? `The essay is responding to this application prompt:\n"""\n${prompt}\n"""\n\nWeigh how directly and fully the essay answers this prompt: factor prompt-fit into the score, and where it drifts from or underuses the prompt, say so in your advice.\n\n`
    : "";
  return `${promptBlock}Analyze the following college application essay and return the JSON object.\n\nESSAY:\n"""\n${text}\n"""`;
}

/* -------------------------------------------------------------------------- */
/* Provider: Anthropic (recommended — uses the Claude SDK)                    */
/* -------------------------------------------------------------------------- */

async function analyzeWithAnthropic(text: string, prompt: string): Promise<AnalyzePayload> {
  // Optional dependency: only loaded when ANTHROPIC_API_KEY is set. The
  // webpackIgnore hint stops the bundler from resolving it at build time.
  // @ts-ignore - optional peer dependency, types present only if installed
  const Anthropic = (await import(/* webpackIgnore: true */ "@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt(text, prompt) }],
  });

  const raw = res.content
    .filter((b: { type: string }): b is { type: "text"; text: string } => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
  return parseResult(raw);
}

/* -------------------------------------------------------------------------- */
/* Provider: OpenAI (alternative)                                             */
/* -------------------------------------------------------------------------- */

async function analyzeWithOpenAI(text: string, prompt: string): Promise<AnalyzePayload> {
  // Optional dependency: see note in analyzeWithAnthropic above.
  // @ts-ignore - optional peer dependency, types present only if installed
  const OpenAI = (await import(/* webpackIgnore: true */ "openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const res = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt(text, prompt) },
    ],
  });

  return parseResult(res.choices[0]?.message?.content ?? "{}");
}

/* -------------------------------------------------------------------------- */
/* Parsing + validation                                                       */
/* -------------------------------------------------------------------------- */

const VALID_TYPES: SuggestionType[] = ["Grammar", "Structure", "Tone"];
const VALID_CATEGORIES: AdviceCategory[] = [
  "Hook",
  "Specificity",
  "Structure",
  "Voice",
  "Reflection",
];

function parseResult(raw: string): AnalyzePayload {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown> | unknown[];

  const grammarArr =
    Array.isArray((parsed as { grammar?: unknown }).grammar)
      ? (parsed as { grammar: unknown[] }).grammar
      : Array.isArray((parsed as { suggestions?: unknown }).suggestions)
        ? (parsed as { suggestions: unknown[] }).suggestions
        : Array.isArray(parsed)
          ? parsed
          : [];

  const adviceArr = Array.isArray((parsed as { advice?: unknown }).advice)
    ? (parsed as { advice: unknown[] }).advice
    : [];

  const rawScore = Number((parsed as { score?: unknown }).score);
  const score = Number.isFinite(rawScore)
    ? Math.min(100, Math.max(1, Math.round(rawScore)))
    : 60;
  const summaryVal = (parsed as { scoreSummary?: unknown }).scoreSummary;
  const scoreSummary = typeof summaryVal === "string" ? summaryVal : "";

  return {
    suggestions: grammarArr.map(validateSuggestion).filter(isPresent),
    advice: adviceArr.map(validateAdvice).filter(isPresent),
    score,
    scoreSummary,
  };
}

function isPresent<T>(x: T | null): x is T {
  return x !== null;
}

function validateSuggestion(item: unknown): RawSuggestion | null {
  if (typeof item !== "object" || item === null) return null;
  const o = item as Record<string, unknown>;
  if (
    typeof o.original !== "string" ||
    typeof o.suggestion !== "string" ||
    typeof o.explanation !== "string"
  ) {
    return null;
  }
  const type = (VALID_TYPES.includes(o.type as SuggestionType)
    ? (o.type as SuggestionType)
    : "Grammar") as SuggestionType;
  return { type, original: o.original, suggestion: o.suggestion, explanation: o.explanation };
}

function validateAdvice(item: unknown): RawAdvice | null {
  if (typeof item !== "object" || item === null) return null;
  const o = item as Record<string, unknown>;
  if (typeof o.point !== "string" || !o.point.trim()) return null;
  return {
    point: o.point,
    question:
      typeof o.question === "string" && o.question.trim() ? o.question : undefined,
    anchor: typeof o.anchor === "string" && o.anchor.trim() ? o.anchor : undefined,
    category: VALID_CATEGORIES.includes(o.category as AdviceCategory)
      ? (o.category as AdviceCategory)
      : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Deterministic fallback simulator                                           */
/* -------------------------------------------------------------------------- */

/**
 * Zero-dependency analyzer used when no API key is set: a few mechanical grammar
 * fixes plus a pool of counselor-style advice bullets, so the UI is fully
 * interactive out of the box.
 */
function simulateAnalysis(text: string): AnalyzePayload {
  const suggestions: RawSuggestion[] = [];

  const grammarRules: Array<{ re: RegExp; fix: string; explanation: string }> = [
    { re: /\bI done\b/, fix: "I did", explanation: 'As your reader, I trip over "I done" — fix it to "I did" so nothing distracts me from your story.' },
    { re: /\bbuilded\b/, fix: "built", explanation: 'A slip like "builded" makes an admissions reader pause and question your polish — "built" keeps you credible.' },
    { re: /\bteached\b/, fix: "taught", explanation: '"teached" reads as careless to an admissions officer; "taught" shows the care your application deserves.' },
    { re: /\balot\b/, fix: "a lot", explanation: 'Small errors like "alot" quietly chip at your credibility with a reader — it should be two words, "a lot".' },
  ];
  for (const rule of grammarRules) {
    const m = text.match(rule.re);
    if (m) {
      suggestions.push({
        type: "Grammar",
        original: m[0],
        suggestion: rule.fix,
        explanation: rule.explanation,
      });
    }
  }

  // Counselor advice. Anchors are kept only if they still exist in the essay so
  // the yellow underline lands on real text.
  const advicePool: RawAdvice[] = [
    {
      category: "Hook",
      anchor: "Ever since I was young, I have always been fascinated by computers and how they work.",
      point:
        "Open in the middle of a real moment, not a broad statement. “Ever since I was young” is one of the most common opening lines admissions readers see. Lead with the night your code first worked and let the fascination show itself.",
      question:
        "Take me back to the very first time computers felt exciting to you — where were you, and what were you actually doing?",
    },
    {
      category: "Specificity",
      anchor: "I built my first website",
      point:
        "You mention your first website but never show it. What was it for? What broke along the way? Two concrete sentences here could make this the most memorable part of your essay.",
      question:
        "What was that first website for, and what was the most frustrating thing that went wrong while you built it?",
    },
    {
      category: "Voice",
      anchor:
        "I am passionate, hardworking, and I never give up no matter what obstacles come my way",
      point:
        "Almost every applicant calls themselves passionate and hardworking, so these words don’t set you apart. Cut the adjective list and let one specific story prove the trait for you.",
      question:
        "Instead of the word “hardworking,” tell me about one specific time you refused to give up on a problem. What happened?",
    },
    {
      category: "Reflection",
      anchor: "we builded an app that helps students track their homework",
      point:
        "Great, concrete detail — now go a layer deeper. What did shipping something real teach you about yourself and about why you want to study CS? The “so what” is where this essay earns its place.",
      question:
        "What surprised you most while building that homework app — and did it change how you think about studying CS?",
    },
    {
      category: "Reflection",
      anchor: "I was the president of the coding club",
      point:
        "Leadership lands harder with a moment of friction. Describe one hard decision or setback you faced as president, and what it taught you about working with people.",
      question:
        "What's one decision you made as club president that you'd handle differently today, and why?",
    },
    {
      category: "Structure",
      point:
        "Right now each paragraph covers a different time period, which reads like a résumé. Try organizing around a single throughline — e.g. “building tools that help people” — so the three stories feel like one narrative.",
      question:
        "If you had to name the single thread that connects everything in this essay, what would it be?",
    },
  ];

  const advice: RawAdvice[] = advicePool.map((a) => ({
    ...a,
    anchor: a.anchor && text.includes(a.anchor) ? a.anchor : undefined,
  }));

  // Heuristic score: start high, deduct for mechanical errors and for content
  // issues that actually apply to this essay (anchored advice). Reward length.
  const anchoredAdvice = advice.filter((a) => a.anchor).length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lengthBonus = words >= 250 ? 6 : words >= 120 ? 3 : 0;
  const score = clamp(
    90 - suggestions.length * 6 - anchoredAdvice * 4 + lengthBonus,
    35,
    97,
  );

  const scoreSummary =
    score >= 80
      ? "Strong, specific writing with only minor polishing left."
      : score >= 60
        ? "A solid draft — tighten the voice and add concrete detail to stand out."
        : "A promising start that needs cleaner mechanics and more vivid, specific storytelling.";

  return { suggestions, advice, score, scoreSummary };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
