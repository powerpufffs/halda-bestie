import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { sql, type SQL } from "drizzle-orm";
import { createDatabase } from "../db/client.ts";
import {
  SCORECARD_INSTITUTION_URL,
  SCORECARD_SOURCE_KEY,
  SCORECARD_SOURCE_VERSION,
  scorecardFields,
  type ScorecardField,
  type ScorecardRow,
} from "./scorecard-fields.ts";

const execFileAsync = promisify(execFile);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to import College Scorecard data.");
}

const db = createDatabase(databaseUrl);

await importScorecardInstitutions();
process.exit(0);

async function importScorecardInstitutions(): Promise<void> {
  const workdir = await mkdtemp(path.join(tmpdir(), "halda-scorecard-"));
  try {
    const zipPath = path.join(workdir, "scorecard-institutions.zip");
    const csvPath = path.join(workdir, "Most-Recent-Cohorts-Institution.csv");

    console.log(`[scorecard] downloading ${SCORECARD_INSTITUTION_URL}`);
    const response = await fetch(SCORECARD_INSTITUTION_URL);
    if (!response.ok) {
      throw new Error(`Failed to download Scorecard zip: ${response.status} ${response.statusText}`);
    }
    await writeFile(zipPath, Buffer.from(await response.arrayBuffer()));

    await execFileAsync("unzip", ["-p", zipPath, "Most-Recent-Cohorts-Institution.csv"], {
      maxBuffer: 140 * 1024 * 1024,
    }).then(({ stdout }) => writeFile(csvPath, stdout));

    await upsertDataSource();

    const csv = await readFile(csvPath, "utf8");
    const rows = parseCsv(csv);
    const [header, ...records] = rows;
    if (!header) throw new Error("Scorecard CSV was empty.");

    const indexes = indexSelectedFields(header);
    const selectedRows = records
      .map((record) => selectedRow(record, indexes))
      .filter((row) => row.UNITID && row.INSTNM && integerValue(row.UNITID) !== null);
    const skipped = records.length - selectedRows.length;
    let imported = 0;

    await chunks(selectedRows, 500).reduce(async (previous, chunk) => {
      await previous;
      await upsertInstitutionBatch(chunk);
      await upsertScorecardBatch(chunk);
      imported += chunk.length;
      console.log(`[scorecard] imported ${imported}`);
    }, Promise.resolve());

    console.log(`[scorecard] done imported=${imported} skipped=${skipped}`);
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
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
      ${SCORECARD_SOURCE_KEY},
      'College Scorecard',
      ${SCORECARD_INSTITUTION_URL},
      ${SCORECARD_SOURCE_VERSION},
      now(),
      ${jsonb({ source: "U.S. Department of Education College Scorecard" })}
    )
    on conflict (source_key) do update
    set source_url = excluded.source_url,
        source_version = excluded.source_version,
        retrieved_at = excluded.retrieved_at,
        metadata = excluded.metadata
  `);
}

async function upsertInstitutionBatch(batch: ScorecardRow[]): Promise<void> {
  if (batch.length === 0) return;

  await db.execute(sql`
    insert into halda.tertiary_institutions (
      name,
      institution_type,
      city,
      region,
      country_code,
      postal_code,
      ipeds_unit_id,
      ope_id,
      scorecard_id,
      metadata
    )
    values ${sql.join(batch.map(institutionValueSql), sql`, `)}
    on conflict (ipeds_unit_id) do update
    set name = excluded.name,
        institution_type = excluded.institution_type,
        city = excluded.city,
        region = excluded.region,
        postal_code = excluded.postal_code,
        ope_id = excluded.ope_id,
        scorecard_id = excluded.scorecard_id,
        metadata = halda.tertiary_institutions.metadata || excluded.metadata
  `);
}

async function upsertScorecardBatch(batch: ScorecardRow[]): Promise<void> {
  if (batch.length === 0) return;

  await db.execute(sql`
    insert into halda.tertiary_institution_scorecard (
      tertiary_institution_id,
      source_key,
      source_version,
      ipeds_unit_id,
      ope_id,
      school_url,
      net_price_calculator_url,
      latitude,
      longitude,
      predominant_degree,
      highest_degree,
      control,
      undergraduate_size,
      admission_rate,
      sat_average,
      act_midpoint,
      tuition_in_state,
      tuition_out_of_state,
      average_cost,
      net_price_public,
      net_price_private,
      completion_rate,
      retention_rate,
      median_earnings_10yr,
      percent_pell_grant,
      raw
    )
    values ${sql.join(batch.map(scorecardValueSql), sql`, `)}
    on conflict (source_key, source_version, ipeds_unit_id) do update
    set tertiary_institution_id = excluded.tertiary_institution_id,
        ope_id = excluded.ope_id,
        school_url = excluded.school_url,
        net_price_calculator_url = excluded.net_price_calculator_url,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        predominant_degree = excluded.predominant_degree,
        highest_degree = excluded.highest_degree,
        control = excluded.control,
        undergraduate_size = excluded.undergraduate_size,
        admission_rate = excluded.admission_rate,
        sat_average = excluded.sat_average,
        act_midpoint = excluded.act_midpoint,
        tuition_in_state = excluded.tuition_in_state,
        tuition_out_of_state = excluded.tuition_out_of_state,
        average_cost = excluded.average_cost,
        net_price_public = excluded.net_price_public,
        net_price_private = excluded.net_price_private,
        completion_rate = excluded.completion_rate,
        retention_rate = excluded.retention_rate,
        median_earnings_10yr = excluded.median_earnings_10yr,
        percent_pell_grant = excluded.percent_pell_grant,
        raw = excluded.raw
  `);
}

function institutionValueSql(row: ScorecardRow): SQL {
  const ipedsUnitId = integerValue(row.UNITID);
  if (ipedsUnitId === null) throw new Error("Missing UNITID in institution batch");

  return sql`(
    ${stringValue(row.INSTNM) ?? "Unknown institution"},
    ${institutionType(row)},
    ${stringValue(row.CITY)},
    ${stringValue(row.STABBR)},
    'US',
    ${stringValue(row.ZIP)},
    ${ipedsUnitId},
    ${stringValue(row.OPEID)},
    ${String(ipedsUnitId)},
    ${jsonb({
      source: SCORECARD_SOURCE_KEY,
      sourceVersion: SCORECARD_SOURCE_VERSION,
      control: integerValue(row.CONTROL),
      predominantDegree: integerValue(row.PREDDEG),
      highestDegree: integerValue(row.HIGHDEG),
    })}
  )`;
}

function scorecardValueSql(row: ScorecardRow): SQL {
  const ipedsUnitId = integerValue(row.UNITID);
  if (ipedsUnitId === null) throw new Error("Missing UNITID in scorecard batch");

  return sql`(
    (select id from halda.tertiary_institutions where ipeds_unit_id = ${ipedsUnitId} limit 1),
    ${SCORECARD_SOURCE_KEY},
    ${SCORECARD_SOURCE_VERSION},
    ${ipedsUnitId},
    ${stringValue(row.OPEID)},
    ${stringValue(row.INSTURL)},
    ${stringValue(row.NPCURL)},
    ${decimalValue(row.LATITUDE)},
    ${decimalValue(row.LONGITUDE)},
    ${integerValue(row.PREDDEG)},
    ${integerValue(row.HIGHDEG)},
    ${integerValue(row.CONTROL)},
    ${integerValue(row.UGDS)},
    ${decimalValue(row.ADM_RATE)},
    ${integerValue(row.SAT_AVG)},
    ${integerValue(row.ACTCMMID)},
    ${integerValue(row.TUITIONFEE_IN)},
    ${integerValue(row.TUITIONFEE_OUT)},
    ${integerValue(row.COSTT4_A)},
    ${integerValue(row.NPT4_PUB)},
    ${integerValue(row.NPT4_PRIV)},
    ${completionRate(row)},
    ${decimalValue(row.RET_FT4)},
    ${integerValue(row.MD_EARN_WNE_P10)},
    ${decimalValue(row.PCTPELL)},
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
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

function indexSelectedFields(header: string[]): Map<ScorecardField, number> {
  const indexByField = new Map(header.map((name, index) => [name, index]));
  return new Map(scorecardFields.map((field) => [field, indexByField.get(field) ?? -1]));
}

function selectedRow(record: string[], indexes: Map<ScorecardField, number>): ScorecardRow {
  return Object.fromEntries(
    [...indexes.entries()].map(([field, index]) => [field, index >= 0 ? record[index] ?? "" : ""]),
  ) as ScorecardRow;
}

function institutionType(row: ScorecardRow): string {
  const predominantDegree = integerValue(row.PREDDEG);
  const highestDegree = integerValue(row.HIGHDEG);
  if (highestDegree === 4) return "university";
  if (predominantDegree === 2 || highestDegree === 2) return "community_college";
  return "college";
}

function completionRate(row: ScorecardRow): number | null {
  return decimalValue(row.C150_4) ?? decimalValue(row.C150_L4);
}

function integerValue(value: string | undefined): number | null {
  const decimal = decimalValue(value);
  return decimal === null ? null : Math.round(decimal);
}

function decimalValue(value: string | undefined): number | null {
  const normalized = stringValue(value);
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
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
