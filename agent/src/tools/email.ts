import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { parseIdentity } from "../agent/postgres-state-codec.ts";
import { createDatabase } from "../db/client.ts";
import { defineTool } from "./types.ts";

export const emailTools = [
  defineTool({
    key: "search_user_email",
    description: "Search saved inbox messages for college-related email context for this user.",
    inputSchema: z.object({
      query: z.string().min(1),
      limit: z.number().int().min(1).max(10).default(5),
      classification: z.string().optional(),
    }),
    async execute(input, context) {
      const dbUserId = await findDbUserId(context.userId);
      if (!dbUserId) return { connected: false, messages: [] };

      const likeQuery = `%${input.query}%`;
      const messages = await dbRows<{
        id: string;
        subject: string | null;
        from_address: string | null;
        snippet: string | null;
        received_at: Date | string | null;
        classification: string;
        college_related: boolean;
      }>(sql`
        select id,
               subject,
               from_address,
               snippet,
               received_at,
               classification,
               college_related
        from halda.email_messages
        where user_id = ${dbUserId}::uuid
          and deleted_at is null
          and (
            subject ilike ${likeQuery}
            or snippet ilike ${likeQuery}
            or body_text ilike ${likeQuery}
            or from_address ilike ${likeQuery}
          )
          and (${input.classification ?? null}::text is null or classification = ${input.classification ?? null})
        order by coalesce(received_at, created_at) desc
        limit ${input.limit}
      `);

      return {
        connected: true,
        messages: messages.map((message) => ({
          id: message.id,
          subject: message.subject,
          from: message.from_address,
          snippet: message.snippet,
          receivedAt: message.received_at,
          classification: message.classification,
          collegeRelated: message.college_related,
        })),
      };
    },
  }),
  defineTool({
    key: "list_email_action_items",
    description: "List extracted action items from college emails, including deadlines, scholarships, aid, and enrollment tasks.",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(10).default(5),
      extractionType: z.string().optional(),
    }),
    async execute(input, context) {
      const dbUserId = await findDbUserId(context.userId);
      if (!dbUserId) return { connected: false, actionItems: [] };

      const actionItems = await dbRows<{
        id: string;
        extraction_type: string;
        student_facing_summary: string | null;
        confidence: string | number;
        extracted_json: unknown;
      }>(sql`
        select id,
               extraction_type,
               student_facing_summary,
               confidence,
               extracted_json
        from halda.email_extractions
        where user_id = ${dbUserId}::uuid
          and deleted_at is null
          and (${input.extractionType ?? null}::text is null or extraction_type = ${input.extractionType ?? null})
        order by id desc
        limit ${input.limit}
      `);

      return {
        connected: true,
        actionItems: actionItems.map((item) => ({
          id: item.id,
          type: item.extraction_type,
          summary: item.student_facing_summary,
          confidence: Number(item.confidence),
          data: item.extracted_json,
        })),
      };
    },
  }),
];

async function findDbUserId(externalUserId: string): Promise<string | undefined> {
  const identity = parseIdentity(externalUserId);
  const [row] = await dbRows<{ user_id: string }>(sql`
    select umi.user_id
    from halda.user_messaging_identities umi
    join halda.messaging_platforms mp on mp.id = umi.messaging_platform_id
    where mp.platform_key = ${identity.platformKey}
      and umi.normalized_identity = ${identity.normalizedIdentity}
      and umi.deleted_at is null
      and mp.deleted_at is null
    limit 1
  `);

  return row?.user_id;
}

async function dbRows<T>(query: SQL): Promise<T[]> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return [];

  return (await createDatabase(databaseUrl).execute(query)) as unknown as T[];
}
