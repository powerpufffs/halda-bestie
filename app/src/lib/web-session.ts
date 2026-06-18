import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { rows, sql } from "./db";
import { hashOpaqueToken, jsonb } from "./web-auth-shared";

export const WEB_SESSION_COOKIE = "halda_session";

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

interface SessionRow {
  id: string;
  user_id: string;
  external_user_id: string;
  handoff_thread_id: string | null;
  expires_at: Date | string;
}

export interface VerifiedWebSession {
  id: string;
  userId: string;
  externalUserId: string;
  handoffThreadId?: string;
  expiresAt: string;
}

export interface IssuedWebSession extends VerifiedWebSession {
  token: string;
}

export async function readWebSession(): Promise<VerifiedWebSession | undefined> {
  const token = (await cookies()).get(WEB_SESSION_COOKIE)?.value;
  if (!token) return undefined;

  let session: SessionRow | undefined;
  try {
    [session] = await rows<SessionRow>(sql`
      select id,
             user_id,
             external_user_id,
             handoff_thread_id,
             expires_at
      from halda.web_sessions
      where token_hash = ${hashOpaqueToken(token, "session")}
        and status = 'active'
        and expires_at > now()
        and deleted_at is null
      limit 1
    `);
  } catch (error) {
    console.warn("[halda] Could not read web session.", error);
    return undefined;
  }

  if (!session) return undefined;

  try {
    await rows(sql`
      update halda.web_sessions
      set last_seen_at = now(),
          modified_at = now()
      where id = ${session.id}::uuid
    `);
  } catch (error) {
    console.warn("[halda] Could not update web session heartbeat.", error);
  }

  return {
    id: session.id,
    userId: session.user_id,
    externalUserId: session.external_user_id,
    handoffThreadId: session.handoff_thread_id ?? undefined,
    expiresAt: new Date(session.expires_at).toISOString(),
  };
}

export function webSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export async function issueWebSession(input: {
  userId: string;
  externalUserId: string;
  handoffThreadId?: string;
  lifecycleStage?: string;
}): Promise<IssuedWebSession> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const [created] = await rows<SessionRow>(sql`
    insert into halda.web_sessions (
      user_id,
      token_hash,
      external_user_id,
      handoff_thread_id,
      expires_at,
      last_seen_at,
      metadata
    )
    values (
      ${input.userId}::uuid,
      ${hashOpaqueToken(token, "session")},
      ${input.externalUserId},
      ${input.handoffThreadId ?? null},
      ${expiresAt.toISOString()},
      now(),
      ${jsonb({
        source: "sms_handoff",
        lifecycleStage: input.lifecycleStage,
      })}
    )
    returning id,
              user_id,
              external_user_id,
              handoff_thread_id,
              expires_at
  `);

  if (!created) throw new Error("could not create web session.");

  return {
    id: created.id,
    token,
    userId: created.user_id,
    externalUserId: created.external_user_id,
    handoffThreadId: created.handoff_thread_id ?? undefined,
    expiresAt: new Date(created.expires_at).toISOString(),
  };
}
