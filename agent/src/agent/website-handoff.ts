import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { AgentTurnInput, JsonObject, StudentProfileState } from "./types.ts";

export interface WebsiteHandoffPayload extends JsonObject {
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

export interface WebsiteHandoff {
  ready: boolean;
  missing: string[];
  url?: string;
  expiresAt?: string;
}

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

export function buildWebsiteHandoff(input: {
  profile: StudentProfileState;
  turn: AgentTurnInput;
  now?: Date;
}): WebsiteHandoff {
  const existing = asRecord(input.profile.facts.websiteHandoff);
  if (typeof existing.sentAt === "string") return { ready: false, missing: ["already_sent"] };

  const now = input.now ?? new Date();
  const onboarding = asRecord(input.profile.facts.onboarding);
  const firstName = readKnownString(input.profile.facts.firstName) ?? readKnownString(onboarding.firstName);
  const highSchool = readKnownString(input.profile.facts.highSchool) ?? readKnownString(onboarding.highSchool);
  const gradeLevel = readString(input.profile.facts.gradeLevel) ?? readString(onboarding.gradeLevel);
  const missing = [
    firstName ? undefined : "first_name",
    highSchool ? undefined : "high_school",
    gradeLevel || input.profile.lifecycleStage !== "unknown" ? undefined : "grade_level",
  ].filter((value): value is string => Boolean(value));

  if (missing.length > 0) return { ready: false, missing };

  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS).toISOString();
  const appUrl = readAppUrl();
  const url = new URL("/join", appUrl);
  url.searchParams.set("demo", randomBytes(4).toString("hex"));
  url.searchParams.set("u", Buffer.from(input.turn.userId).toString("base64url"));
  url.searchParams.set("otp", randomInt(100000, 1000000).toString());
  url.searchParams.set("send", "1");

  return {
    ready: true,
    missing: [],
    url: url.toString(),
    expiresAt,
  };
}

export function signWebsiteHandoffToken(payload: WebsiteHandoffPayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", readHandoffSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
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

export function markWebsiteHandoffSent(input: {
  profile: StudentProfileState;
  handoff: WebsiteHandoff;
  sentAt: Date;
}): StudentProfileState {
  if (!input.handoff.url) return input.profile;

  return {
    ...input.profile,
    facts: {
      ...input.profile.facts,
      websiteHandoff: {
        sentAt: input.sentAt.toISOString(),
        url: input.handoff.url,
        expiresAt: input.handoff.expiresAt,
      },
    },
  };
}

function readAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "http://localhost:3000"
  );
}

function readHandoffSecret(): string {
  return (
    process.env.HALDA_HANDOFF_SECRET?.trim() ||
    process.env.APP_SECRET?.trim() ||
    process.env.NYLAS_API_KEY?.trim() ||
    "halda-local-dev-handoff-secret"
  );
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function asRecord(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readKnownString(value: unknown): string | undefined {
  const string = readString(value);
  return string && string.toLowerCase() !== "unknown" ? string : undefined;
}
