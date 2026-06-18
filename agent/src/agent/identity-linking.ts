import { createHash } from "node:crypto";
import { sql, type SQL } from "drizzle-orm";
import { createDatabase } from "../db/client.ts";
import type { AgentStateStore } from "./state-store.ts";
import {
  displayNameForPlatform,
  jsonb,
  parseIdentity,
  type IdRow,
} from "./postgres-state-codec.ts";

interface HandleIdentityLinkCodeInput {
  userId: string;
  threadId: string;
  text: string;
  store: AgentStateStore;
}

interface IdentityLinkCodeRow {
  id: string;
  source_user_id: string;
  source_identity_id: string | null;
}

interface IdentityRow {
  id: string;
  user_id: string;
}

type RowExecutor = <T>(query: SQL) => Promise<T[]>;

export async function handleIdentityLinkCodeTurn(
  input: HandleIdentityLinkCodeInput,
): Promise<string | undefined> {
  const code = readLinkCode(input.text);
  if (!code || !process.env.DATABASE_URL) return undefined;

  const db = createDatabase(process.env.DATABASE_URL);
  const rows: RowExecutor = async <T>(query: SQL) => (await db.execute(query)) as unknown as T[];
  const link = await findPendingLinkCode(rows, code);
  if (!link) return undefined;

  await input.store.getProfile(input.userId);
  const targetIdentity = await ensureUserIdentity(rows, input.userId);
  await mergeSourceUserIntoTarget(rows, {
    link,
    targetUserId: targetIdentity.user_id,
  });

  return "got it, i connected your email with this number. you can keep going here or reply by email, i’ll remember both.";
}

export function hashIdentityLinkCode(code: string): string {
  return createHash("sha256")
    .update(`halda-identity-link-v1:${code.replace(/\D/g, "")}`)
    .digest("hex");
}

async function findPendingLinkCode(rows: RowExecutor, code: string): Promise<IdentityLinkCodeRow | undefined> {
  const [link] = await rows<IdentityLinkCodeRow>(sql`
    select id,
           source_user_id,
           source_identity_id
    from halda.identity_link_codes
    where code_hash = ${hashIdentityLinkCode(code)}
      and status = 'pending'
      and expires_at > now()
      and deleted_at is null
    limit 1
  `);

  return link;
}

async function mergeSourceUserIntoTarget(rows: RowExecutor, input: {
  link: IdentityLinkCodeRow;
  targetUserId: string;
}): Promise<void> {
  const sourceUserId = input.link.source_user_id;
  const targetUserId = input.targetUserId;

  await rows(sql`
    update halda.identity_link_codes
    set status = 'completed',
        completed_by_user_id = ${targetUserId}::uuid,
        completed_at = now(),
        modified_at = now()
    where id = ${input.link.id}::uuid
  `);

  if (sourceUserId === targetUserId) return;

  if (input.link.source_identity_id) {
    await rows(sql`
      update halda.user_messaging_identities
      set user_id = ${targetUserId}::uuid,
          is_primary = false,
          verified_at = coalesce(verified_at, now()),
          metadata = metadata || ${jsonb({ linkedBy: "identity_link_code", linkedAt: new Date().toISOString() })}
      where id = ${input.link.source_identity_id}::uuid
        and deleted_at is null
    `);
  }

  await rows(sql`
    update halda.conversations
    set user_id = ${targetUserId}::uuid
    where user_id = ${sourceUserId}::uuid
      and deleted_at is null
  `);

  await rows(sql`
    update halda.conversation_states
    set user_id = ${targetUserId}::uuid
    where user_id = ${sourceUserId}::uuid
      and deleted_at is null
  `);

  await rows(sql`
    update halda.agent_open_loops
    set user_id = ${targetUserId}::uuid
    where user_id = ${sourceUserId}::uuid
      and deleted_at is null
  `);

  await rows(sql`
    update halda.agent_events
    set user_id = ${targetUserId}::uuid
    where user_id = ${sourceUserId}::uuid
      and deleted_at is null
  `);

  await rows(sql`
    update halda.email_messages
    set user_id = ${targetUserId}::uuid
    where user_id = ${sourceUserId}::uuid
      and deleted_at is null
  `);

  await rows(sql`
    update halda.email_extractions
    set user_id = ${targetUserId}::uuid
    where user_id = ${sourceUserId}::uuid
      and deleted_at is null
  `);

  await rows(sql`
    update halda.notification_outbox
    set user_id = ${targetUserId}::uuid
    where user_id = ${sourceUserId}::uuid
      and deleted_at is null
  `);

  await rows(sql`
    update halda.user_events
    set user_id = ${targetUserId}::uuid
    where user_id = ${sourceUserId}::uuid
      and deleted_at is null
  `);

  await rows(sql`
    update halda.user_profiles target
    set facts = target.facts || source.facts,
        preferences = target.preferences || source.preferences,
        interests = (
          select jsonb_agg(distinct interest)
          from jsonb_array_elements_text(target.interests || source.interests) as interest
        ),
        constraints = (
          select jsonb_agg(distinct constraint_value)
          from jsonb_array_elements_text(target.constraints || source.constraints) as constraint_value
        ),
        milestones = target.milestones || source.milestones,
        modified_at = now()
    from halda.user_profiles source
    where target.user_id = ${targetUserId}::uuid
      and source.user_id = ${sourceUserId}::uuid
      and target.deleted_at is null
      and source.deleted_at is null
  `);
}

async function ensureUserIdentity(rows: RowExecutor, externalUserId: string): Promise<IdentityRow> {
  const identity = parseIdentity(externalUserId);
  const platformId = await ensurePlatform(rows, identity.platformKey);
  const [existing] = await rows<IdentityRow>(sql`
    select id,
           user_id
    from halda.user_messaging_identities
    where messaging_platform_id = ${platformId}::uuid
      and normalized_identity = ${identity.normalizedIdentity}
      and deleted_at is null
    limit 1
  `);

  if (existing) return existing;

  const [createdUser] = await rows<IdRow>(sql`
    insert into halda.users (metadata)
    values (${jsonb({
      accountStatus: "anonymous",
      anonymous: true,
      firstSeenExternalUserId: externalUserId,
      firstSeenPlatform: identity.platformKey,
    })})
    returning id
  `);

  if (!createdUser) throw new Error("Failed to create user for identity link.");

  const [createdIdentity] = await rows<IdentityRow>(sql`
    insert into halda.user_messaging_identities (
      user_id,
      messaging_platform_id,
      external_identity,
      normalized_identity,
      is_primary,
      verified_at,
      metadata
    )
    values (
      ${createdUser.id}::uuid,
      ${platformId}::uuid,
      ${identity.externalIdentity},
      ${identity.normalizedIdentity},
      true,
      now(),
      ${jsonb({ externalUserId })}
    )
    returning id,
              user_id
  `);

  if (!createdIdentity) throw new Error("Failed to create identity for identity link.");
  return createdIdentity;
}

async function ensurePlatform(rows: RowExecutor, platformKey: string): Promise<string> {
  const [existing] = await rows<IdRow>(sql`
    select id
    from halda.messaging_platforms
    where platform_key = ${platformKey}
      and deleted_at is null
    limit 1
  `);

  if (existing) return existing.id;

  const [created] = await rows<IdRow>(sql`
    insert into halda.messaging_platforms (platform_key, display_name)
    values (${platformKey}, ${displayNameForPlatform(platformKey)})
    on conflict (platform_key) do update
    set display_name = excluded.display_name
    returning id
  `);

  if (!created) throw new Error(`Failed to create platform ${platformKey}.`);
  return created.id;
}

function readLinkCode(text: string): string | undefined {
  const match = text.match(/(?:^|\D)(\d{6})(?:\D|$)/);
  return match?.[1];
}
