import { NextResponse, type NextRequest } from "next/server";
import { createNylasAuthUrl } from "@/lib/nylas";
import { createOAuthState } from "@/lib/oauth-state";
import { ensureUserForExternalId, readExternalUserId } from "@/lib/user-identity";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams;
    const externalUserId = readExternalUserId(search.get("userId"));
    await ensureUserForExternalId(externalUserId);

    const state = createOAuthState(externalUserId);
    const authUrl = createNylasAuthUrl({
      origin: request.nextUrl.origin,
      externalUserId,
      state,
      provider: readOptional(search.get("provider")),
      loginHint: readOptional(search.get("loginHint")),
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

function readOptional(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
