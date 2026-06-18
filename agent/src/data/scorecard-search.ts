import { sql } from "drizzle-orm";
import { createDatabase } from "../db/client.ts";

export interface ScorecardInstitutionResult {
  id: string;
  name: string;
  city?: string;
  state?: string;
  institutionType: string;
  ipedsUnitId?: number;
  schoolUrl?: string;
  netPriceCalculatorUrl?: string;
  undergraduateSize?: number;
  admissionRate?: number;
  tuitionInState?: number;
  tuitionOutOfState?: number;
  averageCost?: number;
  netPricePublic?: number;
  netPricePrivate?: number;
  completionRate?: number;
  retentionRate?: number;
  medianEarnings10yr?: number;
}

interface ScorecardInstitutionRow {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  institution_type: string;
  ipeds_unit_id: number | null;
  school_url: string | null;
  net_price_calculator_url: string | null;
  undergraduate_size: number | null;
  admission_rate: string | number | null;
  tuition_in_state: number | null;
  tuition_out_of_state: number | null;
  average_cost: number | null;
  net_price_public: number | null;
  net_price_private: number | null;
  completion_rate: string | number | null;
  retention_rate: string | number | null;
  median_earnings_10yr: number | null;
}

export async function searchScorecardInstitutions(input: {
  query: string;
  state?: string;
  maxResults?: number;
}): Promise<ScorecardInstitutionResult[]> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return [];
  }

  const db = createDatabase(databaseUrl);
  const normalizedQuery = input.query.trim();
  if (!normalizedQuery) return [];

  const maxResults = Math.min(Math.max(input.maxResults ?? 5, 1), 10);
  const pattern = `%${normalizedQuery.replace(/[%_]/g, "\\$&")}%`;
  const state = input.state?.trim().toUpperCase();
  const rows = await db.execute(sql`
    select i.id,
           i.name,
           i.city,
           i.region,
           i.institution_type,
           i.ipeds_unit_id,
           s.school_url,
           s.net_price_calculator_url,
           s.undergraduate_size,
           s.admission_rate,
           s.tuition_in_state,
           s.tuition_out_of_state,
           s.average_cost,
           s.net_price_public,
           s.net_price_private,
           s.completion_rate,
           s.retention_rate,
           s.median_earnings_10yr
    from halda.tertiary_institutions i
    left join halda.tertiary_institution_scorecard s
      on s.tertiary_institution_id = i.id
     and s.deleted_at is null
    where i.deleted_at is null
      and lower(i.name) like lower(${pattern}) escape '\\'
      and (${state ?? null}::text is null or i.region = ${state ?? null})
    order by
      case when lower(i.name) = lower(${normalizedQuery}) then 0 else 1 end,
      coalesce(s.undergraduate_size, 0) desc,
      i.name asc
    limit ${maxResults}
  `);

  return (rows as unknown as ScorecardInstitutionRow[]).map(scorecardInstitutionFromRow);
}

export async function lookupScorecardInstitution(input: {
  query: string;
  state?: string;
}): Promise<ScorecardInstitutionResult | undefined> {
  return (await searchScorecardInstitutions({ ...input, maxResults: 1 }))[0];
}

function scorecardInstitutionFromRow(row: ScorecardInstitutionRow): ScorecardInstitutionResult {
  return stripUndefined({
    id: row.id,
    name: row.name,
    city: row.city ?? undefined,
    state: row.region ?? undefined,
    institutionType: row.institution_type,
    ipedsUnitId: row.ipeds_unit_id ?? undefined,
    schoolUrl: row.school_url ?? undefined,
    netPriceCalculatorUrl: row.net_price_calculator_url ?? undefined,
    undergraduateSize: row.undergraduate_size ?? undefined,
    admissionRate: numberValue(row.admission_rate),
    tuitionInState: row.tuition_in_state ?? undefined,
    tuitionOutOfState: row.tuition_out_of_state ?? undefined,
    averageCost: row.average_cost ?? undefined,
    netPricePublic: row.net_price_public ?? undefined,
    netPricePrivate: row.net_price_private ?? undefined,
    completionRate: numberValue(row.completion_rate),
    retentionRate: numberValue(row.retention_rate),
    medianEarnings10yr: row.median_earnings_10yr ?? undefined,
  });
}

function numberValue(value: number | string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
