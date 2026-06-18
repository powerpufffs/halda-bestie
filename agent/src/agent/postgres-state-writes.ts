import { sql, type SQL } from "drizzle-orm";
import { jsonb, timestamptz, type IdRow } from "./postgres-state-codec.ts";
import type { AgentEvent, AgentMessageRecord } from "./types.ts";

type RowExecutor = <T>(query: SQL) => Promise<T[]>;

interface MessagingIdentityContext {
  identityId: string;
  platformId: string;
  identity: {
    externalIdentity: string;
  };
}

export async function insertMessageRecord(input: {
  conversationId: string;
  message: AgentMessageRecord;
  participant: MessagingIdentityContext;
  rows: RowExecutor;
}): Promise<void> {
  const isUserMessage = input.message.role === "user";

  await input.rows<IdRow>(sql`
    insert into halda.messages (
      conversation_id,
      messaging_platform_id,
      from_identity_id,
      to_identity_id,
      from_address,
      to_address,
      external_message_id,
      external_thread_id,
      role,
      content_type,
      body,
      status,
      occurred_at,
      processed_at,
      metadata
    )
    values (
      ${input.conversationId}::uuid,
      ${input.participant.platformId}::uuid,
      ${isUserMessage ? sql`${input.participant.identityId}::uuid` : sql`null`},
      ${isUserMessage ? sql`null` : sql`${input.participant.identityId}::uuid`},
      ${isUserMessage ? input.participant.identity.externalIdentity : "halda-agent"},
      ${isUserMessage ? "halda-agent" : input.participant.identity.externalIdentity},
      ${input.message.externalMessageId ?? null},
      ${input.message.threadId},
      ${input.message.role},
      'text',
      ${input.message.body},
      ${input.message.status},
      ${timestamptz(input.message.occurredAt)},
      ${input.message.processedAt ? timestamptz(input.message.processedAt) : null},
      ${jsonb(input.message.metadata ?? {})}
    )
    on conflict do nothing
    returning id
  `);
}

export async function insertAgentEvent(input: {
  conversationId: string | null;
  dbUserId: string;
  event: AgentEvent;
  rows: RowExecutor;
}): Promise<void> {
  await input.rows<IdRow>(sql`
    insert into halda.agent_events (
      user_id,
      conversation_id,
      event_type,
      input,
      output,
      occurred_at,
      metadata
    )
    values (
      ${input.dbUserId}::uuid,
      ${input.conversationId}::uuid,
      ${input.event.eventType},
      ${jsonb(input.event.input ?? {})},
      ${jsonb(input.event.output ?? {})},
      ${timestamptz(input.event.createdAt)},
      ${jsonb({ externalThreadId: input.event.threadId })}
    )
    returning id
  `);
}
