import { createHash, randomInt } from "node:crypto";
import { sql, rows } from "./db";
import type { AppEnv } from "./env";

interface IdRow {
  id: string;
}

interface CountRow {
  count: string | number;
}

interface IdentityRow {
  id: string;
}

export interface EmailIdentityGate {
  required: boolean;
  reply?: string;
  code?: string;
}

export async function resolveEmailIdentityGate(input: {
  env: AppEnv;
  userId: string;
  senderEmail: string;
  threadId: string;
}): Promise<EmailIdentityGate> {
  const smsNumber = input.env.haldaSmsPhoneNumber;
  if (!smsNumber) return { required: false };
  if (await hasLinkedMessagingIdentity(input.userId)) return { required: false };
  if (await hasExistingEmailConversation(input.userId)) return { required: false };

  const sourceIdentityId = await findEmailIdentityId(input.userId, input.senderEmail);
  const { code } = await createIdentityLinkCode({
    userId: input.userId,
    sourceIdentityId,
    senderEmail: input.senderEmail,
    threadId: input.threadId,
  });

  return {
    required: true,
    code,
    reply: [
      "hey, yep, it’s halda. i don’t recognize this email yet.",
      `text ${code} to ${smsNumber} so i can pull up the same profile here too.`,
      "no phone? just reply here and i’ll keep helping by email.",
    ].join("\n\n"),
  };
}

export function hashIdentityLinkCode(code: string): string {
  return createHash("sha256")
    .update(`halda-identity-link-v1:${code.replace(/\D/g, "")}`)
    .digest("hex");
}

async function hasLinkedMessagingIdentity(userId: string): Promise<boolean> {
  const linked = await rows<IdRow>(sql`
    select identities.id
    from halda.user_messaging_identities identities
    join halda.messaging_platforms platforms
      on platforms.id = identities.messaging_platform_id
    where identities.user_id = ${userId}::uuid
      and platforms.platform_key in ('sms', 'imessage')
      and identities.deleted_at is null
      and platforms.deleted_at is null
    limit 1
  `);

  return linked.length > 0;
}

async function hasExistingEmailConversation(userId: string): Promise<boolean> {
  const [existing] = await rows<CountRow>(sql`
    select count(*) as count
    from halda.messages messages
    join halda.conversations conversations
      on conversations.id = messages.conversation_id
    join halda.messaging_platforms platforms
      on platforms.id = messages.messaging_platform_id
    where conversations.user_id = ${userId}::uuid
      and platforms.platform_key = 'email'
      and messages.deleted_at is null
      and conversations.deleted_at is null
      and platforms.deleted_at is null
  `);

  return Number(existing?.count ?? 0) > 0;
}

async function findEmailIdentityId(userId: string, senderEmail: string): Promise<string | undefined> {
  const [identity] = await rows<IdentityRow>(sql`
    select identities.id
    from halda.user_messaging_identities identities
    join halda.messaging_platforms platforms
      on platforms.id = identities.messaging_platform_id
    where identities.user_id = ${userId}::uuid
      and platforms.platform_key = 'email'
      and identities.normalized_identity = ${senderEmail.toLowerCase()}
      and identities.deleted_at is null
      and platforms.deleted_at is null
    limit 1
  `);

  return identity?.id;
}

async function createIdentityLinkCode(input: {
  userId: string;
  sourceIdentityId?: string;
  senderEmail: string;
  threadId: string;
}): Promise<{ code: string }> {
  const code = randomInt(100000, 1000000).toString();
  const codeHash = hashIdentityLinkCode(code);

  await rows(sql`
    update halda.identity_link_codes
    set status = 'cancelled',
        modified_at = now()
    where source_user_id = ${input.userId}::uuid
      and source_channel = 'email'
      and source_external_identity = ${input.senderEmail.toLowerCase()}
      and status = 'pending'
      and deleted_at is null
  `);

  await rows(sql`
    insert into halda.identity_link_codes (
      code_hash,
      source_user_id,
      source_identity_id,
      source_channel,
      source_external_identity,
      target_channel,
      expires_at,
      metadata
    )
    values (
      ${codeHash},
      ${input.userId}::uuid,
      ${input.sourceIdentityId ? sql`${input.sourceIdentityId}::uuid` : sql`null`},
      'email',
      ${input.senderEmail.toLowerCase()},
      'sms',
      now() + interval '30 minutes',
      ${jsonb({ threadId: input.threadId })}
    )
  `);

  return { code };
}

function jsonb(value: unknown) {
  return sql`${JSON.stringify(value ?? {})}::jsonb`;
}
