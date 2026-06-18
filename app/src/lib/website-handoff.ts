import { createHmac, timingSafeEqual } from "node:crypto";
import { rows, sql } from "./db";
import { readAppEnv } from "./env";

export interface WebsiteHandoffPayload {
  userId: string;
  threadId: string;
  lifecycleStage: string;
  firstName?: string;
  highSchool?: string;
  role?: string;
  gradeLevel?: string;
  interests: string[];
  issuedAt: string;
  expiresAt: string;
}

export function verifyWebsiteHandoffToken(token: string, now = new Date()): WebsiteHandoffPayload {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) throw new Error("Malformed handoff token.");

  const expected = createHmac("sha256", readHandoffSecret()).update(encodedPayload).digest("base64url");
  if (!safeEqual(signature, expected)) throw new Error("Invalid handoff token signature.");

  const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid handoff token payload.");
  }

  const payload = parsed as WebsiteHandoffPayload;
  if (!readString(payload.userId) || !readString(payload.threadId) || !readString(payload.expiresAt)) {
    throw new Error("Invalid handoff token fields.");
  }
  if (new Date(payload.expiresAt).getTime() < now.getTime()) {
    throw new Error("Expired handoff token.");
  }

  return payload;
}

export async function resolveWebsiteHandoffCode(code: string): Promise<string> {
  const [link] = await rows<{ token: string; expires_at: Date | string }>(sql`
    select token,
           expires_at
    from halda.web_handoff_links
    where code = ${code}
    limit 1
  `);

  if (!link) throw new Error("handoff link not found.");
  if (new Date(link.expires_at).getTime() < Date.now()) throw new Error("handoff link expired.");
  return link.token;
}

function readHandoffSecret(): string {
  const env = readAppEnv();
  return (
    process.env.HALDA_HANDOFF_SECRET?.trim() ||
    env.appSecret ||
    env.nylasApiKey ||
    "halda-local-dev-handoff-secret"
  );
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
