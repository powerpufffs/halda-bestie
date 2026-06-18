import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { readAppEnv } from "./env";

interface OAuthState {
  externalUserId: string;
  nonce: string;
  createdAt: string;
}

export function createOAuthState(externalUserId: string): string {
  const payload: OAuthState = {
    externalUserId,
    nonce: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyOAuthState(value: string | null): OAuthState {
  if (!value) throw new Error("Missing OAuth state.");

  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) throw new Error("Malformed OAuth state.");

  const expected = sign(encodedPayload);
  if (!safeEqual(signature, expected)) throw new Error("Invalid OAuth state signature.");

  const parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid OAuth state payload.");
  }

  const state = parsed as Record<string, unknown>;
  if (typeof state.externalUserId !== "string" || typeof state.createdAt !== "string" || typeof state.nonce !== "string") {
    throw new Error("Invalid OAuth state fields.");
  }

  const ageMs = Date.now() - new Date(state.createdAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs > 15 * 60 * 1000) {
    throw new Error("Expired OAuth state.");
  }

  return {
    externalUserId: state.externalUserId,
    nonce: state.nonce,
    createdAt: state.createdAt,
  };
}

function sign(encodedPayload: string): string {
  const env = readAppEnv();
  const secret = env.appSecret ?? env.nylasApiKey;
  if (!secret) throw new Error("APP_SECRET or NYLAS_API_KEY is required to sign OAuth state.");

  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.byteLength !== rightBuffer.byteLength) return false;

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function base64url(value: string): string {
  return Buffer.from(value).toString("base64url");
}
