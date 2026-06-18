import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { sql, type SQL } from "drizzle-orm";
import { createDatabase } from "../db/client.ts";

const execFileAsync = promisify(execFile);

const SCORECARD_PROGRAM_URL =
  "https://ed-public-download.scorecard.network/downloads/Most-Recent-Cohorts-Field-of-Study_06102026.zip";
const SCORECARD_PROGRAM_SOURCE_KEY = "college_scorecard_field_of_study";
const SCORECARD_PROGRAM_SOURCE_VERSION = "2026-06-10-most-recent-field-of-study";

const scorecardProgramFields = [
  "UNITID",
  "OPEID6",
  "INSTNM",
  "CONTROL",
  "MAIN",
  "CIPCODE",
  "CIPDESC",
  "CREDLEV",
  "CREDDESC",
  "IPEDSCOUNT1",
  "IPEDSCOUNT2",
  "DEBT_ALL_STGP_ANY_MDN",
  "EARN_MDN_1YR",
  "EARN_MDN_4YR",
  "EARN_MDN_5YR",
] as const;

type ScorecardProgramField = (typeof scorecardProgramFields)[number];
type ScorecardProgramRow = Partial<Record<ScorecardProgramField, string>>;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to import College Scorecard program data.");
}

const db = createDatabase(databaseUrl);

await importScorecardPrograms();
process.exit(0);

async function importScorecardPrograms(): Promise<void> {
  const workdir = await mkdtemp(path.join(tmpdir(), "halda-scorecard-programs-"));
  try {
    const zipPath = path.join(workdir, "scorecard-programs.zip");

    console.log(`[scorecard-programs] downloading ${SCORECARD_PROGRAM_URL}`);
    const response = await fetch(SCORECARD_PROGRAM_URL);
    if (!response.ok) {
      throw new Error(`Failed to download Scorecard program zip: ${response.status} ${response.statusText}`);
    }
    await writeFile(zipPath, Buffer.from(await response.arrayBuffer()));

    await ensureProgramSchema();
    await upsertDataSource();

    const { stdout: csv } = await execFileAsync(
      "unzip",
      ["-p", zipPath, "Most-Recent-Cohorts-Field-of-Study.csv"],
      { maxBuffer: 220 * 1024 * 1024 },
    );
    const rows = parseCsv(csv);
    const [header, ...records] = rows;
    if (!header) throw new Error("Scorecard program CSV was empty.");

    const indexes = indexSelectedFields(header);
    const selectedRows = records
      .map((record) => selectedRow(record, indexes))
      .filter((row) => row.UNITID && row.CIPCODE && integerValue(row.UNITID) !== null);
    const skipped = records.length - selectedRows.length;
    let imported = 0;

    await chunks(selectedRows, 1000).reduce(async (previous, chunk) => {
      await previous;
      await upsertProgramBatch(chunk);
      imported += chunk.length;
      console.log(`[scorecard-programs] imported ${imported}`);
    }, Promise.resolve());

    console.log(`[scorecard-programs] done imported=${imported} skipped=${skipped}`);
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}

async function ensureProgramSchema(): Promise<void> {
  await db.execute(sql`
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
    )
  `);
  await db.execute(sql`
    create index if not exists tertiary_institution_programs_unit_idx
      on halda.tertiary_institution_programs (ipeds_unit_id)
      where deleted_at is null
  `);
  await db.execute(sql`
    create index if not exists tertiary_institution_programs_cip_idx
      on halda.tertiary_institution_programs (cip_code, credential_level)
      where deleted_at is null
  `);
  await db.execute(sql`
    create index if not exists tertiary_institution_programs_cip_family_idx
      on halda.tertiary_institution_programs (cip_family, credential_level)
      where deleted_at is null
  `);
}

async function upsertDataSource(): Promise<void> {
  await db.execute(sql`
    insert into halda.public_data_sources (
      source_key,
      display_name,
      source_url,
      source_version,
      retrieved_at,
      metadata
    )
    values (
      ${SCORECARD_PROGRAM_SOURCE_KEY},
      'College Scorecard Field of Study',
      ${SCORECARD_PROGRAM_URL},
      ${SCORECARD_PROGRAM_SOURCE_VERSION},
      now(),
      ${jsonb({ source: "U.S. Department of Education College Scorecard Field of Study" })}
    )
    on conflict (source_key) do update
    set source_url = excluded.source_url,
        source_version = excluded.source_version,
        retrieved_at = excluded.retrieved_at,
        metadata = excluded.metadata
  `);
}

async function upsertProgramBatch(batch: ScorecardProgramRow[]): Promise<void> {
  if (batch.length === 0) return;

  await db.execute(sql`
    insert into halda.tertiary_institution_programs (
      tertiary_institution_id,
      source_key,
      source_version,
      ipeds_unit_id,
      ope_id,
      institution_name,
      control,
      main,
      cip_code,
      cip_family,
      cip_description,
      credential_level,
      credential_description,
      ipeds_count_1,
      ipeds_count_2,
      median_earnings_1yr,
      median_earnings_4yr,
      median_earnings_5yr,
      median_debt,
      raw
    )
    values ${sql.join(batch.map(programValueSql), sql`, `)}
    on conflict (source_key, source_version, ipeds_unit_id, cip_code, credential_level) do update
    set tertiary_institution_id = excluded.tertiary_institution_id,
        ope_id = excluded.ope_id,
        institution_name = excluded.institution_name,
        control = excluded.control,
        main = excluded.main,
        cip_family = excluded.cip_family,
        cip_description = excluded.cip_description,
        credential_description = excluded.credential_description,
        ipeds_count_1 = excluded.ipeds_count_1,
        ipeds_count_2 = excluded.ipeds_count_2,
        median_earnings_1yr = excluded.median_earnings_1yr,
        median_earnings_4yr = excluded.median_earnings_4yr,
        median_earnings_5yr = excluded.median_earnings_5yr,
        median_debt = excluded.median_debt,
        raw = excluded.raw,
        modified_at = now()
  `);
}

function programValueSql(row: ScorecardProgramRow): SQL {
  const ipedsUnitId = integerValue(row.UNITID);
  const cipCode = stringValue(row.CIPCODE);
  if (ipedsUnitId === null || !cipCode) throw new Error("Missing UNITID or CIPCODE in program batch");

  return sql`(
    (select id from halda.tertiary_institutions where ipeds_unit_id = ${ipedsUnitId} limit 1),
    ${SCORECARD_PROGRAM_SOURCE_KEY},
    ${SCORECARD_PROGRAM_SOURCE_VERSION},
    ${ipedsUnitId},
    ${stringValue(row.OPEID6)},
    ${stringValue(row.INSTNM)},
    ${stringValue(row.CONTROL)},
    ${integerValue(row.MAIN) === 1},
    ${cipCode},
    ${cipCode.slice(0, 2)},
    ${stringValue(row.CIPDESC)},
    ${integerValue(row.CREDLEV)},
    ${stringValue(row.CREDDESC)},
    ${integerValue(row.IPEDSCOUNT1)},
    ${integerValue(row.IPEDSCOUNT2)},
    ${integerValue(row.EARN_MDN_1YR)},
    ${integerValue(row.EARN_MDN_4YR)},
    ${integerValue(row.EARN_MDN_5YR)},
    ${integerValue(row.DEBT_ALL_STGP_ANY_MDN)},
    ${jsonb(row)}
  )`;
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function indexSelectedFields(header: string[]): Record<ScorecardProgramField, number> {
  return Object.fromEntries(
    scorecardProgramFields.map((field) => {
      const index = header.indexOf(field);
      if (index === -1) throw new Error(`Missing Scorecard program field: ${field}`);
      return [field, index];
    }),
  ) as Record<ScorecardProgramField, number>;
}

function selectedRow(
  record: string[],
  indexes: Record<ScorecardProgramField, number>,
): ScorecardProgramRow {
  return Object.fromEntries(
    scorecardProgramFields.map((field) => [field, record[indexes[field]]]),
  ) as ScorecardProgramRow;
}

function integerValue(value: string | undefined): number | null {
  const normalized = stringValue(value);
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function stringValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "NULL" || trimmed === "PS" || trimmed === "PrivacySuppressed") return null;
  return trimmed;
}

function jsonb(value: unknown): SQL {
  return sql`${JSON.stringify(value ?? {})}::jsonb`;
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}
