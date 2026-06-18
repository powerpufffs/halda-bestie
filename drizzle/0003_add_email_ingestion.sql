create table if not exists halda.connected_email_accounts (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id) on delete cascade,
  provider text not null default 'nylas'
    check (provider in ('nylas')),
  grant_id text not null,
  email_address text,
  scopes jsonb not null default '[]'::jsonb,
  status text not null default 'connected'
    check (status in ('connected', 'expired', 'revoked', 'error')),
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (provider, grant_id)
);

create table if not exists halda.email_messages (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id) on delete cascade,
  connected_email_account_id uuid not null references halda.connected_email_accounts(id) on delete cascade,
  provider text not null default 'nylas'
    check (provider in ('nylas')),
  provider_message_id text not null,
  provider_thread_id text,
  grant_id text not null,
  from_address text,
  from_name text,
  to_addresses jsonb not null default '[]'::jsonb,
  subject text,
  snippet text,
  body_text text,
  body_hash text,
  received_at timestamptz,
  college_related boolean not null default false,
  classification text not null default 'unprocessed',
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (connected_email_account_id, provider_message_id)
);

create table if not exists halda.email_extractions (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id) on delete cascade,
  email_message_id uuid not null references halda.email_messages(id) on delete cascade,
  extraction_type text not null,
  extracted_json jsonb not null default '{}'::jsonb,
  confidence numeric(4, 3) not null default 0
    check (confidence >= 0 and confidence <= 1),
  student_facing_summary text,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.inbound_webhook_events (
  id uuid primary key default uuidv7(),
  provider text not null default 'nylas'
    check (provider in ('nylas')),
  external_event_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received'
    check (status in ('received', 'processed', 'failed', 'ignored')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.notification_outbox (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id) on delete cascade,
  source_email_extraction_id uuid references halda.email_extractions(id) on delete set null,
  channel text not null
    check (channel in ('sms', 'email', 'imessage', 'in_app')),
  destination text,
  body text not null,
  reason text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists connected_email_accounts_user_idx
  on halda.connected_email_accounts (user_id, status, id desc)
  where deleted_at is null;

create index if not exists email_messages_user_received_idx
  on halda.email_messages (user_id, received_at desc, id desc)
  where deleted_at is null;

create index if not exists email_messages_classification_idx
  on halda.email_messages (classification, college_related, received_at desc)
  where deleted_at is null;

create index if not exists email_extractions_user_idx
  on halda.email_extractions (user_id, extraction_type, id desc)
  where deleted_at is null;

create unique index if not exists inbound_webhook_events_external_uidx
  on halda.inbound_webhook_events (provider, external_event_id)
  where external_event_id is not null and deleted_at is null;

create index if not exists notification_outbox_status_idx
  on halda.notification_outbox (status, scheduled_for, id)
  where deleted_at is null;
