import { randomUUID } from "node:crypto";
import type { UIMessage } from "ai";
import { createAgentStateStore } from "../../../agent/src/agent/state-store-factory.ts";
import { handleAgentTurn } from "../../../agent/src/agent/handle-turn.ts";
import type { LlmRuntime } from "../../../agent/src/agent/generation.ts";
import type { AgentStateStore } from "../../../agent/src/agent/state-store.ts";
import {
  createOpenAiCompatibleClient,
  readLlmConfig,
} from "../../../agent/src/llm/openai-compatible.ts";
import { rows, sql } from "./db";
import type { VerifiedWebSession } from "./lightweight-auth";

export interface WebChatMetadata {
  channel?: string;
  source?: string;
  occurredAt?: string;
  webSessionId?: string;
}

export type WebChatMessage = UIMessage<WebChatMetadata>;

interface AgentRuntime {
  store: AgentStateStore;
  llmRuntime?: LlmRuntime;
}

interface StoredMessageRow {
  id: string;
  platform_key: string;
  role: "user" | "assistant";
  body: string | null;
  occurred_at: Date | string;
  metadata: unknown;
}

let agentRuntime: AgentRuntime | undefined;

export function webChatThreadId(session: VerifiedWebSession): string {
  return session.handoffThreadId ?? `website:${session.id}`;
}

export async function loadWebChatMessages(
  session: VerifiedWebSession,
  limit = 18,
): Promise<WebChatMessage[]> {
  const result = await rows<StoredMessageRow>(sql`
    select messages.id,
           platforms.platform_key,
           messages.role,
           messages.body,
           messages.occurred_at,
           messages.metadata
    from halda.messages messages
    join halda.conversations conversations
      on conversations.id = messages.conversation_id
    join halda.messaging_platforms platforms
      on platforms.id = messages.messaging_platform_id
    where conversations.user_id = ${session.userId}::uuid
      and messages.role in ('user', 'assistant')
      and messages.body is not null
      and nullif(messages.body, '') is not null
      and messages.status <> 'ignored'
      and messages.deleted_at is null
      and conversations.deleted_at is null
      and platforms.deleted_at is null
    order by messages.occurred_at desc, messages.id desc
    limit ${Math.max(1, Math.min(limit, 30))}
  `);

  return result.toReversed().map((message) => {
    const metadata = asRecord(message.metadata);
    const occurredAt = new Date(message.occurred_at).toISOString();
    const source = readString(metadata.source) ?? message.platform_key;

    return {
      id: message.id,
      role: message.role,
      metadata: {
        channel: message.platform_key,
        source,
        occurredAt,
        webSessionId: readString(metadata.webSessionId),
      },
      parts: [{ type: "text", text: message.body ?? "", state: "done" }],
    };
  });
}

export async function handleWebChatTurn(input: {
  session: VerifiedWebSession;
  text: string;
}): Promise<string> {
  const runtime = getAgentRuntime();
  const result = await handleAgentTurn(
    {
      channel: "website",
      userId: input.session.externalUserId,
      threadId: webChatThreadId(input.session),
      text: input.text,
      timestamp: new Date(),
      externalMessageId: `web:${randomUUID()}`,
      metadata: {
        source: "website_chat",
        webSessionId: input.session.id,
      },
    },
    runtime.store,
    { llmRuntime: runtime.llmRuntime },
  );

  return result.reply;
}

function getAgentRuntime(): AgentRuntime {
  if (agentRuntime) return agentRuntime;

  agentRuntime = {
    store: createAgentStateStore(),
  };

  try {
    const config = readLlmConfig();
    const client = createOpenAiCompatibleClient(config);
    agentRuntime.llmRuntime = client && config.enabled ? { client, config } : undefined;
  } catch (error) {
    console.warn(
      "[halda] Web chat LLM config is invalid. Using fallback replies.",
      error,
    );
  }

  return agentRuntime;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
