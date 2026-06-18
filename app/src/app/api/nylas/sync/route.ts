import { NextResponse, type NextRequest } from "next/server";
import { rows, sql } from "@/lib/db";
import { syncRecentMessagesForAccount } from "@/lib/email-ingestion";
import { ensureUserForExternalId, readExternalUserId } from "@/lib/user-identity";

export const runtime = "nodejs";

interface AccountRow {
  id: string;
  user_id: string;
  grant_id: string;
  email_address: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const externalUserId = readExternalUserId(readFormString(formData.get("userId")));
    const userId = await ensureUserForExternalId(externalUserId);
    const accounts = await rows<AccountRow>(sql`
      select id,
             user_id,
             grant_id,
             email_address
      from halda.connected_email_accounts
      where user_id = ${userId}::uuid
        and status = 'connected'
        and deleted_at is null
      order by id desc
    `);

    const syncedCounts = await Promise.all(
      accounts.map((account) => syncRecentMessagesForAccount(account, 25)),
    );
    const synced = syncedCounts.reduce((total, count) => total + count, 0);

    const url = new URL("/", request.nextUrl.origin);
    url.searchParams.set("userId", externalUserId);
    url.searchParams.set("synced", String(synced));

    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

function readFormString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}
