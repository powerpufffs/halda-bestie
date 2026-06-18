create table if not exists halda.public_data_sources (
  id uuid primary key default uuidv7(),
  source_key text not null unique,
  display_name text not null,
  source_url text not null,
  source_version text,
  retrieved_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists halda.tertiary_institution_scorecard (
  id uuid primary key default uuidv7(),
  tertiary_institution_id uuid not null references halda.tertiary_institutions(id) on delete cascade,
  source_key text not null references halda.public_data_sources(source_key),
  source_version text not null,
  ipeds_unit_id integer not null,
  ope_id text,
  school_url text,
  net_price_calculator_url text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  predominant_degree integer,
  highest_degree integer,
  control integer,
  undergraduate_size integer,
  admission_rate numeric(8, 6),
  sat_average integer,
  act_midpoint integer,
  tuition_in_state integer,
  tuition_out_of_state integer,
  average_cost integer,
  net_price_public integer,
  net_price_private integer,
  completion_rate numeric(8, 6),
  retention_rate numeric(8, 6),
  median_earnings_10yr integer,
  percent_pell_grant numeric(8, 6),
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (source_key, source_version, ipeds_unit_id)
);

drop index if exists halda.tertiary_institutions_ipeds_unit_id_uidx;

create unique index if not exists tertiary_institutions_ipeds_unit_id_uidx
  on halda.tertiary_institutions (ipeds_unit_id);

create index if not exists tertiary_institutions_name_lower_idx
  on halda.tertiary_institutions (lower(name))
  where deleted_at is null;

create index if not exists tertiary_institutions_region_idx
  on halda.tertiary_institutions (region, id)
  where deleted_at is null;

create index if not exists tertiary_institution_scorecard_unit_idx
  on halda.tertiary_institution_scorecard (ipeds_unit_id)
  where deleted_at is null;

create index if not exists tertiary_institution_scorecard_size_idx
  on halda.tertiary_institution_scorecard (undergraduate_size desc)
  where deleted_at is null;
