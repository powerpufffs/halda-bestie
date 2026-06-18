import { NextResponse, type NextRequest } from "next/server";
import { exchangeNylasCode } from "@/lib/nylas";
import { verifyOAuthState } from "@/lib/oauth-state";
import { ensureUserForExternalId } from "@/lib/user-identity";
import {
  syncRecentMessagesForAccount,
  upsertConnectedEmailAccount,
} from "@/lib/email-ingestion";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    if (!code) throw new Error("Nylas callback did not include a code.");

    const state = verifyOAuthState(request.nextUrl.searchParams.get("state"));
    const userId = await ensureUserForExternalId(state.externalUserId);
    const token = await exchangeNylasCode({
      code,
      origin: request.nextUrl.origin,
    });
    const account = await upsertConnectedEmailAccount({
      userId,
      grantId: token.grant_id,
      emailAddress: token.email,
      scopes: token.scope ? token.scope.split(/\s+/).filter(Boolean) : undefined,
      metadata: {
        provider: token.provider,
        externalUserId: state.externalUserId,
      },
    });

    const synced = await syncRecentMessagesForAccount(account, 25);
    const url = new URL("/", request.nextUrl.origin);
    url.searchParams.set("connected", "1");
    url.searchParams.set("synced", String(synced));
    url.searchParams.set("userId", state.externalUserId);

    return NextResponse.redirect(url);
  } catch (error) {
    const url = new URL("/", request.nextUrl.origin);
    url.searchParams.set("error", error instanceof Error ? error.message : String(error));
    return NextResponse.redirect(url);
  }
}
