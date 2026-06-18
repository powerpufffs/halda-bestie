import { rows, sql } from "./db";

export const DEMO_EXTERNAL_USER_ID = "website:demo";

interface IdRow {
  id: string;
}

interface IdentityRow extends IdRow {
  user_id: string;
}

interface IdentityParts {
  platformKey: string;
  externalIdentity: string;
  normalizedIdentity: string;
}

export async function ensureUserForExternalId(externalUserId: string): Promise<string> {
  const identity = parseIdentity(externalUserId);
  const platformId = await ensurePlatform(identity.platformKey);
  const [existing] = await rows<IdentityRow>(sql`
    select id,
           user_id
    from halda.user_messaging_identities
    where messaging_platform_id = ${platformId}::uuid
      and normalized_identity = ${identity.normalizedIdentity}
      and deleted_at is null
    limit 1
  `);

  if (existing) return existing.user_id;

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

  if (!createdUser) throw new Error("Failed to create user.");

  await rows<IdRow>(sql`
    insert into halda.user_messaging_identities (
      user_id,
      messaging_platform_id,
      external_identity,
      normalized_identity,
      is_primary,
      metadata
    )
    values (
      ${createdUser.id}::uuid,
      ${platformId}::uuid,
      ${identity.externalIdentity},
      ${identity.normalizedIdentity},
      true,
      ${jsonb({ externalUserId })}
    )
    returning id
  `);

  return createdUser.id;
}

export function readExternalUserId(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return DEMO_EXTERNAL_USER_ID;
  if (trimmed.includes(":")) return trimmed;

  return `website:${trimmed.toLowerCase()}`;
}

async function ensurePlatform(platformKey: string): Promise<string> {
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

function parseIdentity(externalUserId: string): IdentityParts {
  const separatorIndex = externalUserId.indexOf(":");
  const platformKey = separatorIndex > 0 ? externalUserId.slice(0, separatorIndex) : "website";
  const externalIdentity = separatorIndex > 0 ? externalUserId.slice(separatorIndex + 1) : externalUserId;

  return {
    platformKey: platformKey.replace(/[^a-z0-9_]/g, "_"),
    externalIdentity: externalIdentity || "demo",
    normalizedIdentity: normalizeIdentity(platformKey, externalIdentity || "demo"),
  };
}

function normalizeIdentity(platformKey: string, externalIdentity: string): string {
  const trimmed = externalIdentity.trim();
  if (platformKey === "sms" || platformKey === "imessage") return trimmed.replace(/[^\d+]/g, "");
  return trimmed.toLowerCase();
}

function displayNameForPlatform(platformKey: string): string {
  return platformKey
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function jsonb(value: unknown) {
  return sql`${JSON.stringify(value ?? {})}::jsonb`;
}
