-- Copied from PLAN.md "Initial Postgres DDL".
-- Assumes Postgres 18+ native uuidv7(), as documented in PLAN.md.
create schema if not exists halda;

create table if not exists halda.users (
  id uuid primary key default uuidv7(),
  display_name text,
  first_name text,
  last_name text,
  user_type text not null default 'student'
    check (user_type in ('student', 'guardian', 'counselor', 'institution_staff', 'halda_agent', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.user_profiles (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id),
  lifecycle_stage text not null default 'unknown'
    check (lifecycle_stage in ('unknown', 'sophomore', 'junior', 'senior', 'transfer', 'current_college', 'gap_year')),
  lifecycle_stage_confidence numeric(4, 3) not null default 0
    check (lifecycle_stage_confidence >= 0 and lifecycle_stage_confidence <= 1),
  agent_profile_key text not null default 'unknown',
  profile_version integer not null default 1,
  profile_summary text,
  facts jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  interests jsonb not null default '{}'::jsonb,
  constraints jsonb not null default '{}'::jsonb,
  milestones jsonb not null default '{}'::jsonb,
  tool_access jsonb not null default '{}'::jsonb,
  communication_style jsonb not null default '{}'::jsonb,
  tags text[] not null default array[]::text[],
  last_compacted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.messaging_platforms (
  id uuid primary key default uuidv7(),
  platform_key text not null unique check (platform_key ~ '^[a-z0-9_]+$'),
  display_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.user_messaging_identities (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id),
  messaging_platform_id uuid not null references halda.messaging_platforms(id),
  external_identity text not null,
  normalized_identity text not null,
  display_name text,
  is_primary boolean not null default false,
  is_halda_controlled boolean not null default false,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.pre_tertiary_institutions (
  id uuid primary key default uuidv7(),
  name text not null,
  institution_type text not null default 'high_school'
    check (institution_type in ('high_school', 'middle_school', 'k12', 'homeschool', 'ged', 'international', 'other')),
  city text,
  region text,
  country_code text not null default 'US',
  postal_code text,
  nces_school_id text,
  ceeb_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.tertiary_institutions (
  id uuid primary key default uuidv7(),
  name text not null,
  institution_type text not null default 'college'
    check (institution_type in ('university', 'college', 'community_college', 'trade_school', 'bootcamp', 'other')),
  city text,
  region text,
  country_code text not null default 'US',
  postal_code text,
  ipeds_unit_id integer,
  ope_id text,
  scorecard_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.user_institution_enrollments (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id),
  institution_level text not null check (institution_level in ('pre_tertiary', 'tertiary')),
  pre_tertiary_institution_id uuid references halda.pre_tertiary_institutions(id),
  tertiary_institution_id uuid references halda.tertiary_institutions(id),
  enrollment_started_at date,
  enrollment_ended_at date,
  enrollment_status text not null default 'unknown'
    check (enrollment_status in ('planned', 'current', 'completed', 'transferred', 'withdrawn', 'unknown')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint user_institution_enrollments_one_institution_chk check (
    (institution_level = 'pre_tertiary' and pre_tertiary_institution_id is not null and tertiary_institution_id is null)
    or
    (institution_level = 'tertiary' and tertiary_institution_id is not null and pre_tertiary_institution_id is null)
  ),
  constraint user_institution_enrollments_dates_chk check (
    enrollment_ended_at is null
    or enrollment_started_at is null
    or enrollment_ended_at >= enrollment_started_at
  )
);

create table if not exists halda.conversations (
  id uuid primary key default uuidv7(),
  user_id uuid references halda.users(id),
  title text,
  topic text,
  status text not null default 'open'
    check (status in ('open', 'closed', 'archived')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.conversation_states (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id),
  conversation_id uuid not null references halda.conversations(id),
  agent_profile_key text not null default 'unknown',
  current_intent text,
  current_flow text,
  slot_values jsonb not null default '{}'::jsonb,
  short_term_summary text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.messages (
  id uuid primary key default uuidv7(),
  conversation_id uuid not null references halda.conversations(id),
  messaging_platform_id uuid not null references halda.messaging_platforms(id),
  from_identity_id uuid references halda.user_messaging_identities(id),
  to_identity_id uuid references halda.user_messaging_identities(id),
  from_address text,
  to_address text,
  external_message_id text,
  external_thread_id text,
  in_reply_to_external_message_id text,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content_type text not null default 'text'
    check (content_type in ('text', 'html', 'attachment', 'tool_call', 'tool_result', 'json')),
  subject text,
  body text,
  status text not null default 'received'
    check (status in ('received', 'queued', 'sent', 'failed', 'ignored')),
  occurred_at timestamptz not null default now(),
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint messages_has_from_chk check (from_identity_id is not null or nullif(from_address, '') is not null),
  constraint messages_has_to_chk check (to_identity_id is not null or nullif(to_address, '') is not null)
);

create table if not exists halda.user_events (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id),
  conversation_id uuid references halda.conversations(id),
  message_id uuid references halda.messages(id),
  event_type text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.user_profile_snapshots (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id),
  user_profile_id uuid not null references halda.user_profiles(id),
  profile_version integer not null,
  lifecycle_stage text not null,
  agent_profile_key text not null,
  profile_json jsonb not null,
  snapshot_reason text not null default 'compaction'
    check (snapshot_reason in ('compaction', 'lifecycle_transition', 'milestone_update', 'manual_correction', 'backfill', 'debug')),
  created_from_message_id uuid references halda.messages(id),
  created_from_event_id uuid references halda.user_events(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.agent_open_loops (
  id uuid primary key default uuidv7(),
  user_id uuid not null references halda.users(id),
  conversation_id uuid references halda.conversations(id),
  source_message_id uuid references halda.messages(id),
  loop_type text not null,
  status text not null default 'open'
    check (status in ('open', 'snoozed', 'completed', 'cancelled', 'failed')),
  priority integer not null default 0,
  blocking boolean not null default false,
  prompt text,
  expected_response_schema jsonb,
  result jsonb,
  due_at timestamptz,
  snoozed_until timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.agent_events (
  id uuid primary key default uuidv7(),
  user_id uuid references halda.users(id),
  conversation_id uuid references halda.conversations(id),
  message_id uuid references halda.messages(id),
  agent_open_loop_id uuid references halda.agent_open_loops(id),
  event_type text not null,
  status text not null default 'succeeded'
    check (status in ('started', 'succeeded', 'failed', 'skipped')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.agent_runs (
  id uuid primary key default uuidv7(),
  user_id uuid references halda.users(id),
  conversation_id uuid references halda.conversations(id),
  trigger_message_id uuid references halda.messages(id),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  attempt_count integer not null default 0,
  locked_by text,
  locked_at timestamptz,
  lock_expires_at timestamptz,
  last_heartbeat_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists user_messaging_identities_platform_identity_uidx
  on halda.user_messaging_identities (messaging_platform_id, normalized_identity)
  where deleted_at is null;

create unique index if not exists user_profiles_user_uidx
  on halda.user_profiles (user_id)
  where deleted_at is null;

create index if not exists user_profiles_lifecycle_stage_idx
  on halda.user_profiles (lifecycle_stage, agent_profile_key)
  where deleted_at is null;

create unique index if not exists conversation_states_conversation_uidx
  on halda.conversation_states (conversation_id)
  where deleted_at is null;

create index if not exists conversation_states_user_idx
  on halda.conversation_states (user_id, id desc)
  where deleted_at is null;

create unique index if not exists user_profile_snapshots_version_uidx
  on halda.user_profile_snapshots (user_id, profile_version)
  where deleted_at is null;

create index if not exists user_profile_snapshots_user_idx
  on halda.user_profile_snapshots (user_id, id desc)
  where deleted_at is null;

create unique index if not exists messages_platform_external_message_uidx
  on halda.messages (messaging_platform_id, external_message_id)
  where external_message_id is not null and deleted_at is null;

create index if not exists messages_conversation_id_idx
  on halda.messages (conversation_id, id desc)
  where deleted_at is null;

create index if not exists messages_platform_thread_idx
  on halda.messages (messaging_platform_id, external_thread_id, id desc)
  where external_thread_id is not null and deleted_at is null;

create index if not exists conversations_user_status_idx
  on halda.conversations (user_id, status, id desc)
  where deleted_at is null;

create index if not exists user_events_user_idx
  on halda.user_events (user_id, occurred_at desc)
  where deleted_at is null;

create index if not exists agent_open_loops_user_status_idx
  on halda.agent_open_loops (user_id, status, priority desc, id desc)
  where deleted_at is null;

create index if not exists agent_events_user_idx
  on halda.agent_events (user_id, occurred_at desc)
  where deleted_at is null;

create index if not exists agent_runs_status_idx
  on halda.agent_runs (status, id)
  where deleted_at is null;

create index if not exists agent_runs_claim_idx
  on halda.agent_runs (status, lock_expires_at, id)
  where deleted_at is null;

create index if not exists user_institution_enrollments_user_idx
  on halda.user_institution_enrollments (user_id, enrollment_status)
  where deleted_at is null;

create unique index if not exists tertiary_institutions_ipeds_uidx
  on halda.tertiary_institutions (ipeds_unit_id)
  where ipeds_unit_id is not null and deleted_at is null;

create or replace function halda.set_modified_at()
returns trigger
language plpgsql
as $$
begin
  new.modified_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'users',
    'user_profiles',
    'messaging_platforms',
    'user_messaging_identities',
    'pre_tertiary_institutions',
    'tertiary_institutions',
    'user_institution_enrollments',
    'conversations',
    'conversation_states',
    'messages',
    'user_events',
    'user_profile_snapshots',
    'agent_open_loops',
    'agent_events',
    'agent_runs'
  ]
  loop
    execute format('drop trigger if exists trg_set_modified_at on halda.%I', table_name);
    execute format(
      'create trigger trg_set_modified_at before update on halda.%I for each row execute function halda.set_modified_at()',
      table_name
    );
  end loop;
end $$;

insert into halda.messaging_platforms (platform_key, display_name)
values
  ('gmail', 'Gmail'),
  ('website', 'Website'),
  ('mobile_app', 'Mobile App'),
  ('sms', 'SMS'),
  ('imessage', 'iMessage')
on conflict (platform_key) do update
set display_name = excluded.display_name,
    modified_at = now();
