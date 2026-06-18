import { handleAgentTurn } from "../../../agent/src/agent/handle-turn.ts";
import type { LlmRuntime } from "../../../agent/src/agent/generation.ts";
import type { AgentStateStore } from "../../../agent/src/agent/state-store.ts";
import { createAgentStateStore } from "../../../agent/src/agent/state-store-factory.ts";
import {
  createOpenAiCompatibleClient,
  readLlmConfig,
} from "../../../agent/src/llm/openai-compatible.ts";
import {
  saveAndInterpretNylasMessageForUser,
  upsertConnectedEmailAccount,
} from "./email-ingestion";
import { resolveEmailIdentityGate } from "./email-identity-gate";
import { readAppEnv } from "./env";
import {
  getNylasMessage,
  sendNylasMessage,
  type NylasAttachment,
  type NylasEmailAddress,
  type NylasMessage,
} from "./nylas";
import { ensureUserForExternalId } from "./user-identity";

interface AgentRuntime {
  store: AgentStateStore;
  llmRuntime?: LlmRuntime;
}

let agentRuntime: AgentRuntime | undefined;

export async function processHaldaInboxWebhook(payload: Record<string, unknown>): Promise<boolean> {
  const env = readAppEnv();
  if (!env.nylasHaldaInboxGrantId) return false;

  const object = readWebhookObject(payload);
  const grantId = readString(object.grant_id);
  const messageId = readString(object.id);
  if (grantId !== env.nylasHaldaInboxGrantId || !messageId) return false;

  const message = hasFullMessageBody(object)
    ? (object as unknown as NylasMessage)
    : await getNylasMessage(grantId, messageId);
  const sender = message.from?.[0];
  const senderEmail = normalizeEmail(sender?.email);
  if (!senderEmail || senderEmail === normalizeEmail(env.haldaInboxEmail)) return true;

  const studentUserId = await ensureUserForExternalId(`email:${senderEmail}`);
  const inboxAccount = await ensureHaldaInboxAccount({
    grantId,
    emailAddress: env.haldaInboxEmail,
  });
  await saveAndInterpretNylasMessageForUser({
    account: inboxAccount,
    userId: studentUserId,
    message,
  });

  const runtime = getAgentRuntime();
  const threadId = emailThreadId(grantId, message);
  const timestamp = message.date ? new Date(message.date * 1000) : new Date();
  const gate = await resolveEmailIdentityGate({
    env,
    userId: studentUserId,
    senderEmail,
    threadId,
  });
  if (gate.required && gate.reply) {
    await runtime.store.logMessage({
      channel: "email",
      userId: `email:${senderEmail}`,
      threadId,
      role: "user",
      body: messageTextForAgent(message),
      status: "received",
      externalMessageId: message.id,
      metadata: {
        policy: "identity_gate",
        gate: "sms_handoff",
      },
      occurredAt: timestamp,
      processedAt: new Date(),
    });

    await sendNylasMessage({
      grantId,
      to: [{ email: senderEmail, name: sender?.name }],
      subject: replySubject(message.subject),
      body: gate.reply,
      replyToMessageId: message.id,
      metadata: {
        source: "halda_email_identity_gate",
        userId: studentUserId,
      },
    });

    await runtime.store.logMessage({
      channel: "email",
      userId: `email:${senderEmail}`,
      threadId,
      role: "assistant",
      body: gate.reply,
      status: "sent",
      metadata: {
        policy: "identity_gate",
        gate: "sms_handoff",
        codeIssued: Boolean(gate.code),
      },
      occurredAt: new Date(),
      processedAt: new Date(),
    });

    return true;
  }

  const result = await handleAgentTurn(
    {
      channel: "email",
      userId: `email:${senderEmail}`,
      threadId,
      text: messageTextForAgent(message),
      timestamp,
      externalMessageId: message.id,
    },
    runtime.store,
    { llmRuntime: runtime.llmRuntime },
  );

  await sendNylasMessage({
    grantId,
    to: [{ email: senderEmail, name: sender?.name }],
    subject: replySubject(message.subject),
    body: result.reply,
    replyToMessageId: message.id,
    metadata: {
      source: "halda_email_channel",
      userId: studentUserId,
      generationMode: result.generationMode,
    },
  });

  return true;
}

function getAgentRuntime(): AgentRuntime {
  if (agentRuntime) return agentRuntime;

  const config = readLlmConfig();
  const client = createOpenAiCompatibleClient(config);
  agentRuntime = {
    store: createAgentStateStore(),
    llmRuntime: client && config.enabled ? { client, config } : undefined,
  };

  return agentRuntime;
}

async function ensureHaldaInboxAccount(input: {
  grantId: string;
  emailAddress?: string;
}) {
  const inboxIdentity = input.emailAddress ? `email:${input.emailAddress}` : "email:halda-inbox";
  const userId = await ensureUserForExternalId(inboxIdentity);

  return await upsertConnectedEmailAccount({
    userId,
    grantId: input.grantId,
    emailAddress: input.emailAddress,
    scopes: [],
    metadata: {
      purpose: "halda_shared_inbox",
    },
  });
}

function messageTextForAgent(message: NylasMessage): string {
  return [
    message.subject ? `subject: ${message.subject}` : undefined,
    `from: ${formatEmail(message.from?.[0])}`,
    attachmentSummary(message.attachments),
    stripHtml(message.body ?? message.snippet ?? ""),
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join("\n\n");
}

function attachmentSummary(attachments: NylasAttachment[] | undefined): string | undefined {
  const visibleAttachments = (attachments ?? []).filter((attachment) => !attachment.is_inline);
  if (visibleAttachments.length === 0) return undefined;

  return `attachments: ${visibleAttachments.map(formatAttachment).join(", ")}`;
}

function formatAttachment(attachment: NylasAttachment): string {
  const name = attachment.filename ?? attachment.id;
  const contentType = attachment.content_type ?? attachment.contentType;
  const size = typeof attachment.size === "number" ? `${Math.ceil(attachment.size / 1024)}kb` : undefined;

  return [name, contentType, size].filter(Boolean).join(" ");
}

function formatEmail(address: NylasEmailAddress | undefined): string {
  if (!address?.email) return "unknown";
  return address.name ? `${address.name} <${address.email}>` : address.email;
}

function replySubject(subject: string | undefined): string {
  const cleanSubject = subject?.trim() || "your halda message";
  return /^re:/i.test(cleanSubject) ? cleanSubject : `re: ${cleanSubject}`;
}

function emailThreadId(grantId: string, message: NylasMessage): string {
  return `email:${grantId}:${message.thread_id ?? message.id}`;
}

function readWebhookObject(payload: Record<string, unknown>): Record<string, unknown> {
  const data = payload.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const object = (data as Record<string, unknown>).object;
  if (!object || typeof object !== "object" || Array.isArray(object)) return {};
  return object as Record<string, unknown>;
}

function hasFullMessageBody(object: Record<string, unknown>): boolean {
  return typeof object.id === "string" && typeof object.body === "string";
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeEmail(value: string | undefined): string | undefined {
  const trimmed = value?.trim().toLowerCase();
  return trimmed || undefined;
}
