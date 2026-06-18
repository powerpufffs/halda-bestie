import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const TAVUS_BASE = "https://tavusapi.com/v2";

/**
 * POST /api/interview/video
 * Body: { school?: string }
 * Returns: { id: string, url: string } — a live Tavus CVI conversation the
 * student can join face-to-face.
 *
 * Creates a Tavus "conversation" against a pre-made admissions-officer persona
 * (TAVUS_PERSONA_ID) and replica (TAVUS_REPLICA_ID). The school is injected per
 * session via conversational_context + custom_greeting, so one persona serves
 * every university. The API key never leaves the server.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.TAVUS_API_KEY;
  const replicaId = process.env.TAVUS_REPLICA_ID;
  const personaId = process.env.TAVUS_PERSONA_ID;

  if (!apiKey || !replicaId || !personaId) {
    return NextResponse.json(
      {
        error:
          "Face-to-face interviews aren't configured yet. Add TAVUS_API_KEY, TAVUS_REPLICA_ID, and TAVUS_PERSONA_ID to .env.local.",
      },
      { status: 503 },
    );
  }

  let school = "our school";
  try {
    const body = await req.json();
    if (typeof body?.school === "string" && body.school.trim()) {
      school = body.school.trim();
    }
  } catch {
    /* fall back to default */
  }

  try {
    const res = await fetch(`${TAVUS_BASE}/conversations`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        replica_id: replicaId,
        persona_id: personaId,
        conversation_name: `Interview – ${school}`,
        // Appended to the persona's own context, so the same officer persona
        // can interview for any school. Written to make the officer behave like
        // a real human reviewer rather than read a fixed script.
        conversational_context: `You are a real admissions officer at ${school}, interviewing this applicant for ${school} specifically — draw on its culture, values, and well-known programs.

Conduct this like a genuine human conversation, not a scripted questionnaire. Treat any set of questions as a loose guide, NOT a checklist: follow the conversation where it naturally goes. When an answer is interesting, surprising, or vivid, let your curiosity show and ask a natural follow-up to learn more instead of moving on. If something gives you pause — a gap, a contradiction, or a claim that sounds thin — gently probe it or voice the concern the way a thoughtful interviewer would: warm, but honest. React like a person (genuine interest, warmth, a little surprise) before your next question. Ask one thing at a time, let the conversation breathe, and over the whole interview still come away with a well-rounded sense of who they are.`,
        custom_greeting: `Hi there — I'm an admissions officer here at ${school}, and I'm glad we could connect today. There's no need to be nervous. Whenever you're ready, tell me a little about yourself.`,
        properties: {
          max_call_duration: 900, // 15 min cap per session
          participant_absent_timeout: 90, // shut down if nobody joins
          participant_left_timeout: 30, // shut down shortly after they leave
          enable_closed_captions: true,
          language: "english",
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[interview/video] Tavus create failed:", data);
      return NextResponse.json(
        { error: data?.message || "Couldn't start the video interview." },
        { status: res.status },
      );
    }

    return NextResponse.json({ id: data.conversation_id, url: data.conversation_url });
  } catch (err) {
    console.error("[interview/video] request error:", err);
    return NextResponse.json(
      { error: "Couldn't reach the video interview service." },
      { status: 502 },
    );
  }
}

/**
 * DELETE /api/interview/video?id=<conversation_id>
 * Ends a live conversation so billing stops and a concurrency slot frees up.
 */
export async function DELETE(req: NextRequest) {
  const apiKey = process.env.TAVUS_API_KEY;
  const id = new URL(req.url).searchParams.get("id");
  if (!apiKey || !id) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    await fetch(`${TAVUS_BASE}/conversations/${id}`, {
      method: "DELETE",
      headers: { "x-api-key": apiKey },
    });
  } catch (err) {
    console.error("[interview/video] end failed:", err);
  }
  return NextResponse.json({ ok: true });
}
