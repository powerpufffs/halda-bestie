create table if not exists halda.tertiary_institution_programs (
  id uuid primary key default uuidv7(),
  tertiary_institution_id uuid references halda.tertiary_institutions(id) on delete cascade,
  source_key text not null references halda.public_data_sources(source_key),
  source_version text not null,
  ipeds_unit_id integer not null,
  ope_id text,
  institution_name text,
  control text,
  main boolean,
  cip_code text not null,
  cip_family text not null,
  cip_description text,
  credential_level integer,
  credential_description text,
  ipeds_count_1 integer,
  ipeds_count_2 integer,
  median_earnings_1yr integer,
  median_earnings_4yr integer,
  median_earnings_5yr integer,
  median_debt integer,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (source_key, source_version, ipeds_unit_id, cip_code, credential_level)
);

create index if not exists tertiary_institution_programs_unit_idx
  on halda.tertiary_institution_programs (ipeds_unit_id)
  where deleted_at is null;

create index if not exists tertiary_institution_programs_cip_idx
  on halda.tertiary_institution_programs (cip_code, credential_level)
  where deleted_at is null;

create index if not exists tertiary_institution_programs_cip_family_idx
  on halda.tertiary_institution_programs (cip_family, credential_level)
  where deleted_at is null;
