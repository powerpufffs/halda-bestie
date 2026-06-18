import { NextResponse, type NextRequest } from "next/server";
import {
  WEB_SESSION_COOKIE,
  verifySmsChallenge,
  webSessionCookieOptions,
} from "@/lib/lightweight-auth";
import { verifyWebsiteHandoffToken } from "@/lib/website-handoff";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const token = readFormString(formData.get("token"));
  const demo = readFormString(formData.get("demo"));
  const demoUserId = readFormString(formData.get("demoUserId"));
  const challengeId = readFormString(formData.get("challengeId"));
  const code = readFormString(formData.get("code"));

  try {
    if (!challengeId || !code) throw new Error("missing verification code.");
    const payload = demo && demoUserId
      ? demoPayload({ code: demo, userId: demoUserId })
      : token
        ? verifyWebsiteHandoffToken(token)
        : undefined;
    const handoffToken = demo && demoUserId ? demoHandoffToken(demo, demoUserId) : token;
    if (!payload || !handoffToken) throw new Error("missing verification code.");

    const session = await verifySmsChallenge({
      challengeId,
      code,
      handoffToken,
      payload,
    });

    const url = new URL("/join", request.nextUrl.origin);
    url.searchParams.set("verified", "1");

    const response = NextResponse.redirect(url, { status: 303 });
    response.cookies.set(
      WEB_SESSION_COOKIE,
      session.token,
      webSessionCookieOptions(new Date(session.expiresAt)),
    );
    return response;
  } catch (error) {
    const url = new URL("/join", request.nextUrl.origin);
    if (token) url.searchParams.set("token", token);
    if (demo && demoUserId) {
      url.searchParams.set("demo", demo);
      url.searchParams.set("u", Buffer.from(demoUserId).toString("base64url"));
      url.searchParams.set("send", "1");
    }
    url.searchParams.set("error", error instanceof Error ? error.message : String(error));
    return NextResponse.redirect(url, { status: 303 });
  }
}

function readFormString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function demoPayload(input: { code: string; userId: string }) {
  return {
    userId: input.userId,
    threadId: `demo:${input.code}`,
    lifecycleStage: "unknown",
    interests: [],
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

function demoHandoffToken(code: string, userId: string): string {
  return `demo:${code}:${userId}`;
}
