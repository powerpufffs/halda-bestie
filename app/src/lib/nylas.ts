import { createHmac, timingSafeEqual } from "node:crypto";
import { requireNylasApiEnv, requireNylasOAuthEnv } from "./env";

export interface NylasEmailAddress {
  email?: string;
  name?: string;
}

export interface NylasMessage {
  id: string;
  grant_id: string;
  thread_id?: string;
  subject?: string;
  snippet?: string;
  body?: string;
  date?: number;
  from?: NylasEmailAddress[];
  to?: NylasEmailAddress[];
  cc?: NylasEmailAddress[];
  bcc?: NylasEmailAddress[];
  attachments?: NylasAttachment[];
  unread?: boolean;
  folders?: string[];
}

export interface NylasAttachment {
  id: string;
  filename?: string;
  content_type?: string;
  contentType?: string;
  size?: number;
  is_inline?: boolean;
}

interface NylasListResponse<T> {
  data: T[];
  next_cursor?: string;
}

interface NylasSingleResponse<T> {
  data: T;
}

interface NylasTokenResponse {
  grant_id: string;
  access_token?: string;
  email?: string;
  provider?: string;
  scope?: string;
}

interface NylasSendMessageResponse {
  request_id: string;
  data?: {
    id?: string;
    thread_id?: string;
  };
}

export function createNylasAuthUrl(input: {
  origin: string;
  externalUserId: string;
  state: string;
  provider?: string;
  loginHint?: string;
}): string {
  const env = requireNylasOAuthEnv();
  const url = new URL("/v3/connect/auth", env.nylasApiUri);
  url.searchParams.set("client_id", env.nylasClientId);
  url.searchParams.set("redirect_uri", nylasRedirectUri(input.origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "online");
  url.searchParams.set("state", input.state);
  if (input.provider) url.searchParams.set("provider", input.provider);
  if (input.loginHint) url.searchParams.set("login_hint", input.loginHint);
  if (env.nylasScopes.length > 0) url.searchParams.set("scope", env.nylasScopes.join(" "));

  return url.toString();
}

export async function exchangeNylasCode(input: {
  code: string;
  origin: string;
}): Promise<NylasTokenResponse> {
  const env = requireNylasOAuthEnv();
  return await nylasFetch<NylasTokenResponse>("/v3/connect/token", {
    method: "POST",
    body: JSON.stringify({
      client_id: env.nylasClientId,
      client_secret: env.nylasApiKey,
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: nylasRedirectUri(input.origin),
      code_verifier: "nylas",
    }),
  });
}

export async function listNylasMessages(
  grantId: string,
  params: {
    limit?: number;
    searchQueryNative?: string;
  } = {},
): Promise<NylasMessage[]> {
  const search = new URLSearchParams();
  if (params.limit) search.set("limit", String(Math.min(Math.max(params.limit, 1), 200)));
  if (params.searchQueryNative) search.set("search_query_native", params.searchQueryNative);

  const query = search.toString();
  const response = await nylasFetch<NylasListResponse<NylasMessage>>(
    `/v3/grants/${encodeURIComponent(grantId)}/messages${query ? `?${query}` : ""}`,
  );

  return response.data;
}

export async function getNylasMessage(grantId: string, messageId: string): Promise<NylasMessage> {
  const response = await nylasFetch<NylasSingleResponse<NylasMessage>>(
    `/v3/grants/${encodeURIComponent(grantId)}/messages/${encodeURIComponent(messageId)}`,
  );

  return response.data;
}

export async function sendNylasMessage(input: {
  grantId: string;
  to: NylasEmailAddress[];
  subject: string;
  body: string;
  replyToMessageId?: string;
  metadata?: Record<string, unknown>;
}): Promise<NylasSendMessageResponse> {
  return await nylasFetch<NylasSendMessageResponse>(
    `/v3/grants/${encodeURIComponent(input.grantId)}/messages/send`,
    {
      method: "POST",
      body: JSON.stringify({
        to: input.to,
        subject: input.subject,
        body: input.body,
        is_plaintext: true,
        reply_to_message_id: input.replyToMessageId,
        metadata: input.metadata,
      }),
    },
  );
}

export function verifyNylasSignature(rawBody: string, signature: string | null): boolean {
  const env = requireNylasApiEnv();
  if (!env.nylasWebhookSecret) return true;
  if (!signature) return false;

  const expected = createHmac("sha256", env.nylasWebhookSecret).update(rawBody).digest("hex");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.byteLength !== right.byteLength) return false;

  return timingSafeEqual(left, right);
}

export function nylasRedirectUri(origin: string): string {
  const env = requireNylasApiEnv();
  const base = env.appUrl ?? origin;
  return new URL("/api/nylas/callback", base).toString();
}

async function nylasFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const env = requireNylasApiEnv();
  const response = await fetch(new URL(path, env.nylasApiUri), {
    ...init,
    headers: {
      Authorization: `Bearer ${env.nylasApiKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Nylas request failed (${response.status}): ${body.slice(0, 500)}`);
  }

  return (await response.json()) as T;
}
