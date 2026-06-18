import { sql, type SQL } from "drizzle-orm";
import type { AgentChannel, AgentConversationMessage } from "./types.ts";

type RowExecutor = <T>(query: SQL) => Promise<T[]>;

export async function listRecentConversationMessages(input: {
  dbUserId: string;
  limit: number;
  rows: RowExecutor;
}): Promise<AgentConversationMessage[]> {
  const rows = await input.rows<{
    external_thread_id: string | null;
    platform_key: AgentChannel;
    role: "user" | "assistant";
    body: string | null;
    occurred_at: Date | string;
  }>(sql`
    select messages.external_thread_id,
           platforms.platform_key,
           messages.role,
           messages.body,
           messages.occurred_at
    from halda.messages messages
    join halda.conversations conversations
      on conversations.id = messages.conversation_id
    join halda.messaging_platforms platforms
      on platforms.id = messages.messaging_platform_id
    where conversations.user_id = ${input.dbUserId}::uuid
      and messages.role in ('user', 'assistant')
      and messages.body is not null
      and nullif(messages.body, '') is not null
      and messages.status <> 'ignored'
      and messages.deleted_at is null
      and conversations.deleted_at is null
      and platforms.deleted_at is null
    order by messages.occurred_at desc, messages.id desc
    limit ${Math.max(1, Math.min(input.limit, 30))}
  `);

  return rows
    .toReversed()
    .map((row) => ({
      threadId: row.external_thread_id ?? "",
      channel: row.platform_key,
      role: row.role,
      body: row.body ?? "",
      occurredAt: row.occurred_at instanceof Date ? row.occurred_at : new Date(row.occurred_at),
    }));
}
