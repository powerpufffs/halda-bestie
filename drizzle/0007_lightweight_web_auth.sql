create table if not exists halda.web_sms_challenges (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id) on delete cascade,
  handoff_external_user_id text not null,
  handoff_thread_id text not null,
  handoff_token_hash text not null,
  destination text,
  code_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'expired', 'failed', 'cancelled')),
  attempt_count integer not null default 0,
  expires_at timestamptz not null,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists web_sms_challenges_pending_token_idx
  on halda.web_sms_challenges (handoff_token_hash, expires_at)
  where status = 'pending' and deleted_at is null;

create index if not exists web_sms_challenges_user_status_idx
  on halda.web_sms_challenges (user_id, status, created_at desc)
  where deleted_at is null;

create table if not exists halda.web_sessions (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id) on delete cascade,
  token_hash text not null unique,
  external_user_id text not null,
  handoff_thread_id text,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists web_sessions_active_token_idx
  on halda.web_sessions (token_hash, expires_at)
  where status = 'active' and deleted_at is null;

create index if not exists web_sessions_user_idx
  on halda.web_sessions (user_id, status, created_at desc)
  where deleted_at is null;
