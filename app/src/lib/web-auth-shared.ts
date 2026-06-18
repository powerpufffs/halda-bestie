import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "./db";
import { readAppEnv } from "./env";

export const CHALLENGE_TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;

export interface IdRow {
  id: string;
}

export interface ChallengeRow {
  id: string;
  user_id: string;
  handoff_token_hash: string;
  destination: string | null;
  code_hash: string;
  status: string;
  attempt_count: string | number;
  expires_at: Date | string;
  metadata: unknown;
}

export function parseExternalUserId(externalUserId: string) {
  const separatorIndex = externalUserId.indexOf(":");
  const rawPlatform = separatorIndex > 0 ? externalUserId.slice(0, separatorIndex) : "sms";
  const externalIdentity = separatorIndex > 0 ? externalUserId.slice(separatorIndex + 1) : externalUserId;
  const platformKey = rawPlatform.replace(/[^a-z0-9_]/g, "_");
  const normalizedIdentity =
    platformKey === "sms" || platformKey === "imessage"
      ? externalIdentity.replace(/[^\d+]/g, "")
      : externalIdentity.trim().toLowerCase();

  return {
    platformKey,
    externalIdentity,
    normalizedIdentity,
  };
}

export function destinationFromExternalUserId(externalUserId: string): string {
  const identity = parseExternalUserId(externalUserId);
  return identity.externalIdentity || identity.normalizedIdentity;
}

export function hashVerificationCode(userId: string, handoffTokenHash: string, code: string): string {
  return createHmac("sha256", readAuthSecret())
    .update(["halda-web-sms-code-v1", userId, handoffTokenHash, code.replace(/\D/g, "")].join(":"))
    .digest("hex");
}

export function hashOpaqueToken(token: string, purpose: "handoff" | "session"): string {
  return createHash("sha256")
    .update(`halda-web-${purpose}-v1:${token}`)
    .digest("hex");
}

export function readAuthSecret(): string {
  const env = readAppEnv();
  return (
    env.appSecret ??
    process.env.HALDA_HANDOFF_SECRET?.trim() ??
    env.nylasApiKey ??
    "halda-local-dev-auth-secret"
  );
}

export function maskDestination(destination: string | null): string {
  const value = destination?.trim();
  if (!value) return "your phone";
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 4) return `•••${digits.slice(-4)}`;
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name?.slice(0, 2) ?? ""}***@${domain ?? "phone"}`;
  }
  return "your phone";
}

export function shouldExposeAuthCodes(): boolean {
  return process.env.HALDA_SHOW_AUTH_CODES === "true" || process.env.NODE_ENV !== "production";
}

export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export function jsonb(value: unknown) {
  return sql`${JSON.stringify(stripUndefined(value))}::jsonb`;
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}
