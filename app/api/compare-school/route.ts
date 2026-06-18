import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface CompareBody {
  essay?: string;
  school?: string;
}

export interface CompareResult {
  /** 1-100: how well this essay would resonate at the chosen school. */
  fit: number;
  /** 1-2 sentence read in the voice of an admissions officer at that school. */
  summary: string;
  /** 2-3 concrete things to emphasize/tailor for this specific school. */
  tips: string[];
}

/**
 * POST /api/compare-school — evaluates the essay against a specific school's
 * values from the perspective of one of its admissions officers.
 * LLM when a key is set; deterministic fallback otherwise.
 */
export async function POST(req: NextRequest) {
  let body: CompareBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const essay = (body.essay ?? "").trim();
  const school = (body.school ?? "").trim();
  if (!essay) return NextResponse.json({ error: "Essay text is required." }, { status: 400 });
  if (!school) return NextResponse.json({ error: "School is required." }, { status: 400 });

  try {
    const result =
      process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY
        ? await withLLM(essay, school)
        : simulate(essay, school);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[compare-school] falling back to simulation:", err);
    return NextResponse.json(simulate(essay, school));
  }
}

function systemPrompt(school: string): string {
  return `You ARE an admissions officer at ${school}. Read the applicant's essay and judge,
specifically, how well it would resonate with ${school}'s culture, values, and what your
office looks for — not just whether it's a good essay in the abstract. Be honest and
encouraging. Reply with JSON ONLY:
{
  "fit": <integer 1-100, how well this essay lands at ${school}>,
  "summary": "<1-2 sentences in your voice as a ${school} admissions officer>",
  "tips": ["<2-3 concrete things to emphasize or tailor for ${school} specifically>"]
}`;
}

async function withLLM(essay: string, school: string): Promise<CompareResult> {
  let raw: string;
  if (process.env.ANTHROPIC_API_KEY) {
    // @ts-ignore - optional peer dependency
    const Anthropic = (await import(/* webpackIgnore: true */ "@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: systemPrompt(school),
      messages: [{ role: "user", content: `ESSAY:\n"""\n${essay}\n"""` }],
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
        { role: "system", content: systemPrompt(school) },
        { role: "user", content: `ESSAY:\n"""\n${essay}\n"""` },
      ],
    });
    raw = res.choices[0]?.message?.content ?? "{}";
  }

  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as Partial<CompareResult>;
  const fit = Number(parsed.fit);
  return {
    fit: Number.isFinite(fit) ? Math.min(100, Math.max(1, Math.round(fit))) : 60,
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    tips: Array.isArray(parsed.tips) ? parsed.tips.filter((t): t is string => typeof t === "string") : [],
  };
}

function simulate(essay: string, school: string): CompareResult {
  const words = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const hasSpecifics = /\d|"|“|named|called/.test(essay);
  const cliche = /(passionate|hardworking|ever since I was young|changed my life)/i.test(essay);

  let fit = 62;
  if (words >= 250) fit += 8;
  else if (words < 120) fit -= 10;
  if (hasSpecifics) fit += 8;
  if (cliche) fit -= 12;
  fit = Math.min(95, Math.max(35, fit));

  const summary =
    fit >= 78
      ? `As a ${school} admissions officer, this essay would catch my eye — your voice comes through and it feels authentic.`
      : fit >= 58
        ? `Reading this as a ${school} officer, I see real potential, but it doesn't yet feel unmistakably tailored to us.`
        : `Honestly, as a ${school} reader I'd want more — right now this could be addressed to any school.`;

  return {
    fit,
    summary,
    tips: [
      `Name something specific to ${school} — a program, professor, lab, or tradition — and tie it to a real moment from your story.`,
      `Show the trait ${school} values through one vivid scene rather than telling me you have it.`,
      cliche
        ? `Cut the clichés ("passionate", "changed my life") — ${school} readers see them constantly.`
        : `Sharpen your "so what did I learn" reflection so it lands with a ${school} reader.`,
    ],
  };
}
