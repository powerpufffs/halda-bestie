create table if not exists halda.identity_link_codes (
  id uuid primary key default uuidv7(),
  code_hash text not null unique,
  source_user_id uuid not null references halda.users(id) on delete cascade,
  source_identity_id uuid references halda.user_messaging_identities(id) on delete set null,
  source_channel text not null,
  source_external_identity text not null,
  target_channel text not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  completed_by_user_id uuid references halda.users(id) on delete set null,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists identity_link_codes_pending_hash_idx
  on halda.identity_link_codes (code_hash, expires_at)
  where status = 'pending' and deleted_at is null;

create index if not exists identity_link_codes_source_status_idx
  on halda.identity_link_codes (source_user_id, status, created_at desc)
  where deleted_at is null;
