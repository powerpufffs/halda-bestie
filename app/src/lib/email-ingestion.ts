import { createHash } from "node:crypto";
import { rows, sql } from "./db";
import {
  interpretEmail,
  type EmailExtraction,
  type NormalizedEmailMessage,
} from "./email-interpretation";
import { getNylasMessage, listNylasMessages, type NylasMessage } from "./nylas";

export interface ConnectedAccountRow {
  id: string;
  user_id: string;
  grant_id: string;
  email_address: string | null;
}

interface EmailMessageRow {
  id: string;
  user_id: string;
}

interface IdRow {
  id: string;
}

export async function upsertConnectedEmailAccount(input: {
  userId: string;
  grantId: string;
  emailAddress?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}): Promise<ConnectedAccountRow> {
  const [account] = await rows<ConnectedAccountRow>(sql`
    insert into halda.connected_email_accounts (
      user_id,
      provider,
      grant_id,
      email_address,
      scopes,
      status,
      metadata
    )
    values (
      ${input.userId}::uuid,
      'nylas',
      ${input.grantId},
      ${input.emailAddress ?? null},
      ${jsonb(input.scopes ?? [])},
      'connected',
      ${jsonb(input.metadata ?? {})}
    )
    on conflict (provider, grant_id) do update
    set user_id = excluded.user_id,
        email_address = coalesce(excluded.email_address, halda.connected_email_accounts.email_address),
        scopes = excluded.scopes,
        status = 'connected',
        revoked_at = null,
        metadata = halda.connected_email_accounts.metadata || excluded.metadata
    returning id,
              user_id,
              grant_id,
              email_address
  `);

  if (!account) throw new Error("Failed to upsert connected email account.");
  return account;
}

export async function syncRecentMessagesForAccount(account: ConnectedAccountRow, limit = 25): Promise<number> {
  const messages = await listNylasMessages(account.grant_id, { limit });
  let processed = 0;

  await messages.reduce(async (previous, message) => {
    await previous;
    await saveAndInterpretNylasMessage(account, message);
    processed += 1;
  }, Promise.resolve());

  await rows<IdRow>(sql`
    update halda.connected_email_accounts
    set last_synced_at = now()
    where id = ${account.id}::uuid
    returning id
  `);

  return processed;
}

export async function saveWebhookEvent(input: {
  eventType: string;
  externalEventId?: string;
  payload: Record<string, unknown>;
  signatureVerified: boolean;
}): Promise<string> {
  const [event] = await rows<IdRow>(sql`
    insert into halda.inbound_webhook_events (
      provider,
      external_event_id,
      event_type,
      payload,
      status,
      metadata
    )
    values (
      'nylas',
      ${input.externalEventId ?? null},
      ${input.eventType},
      ${jsonb(input.payload)},
      'received',
      ${jsonb({ signatureVerified: input.signatureVerified })}
    )
    on conflict do nothing
    returning id
  `);

  return event?.id ?? "";
}

export async function updateWebhookEventStatus(input: {
  id: string;
  status: "processed" | "failed" | "ignored";
  error?: string;
}): Promise<void> {
  if (!input.id) return;

  await rows<IdRow>(sql`
    update halda.inbound_webhook_events
    set status = ${input.status},
        error = ${input.error ?? null},
        processed_at = now()
    where id = ${input.id}::uuid
    returning id
  `);
}

export async function processNylasMessageWebhook(payload: Record<string, unknown>): Promise<void> {
  const object = readWebhookObject(payload);
  const grantId = readString(object.grant_id);
  const messageId = readString(object.id);
  if (!grantId || !messageId) return;

  const [account] = await rows<ConnectedAccountRow>(sql`
    select id,
           user_id,
           grant_id,
           email_address
    from halda.connected_email_accounts
    where provider = 'nylas'
      and grant_id = ${grantId}
      and status = 'connected'
      and deleted_at is null
    limit 1
  `);

  if (!account) return;

  const message = hasEnoughMessageData(object)
    ? (object as unknown as NylasMessage)
    : await getNylasMessage(grantId, messageId);
  await saveAndInterpretNylasMessage(account, message);
}

export async function saveAndInterpretNylasMessage(
  account: ConnectedAccountRow,
  message: NylasMessage,
): Promise<EmailMessageRow> {
  return await saveAndInterpretNylasMessageForUser({
    account,
    userId: account.user_id,
    message,
  });
}

export async function saveAndInterpretNylasMessageForUser(input: {
  account: ConnectedAccountRow;
  userId: string;
  message: NylasMessage;
}): Promise<EmailMessageRow> {
  const { account, userId, message } = input;
  const normalized = normalizeNylasMessage(message, account.grant_id);
  const [row] = await rows<EmailMessageRow>(sql`
    insert into halda.email_messages (
      user_id,
      connected_email_account_id,
      provider,
      provider_message_id,
      provider_thread_id,
      grant_id,
      from_address,
      from_name,
      to_addresses,
      subject,
      snippet,
      body_text,
      body_hash,
      received_at,
      metadata
    )
    values (
      ${userId}::uuid,
      ${account.id}::uuid,
      'nylas',
      ${normalized.providerMessageId},
      ${normalized.providerThreadId ?? null},
      ${normalized.grantId},
      ${normalized.fromAddress ?? null},
      ${normalized.fromName ?? null},
      ${jsonb(normalized.toAddresses)},
      ${normalized.subject ?? null},
      ${normalized.snippet ?? null},
      ${normalized.bodyText ?? null},
      ${normalized.bodyText ? sha256(normalized.bodyText) : null},
      ${normalized.receivedAt ? sql`${normalized.receivedAt.toISOString()}::timestamptz` : null},
      ${jsonb(normalized.metadata)}
    )
    on conflict (connected_email_account_id, provider_message_id) do update
    set provider_thread_id = excluded.provider_thread_id,
        from_address = excluded.from_address,
        from_name = excluded.from_name,
        to_addresses = excluded.to_addresses,
        subject = excluded.subject,
        snippet = excluded.snippet,
        body_text = excluded.body_text,
        body_hash = excluded.body_hash,
        received_at = excluded.received_at,
        metadata = halda.email_messages.metadata || excluded.metadata
    returning id,
              user_id
  `);

  if (!row) throw new Error("Failed to save email message.");

  await interpretSavedEmail(row, normalized);
  return row;
}

export async function getInboxDashboard(userId: string) {
  const accounts = await rows<{
    id: string;
    email_address: string | null;
    status: string;
    last_synced_at: Date | string | null;
    connected_at: Date | string;
  }>(sql`
    select id,
           email_address,
           status,
           last_synced_at,
           connected_at
    from halda.connected_email_accounts
    where user_id = ${userId}::uuid
      and deleted_at is null
    order by id desc
  `);
  const messages = await rows<{
    id: string;
    subject: string | null;
    from_address: string | null;
    received_at: Date | string | null;
    classification: string;
    college_related: boolean;
    snippet: string | null;
  }>(sql`
    select id,
           subject,
           from_address,
           received_at,
           classification,
           college_related,
           snippet
    from halda.email_messages
    where user_id = ${userId}::uuid
      and deleted_at is null
    order by coalesce(received_at, created_at) desc
    limit 10
  `);
  const extractions = await rows<{
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
    where user_id = ${userId}::uuid
      and deleted_at is null
    order by id desc
    limit 10
  `);

  return { accounts, messages, extractions };
}

async function interpretSavedEmail(row: EmailMessageRow, message: NormalizedEmailMessage): Promise<void> {
  const interpretation = await interpretEmail(message);
  await rows<IdRow>(sql`
    update halda.email_messages
    set college_related = ${interpretation.collegeRelated},
        classification = ${interpretation.classification},
        processed_at = now(),
        metadata = metadata || ${jsonb({
          interpretationConfidence: interpretation.confidence,
          studentFacingSummary: interpretation.studentFacingSummary,
        })}
    where id = ${row.id}::uuid
    returning id
  `);

  await rows<IdRow>(sql`
    delete from halda.email_extractions
    where email_message_id = ${row.id}::uuid
    returning id
  `);

  await Promise.all(interpretation.extractions.map(async (extraction) => {
    const [created] = await rows<IdRow>(sql`
      insert into halda.email_extractions (
        user_id,
        email_message_id,
        extraction_type,
        extracted_json,
        confidence,
        student_facing_summary
      )
      values (
        ${row.user_id}::uuid,
        ${row.id}::uuid,
        ${extraction.type},
        ${jsonb(extraction.extractedJson)},
        ${extraction.confidence},
        ${extraction.studentFacingSummary ?? null}
      )
      returning id
    `);

    if (!created || extraction.confidence < 0.65) return;
    await createEmailOpenLoop(row.user_id, extraction);
    await queueEmailNotification(row.user_id, created.id, extraction);
  }));
}

async function createEmailOpenLoop(userId: string, extraction: EmailExtraction): Promise<void> {
  const loopType = `email_${extraction.type}`;
  const prompt = extraction.studentFacingSummary ?? `follow up on ${extraction.type.replaceAll("_", " ")}`;
  const [existing] = await rows<IdRow>(sql`
    select id
    from halda.agent_open_loops
    where user_id = ${userId}::uuid
      and loop_type = ${loopType}
      and prompt = ${prompt}
      and status in ('open', 'snoozed')
      and deleted_at is null
    limit 1
  `);
  if (existing) return;

  await rows<IdRow>(sql`
    insert into halda.agent_open_loops (
      user_id,
      loop_type,
      status,
      priority,
      blocking,
      prompt,
      result,
      metadata
    )
    values (
      ${userId}::uuid,
      ${loopType},
      'open',
      25,
      false,
      ${prompt},
      ${jsonb(extraction.extractedJson)},
      ${jsonb({ source: "email_ingestion", extractionType: extraction.type })}
    )
    returning id
  `);
}

async function queueEmailNotification(
  userId: string,
  extractionId: string,
  extraction: EmailExtraction,
): Promise<void> {
  const destination = await readSmsDestination(userId);
  await rows<IdRow>(sql`
    insert into halda.notification_outbox (
      user_id,
      source_email_extraction_id,
      channel,
      destination,
      body,
      reason,
      status,
      scheduled_for,
      metadata
    )
    values (
      ${userId}::uuid,
      ${extractionId}::uuid,
      ${destination ? "sms" : "in_app"},
      ${destination ?? null},
      ${extraction.studentFacingSummary ?? `new ${extraction.type.replaceAll("_", " ")} email found`},
      ${`email_${extraction.type}`},
      'queued',
      now(),
      ${jsonb({ extractionType: extraction.type, confidence: extraction.confidence })}
    )
    returning id
  `);
}

async function readSmsDestination(userId: string): Promise<string | undefined> {
  const [identity] = await rows<{ external_identity: string }>(sql`
    select umi.external_identity
    from halda.user_messaging_identities umi
    join halda.messaging_platforms mp on mp.id = umi.messaging_platform_id
    where umi.user_id = ${userId}::uuid
      and mp.platform_key in ('sms', 'imessage')
      and umi.deleted_at is null
      and mp.deleted_at is null
    order by umi.is_primary desc, umi.id desc
    limit 1
  `);

  return identity?.external_identity;
}

function normalizeNylasMessage(message: NylasMessage, fallbackGrantId: string): NormalizedEmailMessage {
  const from = message.from?.[0];

  return {
    providerMessageId: message.id,
    providerThreadId: message.thread_id,
    grantId: message.grant_id || fallbackGrantId,
    fromAddress: from?.email,
    fromName: from?.name,
    toAddresses: message.to ?? [],
    subject: message.subject,
    snippet: message.snippet,
    bodyText: stripHtml(message.body ?? ""),
    receivedAt: message.date ? new Date(message.date * 1000) : undefined,
    metadata: {
      unread: message.unread,
      folders: message.folders,
      attachments: message.attachments ?? [],
    },
  };
}

function readWebhookObject(payload: Record<string, unknown>): Record<string, unknown> {
  const data = payload.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const object = (data as Record<string, unknown>).object;
  if (!object || typeof object !== "object" || Array.isArray(object)) return {};
  return object as Record<string, unknown>;
}

function hasEnoughMessageData(object: Record<string, unknown>): boolean {
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

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function jsonb(value: unknown) {
  return sql`${JSON.stringify(value ?? {})}::jsonb`;
}
