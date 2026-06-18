import { sql, type SQL } from "drizzle-orm";
import { createDatabase } from "../db/client.ts";
import { normalizeUsState } from "./us-states.ts";

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
  percentPellGrant?: number;
  control?: number;
  predominantDegree?: number;
  highestDegree?: number;
  programMatches?: ScorecardProgramMatch[];
  programMedianEarnings4yr?: number;
  programMedianEarnings5yr?: number;
  programMedianDebt?: number;
}

export interface ScorecardProgramMatch {
  cipCode: string;
  cipDescription?: string;
  credentialLevel?: number;
  credentialDescription?: string;
  medianEarnings4yr?: number;
  medianEarnings5yr?: number;
  medianDebt?: number;
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
  percent_pell_grant: string | number | null;
  control: number | null;
  predominant_degree: number | null;
  highest_degree: number | null;
  program_matches: unknown;
  program_median_earnings_4yr: number | null;
  program_median_earnings_5yr: number | null;
  program_median_debt: number | null;
}

export interface CollegeDiscoveryInput {
  interests?: string[];
  targetMajor?: string;
  knownSchools?: string[];
  region?: string;
  budgetAnnual?: number;
  gpa?: number;
  firstGen?: boolean;
  isTransfer?: boolean;
  maxResults?: number;
}

export interface CollegeDiscoveryMatch extends ScorecardInstitutionResult {
  fitScore: number;
  estimatedNetPrice?: number;
  budgetFit?: "under_budget" | "near_budget" | "over_budget" | "unknown";
  admissionsRead?: "likely" | "target" | "reach" | "open_or_unknown" | "unknown";
  matchReasons: string[];
  caveats: string[];
  programFit?: {
    query: string;
    cipFamilies: string[];
    verified: boolean;
    note: string;
  };
}

export interface CollegeDiscoveryOutput {
  status: "ok" | "not_found" | "missing_database";
  source: "College Scorecard";
  query: {
    direction?: string;
    interests: string[];
    knownSchools: string[];
    region?: string;
    openAnywhere: boolean;
    budgetAnnual?: number;
    gpa?: number;
    firstGen?: boolean;
    isTransfer?: boolean;
    maxResults: number;
  };
  missingRecommendedInputs: string[];
  caveats: string[];
  results: CollegeDiscoveryMatch[];
}

const DIRECTION_MAP: Record<string, string[]> = {
  writing: ["0904", "2305", "0901"],
  journalism: ["0904", "0901"],
  english: ["2305", "0904", "0901"],
  communications: ["0901", "0904"],
  business: ["5202", "5214", "5208", "5203"],
  marketing: ["5214", "5202"],
  finance: ["5208", "5202"],
  accounting: ["5203", "5202"],
  entrepreneurship: ["5202", "5214"],
  healthcare: ["5138", "2601", "5120", "5100"],
  nursing: ["5138"],
  "pre-med": ["2601", "5138"],
  medicine: ["2601", "5138"],
  pharmacy: ["5120"],
  tech: ["1107", "1409"],
  technology: ["1107", "1409"],
  "computer science": ["1107"],
  cs: ["1107"],
  coding: ["1107", "1409"],
  software: ["1409", "1107"],
  data: ["1107"],
  engineering: ["1401", "1409", "1407"],
  "helping people": ["4407", "4201", "5100"],
  "social work": ["4407"],
  psychology: ["4201", "4407"],
  "mental health": ["4201", "4407"],
  education: ["1301"],
  teaching: ["1301"],
  art: ["5007", "5004", "5006"],
  design: ["5004", "5007"],
  "graphic design": ["5004"],
  film: ["5006", "5007"],
  creative: ["5004", "5007", "5006", "5009"],
  music: ["5009"],
  science: ["2601", "0301", "4005", "2701"],
  biology: ["2601"],
  environment: ["0301", "2601"],
  environmental: ["0301"],
  chemistry: ["4005", "2601"],
  math: ["2701", "1107"],
  law: ["4301", "4510"],
  "criminal justice": ["4301"],
  politics: ["4510", "4506"],
  "political science": ["4510"],
  economics: ["4506", "5208"],
  architecture: ["0402"],
  "physical therapy": ["5123"],
  sports: ["3101", "5202"],
  kinesiology: ["3101"],
};

const SCHOOL_ALIASES: Record<string, string> = {
  byu: "Brigham Young University",
  uvu: "Utah Valley University",
  "u of u": "University of Utah",
  "uofu": "University of Utah",
  "utah u": "University of Utah",
  usu: "Utah State University",
};

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
  const rawQuery = input.query.trim();
  const normalizedQuery = SCHOOL_ALIASES[rawQuery.toLowerCase()] ?? rawQuery;
  if (!normalizedQuery) return [];

  const maxResults = Math.min(Math.max(input.maxResults ?? 5, 1), 10);
  const escapedQuery = escapeLike(normalizedQuery);
  const pattern = `%${escapedQuery}%`;
  const prefixPattern = `${escapedQuery}%`;
  const collegeName = `${normalizedQuery} College`;
  const universityName = `${normalizedQuery} University`;
  const state = normalizeUsState(input.state);
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
           s.median_earnings_10yr,
           s.percent_pell_grant,
           s.control,
           s.predominant_degree,
           s.highest_degree,
           null::jsonb as program_matches,
           null::integer as program_median_earnings_4yr,
           null::integer as program_median_earnings_5yr,
           null::integer as program_median_debt
    from halda.tertiary_institutions i
    left join halda.tertiary_institution_scorecard s
      on s.tertiary_institution_id = i.id
     and s.deleted_at is null
    where i.deleted_at is null
      and lower(i.name) like lower(${pattern}) escape '\\'
      and (${state ?? null}::text is null or i.region = ${state ?? null})
    order by
      case
        when lower(i.name) = lower(${normalizedQuery}) then 0
        when lower(i.name) = lower(${collegeName}) then 1
        when lower(i.name) = lower(${universityName}) then 1
        when lower(i.name) like lower(${prefixPattern}) escape '\\' then 2
        else 3
      end,
      coalesce(s.undergraduate_size, 0) desc,
      i.name asc
    limit ${maxResults}
  `);

  return (rows as unknown as ScorecardInstitutionRow[]).map(scorecardInstitutionFromRow);
}

export async function discoverScorecardInstitutions(
  input: CollegeDiscoveryInput,
): Promise<CollegeDiscoveryOutput> {
  const databaseUrl = process.env.DATABASE_URL;
  const maxResults = Math.min(Math.max(input.maxResults ?? 5, 1), 10);
  const interests = cleanStringArray(input.interests);
  const knownSchools = cleanStringArray(input.knownSchools);
  const direction = firstValue(input.targetMajor, ...interests);
  const cipCodes = cipCodesForDirection(direction);
  const programDataAvailable = databaseUrl !== undefined && cipCodes.length > 0
    ? await scorecardProgramsAvailable(databaseUrl)
    : false;
  const state = normalizeUsState(input.region);
  const openAnywhere = Boolean(
    input.region && !state && /\b(anywhere|open|nationwide|nationally|no preference)\b/i.test(input.region),
  );
  const query = {
    direction,
    interests,
    knownSchools,
    region: state,
    openAnywhere,
    budgetAnnual: input.budgetAnnual,
    gpa: input.gpa,
    firstGen: input.firstGen,
    isTransfer: input.isTransfer,
    maxResults,
  };
  const missingRecommendedInputs = missingCollegeDiscoveryInputs(query);

  if (!databaseUrl) {
    return {
      status: "missing_database",
      source: "College Scorecard",
      query,
      missingRecommendedInputs,
      caveats: ["database url is not configured, so local college discovery cannot run"],
      results: [],
    };
  }

  let rawResults = knownSchools.length > 0
    ? await lookupKnownSchools({
        knownSchools,
        state,
        cipCodes: programDataAvailable ? cipCodes : [],
        databaseUrl,
        maxResults,
      })
    : await rankedScorecardCandidates({
        databaseUrl,
        state,
        isTransfer: input.isTransfer,
        cipCodes: programDataAvailable ? cipCodes : [],
        maxResults: 80,
      });
  if (rawResults.length === 0 && !knownSchools.length && cipCodes.length > 0) {
    rawResults = await rankedScorecardCandidates({
      databaseUrl,
      state,
      isTransfer: input.isTransfer,
      cipCodes: [],
      maxResults: 80,
    });
  }
  const results = rawResults
    .map((school) => annotateDiscoveryMatch(school, input, direction, programDataAvailable))
    .sort((left, right) => right.fitScore - left.fitScore)
    .slice(0, maxResults);

  return {
    status: results.length > 0 ? "ok" : "not_found",
    source: "College Scorecard",
    query,
    missingRecommendedInputs,
    caveats: discoveryCaveats(direction, programDataAvailable),
    results,
  };
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
    percentPellGrant: numberValue(row.percent_pell_grant),
    control: row.control ?? undefined,
    predominantDegree: row.predominant_degree ?? undefined,
    highestDegree: row.highest_degree ?? undefined,
    programMatches: programMatchesValue(row.program_matches),
    programMedianEarnings4yr: row.program_median_earnings_4yr ?? undefined,
    programMedianEarnings5yr: row.program_median_earnings_5yr ?? undefined,
    programMedianDebt: row.program_median_debt ?? undefined,
  });
}

async function lookupKnownSchools(input: {
  knownSchools: string[];
  state?: string;
  cipCodes: string[];
  databaseUrl?: string;
  maxResults: number;
}): Promise<ScorecardInstitutionResult[]> {
  const matches = await Promise.all(
    input.knownSchools.map((query) => searchScorecardInstitutions({ query, state: input.state, maxResults: 1 })),
  );
  const schools = dedupeSchools(matches.flat()).slice(0, input.maxResults);
  if (!input.databaseUrl || input.cipCodes.length === 0) return schools;

  return enrichKnownSchoolPrograms({
    databaseUrl: input.databaseUrl,
    schools,
    cipCodes: input.cipCodes,
  });
}

async function enrichKnownSchoolPrograms(input: {
  databaseUrl: string;
  schools: ScorecardInstitutionResult[];
  cipCodes: string[];
}): Promise<ScorecardInstitutionResult[]> {
  const ipedsUnitIds = input.schools
    .map((school) => school.ipedsUnitId)
    .filter((id): id is number => typeof id === "number");
  if (ipedsUnitIds.length === 0) return input.schools;

  const db = createDatabase(input.databaseUrl);
  const rows = await db.execute(sql`
    select ipeds_unit_id,
           jsonb_agg(
             jsonb_build_object(
               'cipCode', cip_code,
               'cipDescription', cip_description,
               'credentialLevel', credential_level,
               'credentialDescription', credential_description,
               'medianEarnings4yr', median_earnings_4yr,
               'medianEarnings5yr', median_earnings_5yr,
               'medianDebt', median_debt
             )
             order by coalesce(median_earnings_4yr, median_earnings_5yr, 0) desc
           ) as program_matches,
           max(median_earnings_4yr) as program_median_earnings_4yr,
           max(median_earnings_5yr) as program_median_earnings_5yr,
           max(median_debt) as program_median_debt
    from halda.tertiary_institution_programs
    where deleted_at is null
      and ipeds_unit_id in (${sql.join(ipedsUnitIds.map((id) => sql`${id}`), sql`, `)})
      and cip_code in (${sql.join(input.cipCodes.map((code) => sql`${code}`), sql`, `)})
      and coalesce(credential_level, 3) in (2, 3)
    group by ipeds_unit_id
  `);
  const programsByUnitId = new Map(
    (rows as unknown as Array<{
      ipeds_unit_id: number;
      program_matches: unknown;
      program_median_earnings_4yr: number | null;
      program_median_earnings_5yr: number | null;
      program_median_debt: number | null;
    }>).map((row) => [row.ipeds_unit_id, row]),
  );

  return input.schools.map((school) => {
    const programs = school.ipedsUnitId ? programsByUnitId.get(school.ipedsUnitId) : undefined;
    if (!programs) return school;
    return {
      ...school,
      programMatches: programMatchesValue(programs.program_matches),
      programMedianEarnings4yr: programs.program_median_earnings_4yr ?? undefined,
      programMedianEarnings5yr: programs.program_median_earnings_5yr ?? undefined,
      programMedianDebt: programs.program_median_debt ?? undefined,
    };
  });
}

async function rankedScorecardCandidates(input: {
  databaseUrl: string;
  state?: string;
  isTransfer?: boolean;
  cipCodes: string[];
  maxResults: number;
}): Promise<ScorecardInstitutionResult[]> {
  const db = createDatabase(input.databaseUrl);
  const state = input.state;
  const isTransfer = input.isTransfer === true;
  const programJoin = programJoinSql(input.cipCodes);
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
           s.median_earnings_10yr,
           s.percent_pell_grant,
           s.control,
           s.predominant_degree,
           s.highest_degree,
           p.program_matches,
           p.program_median_earnings_4yr,
           p.program_median_earnings_5yr,
           p.program_median_debt
    from halda.tertiary_institutions i
    left join halda.tertiary_institution_scorecard s
      on s.tertiary_institution_id = i.id
     and s.deleted_at is null
    ${programJoin}
    where i.deleted_at is null
      and (${state ?? null}::text is null or i.region = ${state ?? null})
      and coalesce(s.undergraduate_size, 0) >= 500
      and (${isTransfer}::boolean = true or coalesce(s.highest_degree, 0) >= 3)
    order by
      coalesce(s.completion_rate, 0) desc,
      coalesce(s.retention_rate, 0) desc,
      coalesce(p.program_median_earnings_4yr, p.program_median_earnings_5yr, 0) desc,
      coalesce(s.median_earnings_10yr, 0) desc,
      coalesce(s.undergraduate_size, 0) desc
    limit ${input.maxResults}
  `);

  return (rows as unknown as ScorecardInstitutionRow[]).map(scorecardInstitutionFromRow);
}

function annotateDiscoveryMatch(
  school: ScorecardInstitutionResult,
  input: CollegeDiscoveryInput,
  direction: string | undefined,
  programDataAvailable: boolean,
): CollegeDiscoveryMatch {
  const estimatedNetPrice = estimateNetPrice(school);
  const budgetFit = readBudgetFit(estimatedNetPrice, input.budgetAnnual);
  const admissionsRead = readAdmissionsFit(school.admissionRate, input.gpa);
  const programFit = direction ? programFitForSchool(direction, school, programDataAvailable) : undefined;
  const program = school.programMatches?.[0];
  const matchReasons = [
    school.state ? `${school.city ? `${school.city}, ` : ""}${school.state}` : undefined,
    program?.cipDescription ? `verified ${program.cipDescription} program` : undefined,
    school.programMedianEarnings4yr
      ? `$${school.programMedianEarnings4yr.toLocaleString()} median program earnings 4 years out`
      : undefined,
    estimatedNetPrice ? `estimated net price about $${estimatedNetPrice.toLocaleString()}/yr` : undefined,
    school.completionRate ? `${Math.round(school.completionRate * 100)}% completion rate` : undefined,
    school.medianEarnings10yr ? `$${school.medianEarnings10yr.toLocaleString()} median earnings 10 years out` : undefined,
    budgetReason(budgetFit),
    input.firstGen && school.percentPellGrant && school.percentPellGrant >= 0.3
      ? "serves a meaningful pell population"
      : undefined,
    programFit ? programFit.note : undefined,
  ].filter((reason): reason is string => Boolean(reason));

  return {
    ...school,
    fitScore: scoreSchool(school, input),
    estimatedNetPrice,
    budgetFit,
    admissionsRead,
    matchReasons,
    caveats: discoveryCaveats(direction, programDataAvailable),
    programFit,
  };
}

function scoreSchool(school: ScorecardInstitutionResult, input: CollegeDiscoveryInput): number {
  const netPrice = estimateNetPrice(school);
  const budgetFit = readBudgetFit(netPrice, input.budgetAnnual);
  const completion = clamp01(school.completionRate ?? 0.35);
  const retention = clamp01(school.retentionRate ?? 0.65);
  const earningsValue = school.programMedianEarnings4yr ?? school.programMedianEarnings5yr ?? school.medianEarnings10yr;
  const earnings = Math.min((earningsValue ?? 42000) / 85000, 1);
  const affordability = affordabilityScore(netPrice, input.budgetAnnual);
  const admissions = admissionsScore(school.admissionRate, input.gpa);
  const pellBoost = input.firstGen && (school.percentPellGrant ?? 0) >= 0.3 ? 5 : 0;
  const budgetPenalty = budgetFit === "over_budget" ? -8 : 0;

  return Math.round(
    (completion * 28 + retention * 12 + earnings * 22 + affordability * 24 + admissions * 14 + pellBoost + budgetPenalty) *
      10,
  ) / 10;
}

function estimateNetPrice(school: ScorecardInstitutionResult): number | undefined {
  return school.netPricePublic ?? school.netPricePrivate ?? school.averageCost;
}

function readBudgetFit(
  netPrice: number | undefined,
  budgetAnnual: number | undefined,
): CollegeDiscoveryMatch["budgetFit"] {
  if (!netPrice || !budgetAnnual) return "unknown";
  if (netPrice <= budgetAnnual) return "under_budget";
  if (netPrice <= budgetAnnual * 1.2) return "near_budget";
  return "over_budget";
}

function affordabilityScore(netPrice: number | undefined, budgetAnnual: number | undefined): number {
  if (!netPrice) return 0.45;
  if (!budgetAnnual) return clamp01(1 - netPrice / 45000);
  if (netPrice <= budgetAnnual) return 1;
  if (netPrice <= budgetAnnual * 1.2) return 0.72;
  if (netPrice <= budgetAnnual * 1.5) return 0.42;
  return 0.12;
}

function readAdmissionsFit(
  admissionRate: number | undefined,
  gpa: number | undefined,
): CollegeDiscoveryMatch["admissionsRead"] {
  if (!admissionRate) return "open_or_unknown";
  if (!gpa) return "unknown";
  if (admissionRate >= 0.75) return gpa >= 2.7 ? "likely" : "target";
  if (admissionRate >= 0.5) return gpa >= 3.3 ? "likely" : gpa >= 2.8 ? "target" : "reach";
  if (admissionRate >= 0.25) return gpa >= 3.7 ? "target" : "reach";
  return gpa >= 3.9 ? "target" : "reach";
}

function admissionsScore(admissionRate: number | undefined, gpa: number | undefined): number {
  if (!admissionRate) return 0.65;
  if (!gpa) return clamp01(admissionRate);
  const read = readAdmissionsFit(admissionRate, gpa);
  if (read === "likely") return 1;
  if (read === "target") return 0.68;
  if (read === "reach") return 0.28;
  return 0.55;
}

function budgetReason(budgetFit: CollegeDiscoveryMatch["budgetFit"]): string | undefined {
  if (budgetFit === "under_budget") return "under stated budget";
  if (budgetFit === "near_budget") return "near stated budget";
  if (budgetFit === "over_budget") return "over stated budget, check aid";
  return undefined;
}

async function scorecardProgramsAvailable(databaseUrl: string): Promise<boolean> {
  const db = createDatabase(databaseUrl);
  const rows = await db.execute(sql`
    select to_regclass('halda.tertiary_institution_programs') is not null as available
  `);
  return Boolean((rows as unknown as Array<{ available: boolean }>)[0]?.available);
}

function programJoinSql(cipCodes: string[]): SQL {
  if (cipCodes.length === 0) {
    return sql`
      left join lateral (
        select null::jsonb as program_matches,
               null::integer as program_median_earnings_4yr,
               null::integer as program_median_earnings_5yr,
               null::integer as program_median_debt
      ) p on true
    `;
  }

  return sql`
    inner join (
      select ipeds_unit_id,
             jsonb_agg(
               jsonb_build_object(
                 'cipCode', cip_code,
                 'cipDescription', cip_description,
                 'credentialLevel', credential_level,
                 'credentialDescription', credential_description,
                 'medianEarnings4yr', median_earnings_4yr,
                 'medianEarnings5yr', median_earnings_5yr,
                 'medianDebt', median_debt
               )
               order by coalesce(median_earnings_4yr, median_earnings_5yr, 0) desc
             ) as program_matches,
             max(median_earnings_4yr) as program_median_earnings_4yr,
             max(median_earnings_5yr) as program_median_earnings_5yr,
             max(median_debt) as program_median_debt
      from halda.tertiary_institution_programs
      where deleted_at is null
        and cip_code in (${sql.join(cipCodes.map((code) => sql`${code}`), sql`, `)})
        and coalesce(credential_level, 3) in (2, 3)
      group by ipeds_unit_id
    ) p on p.ipeds_unit_id = i.ipeds_unit_id
  `;
}

function programFitForSchool(
  direction: string,
  school: ScorecardInstitutionResult,
  programDataAvailable: boolean,
): CollegeDiscoveryMatch["programFit"] {
  const normalized = direction.toLowerCase().trim();
  const cipFamilies = cipCodesForDirection(direction);
  const verified = Boolean(school.programMatches?.length);
  return {
    query: direction,
    cipFamilies,
    verified,
    note: verified
      ? `program match verified from Scorecard field-of-study data for ${normalized}`
      : programDataAvailable
        ? "no exact field-of-study row matched this direction, so program fit is broad"
        : cipFamilies.length > 0
          ? `interest maps to cip families ${cipFamilies.join(", ")}, but program rows are not imported yet`
          : "program fit is inferred from the stated interest",
  };
}

function discoveryCaveats(direction: string | undefined, programDataAvailable: boolean): string[] {
  return [
    "scorecard values are imported institution-level data",
    direction && programDataAvailable
      ? "program fit uses imported Scorecard field-of-study rows when available"
      : undefined,
    direction && !programDataAvailable ? "program-level fit is inferred until field-of-study rows are imported" : undefined,
    "net price is historical average aid-adjusted price, not a personal financial aid offer",
    "admissions read is rough and should not be presented as a guarantee",
  ].filter((caveat): caveat is string => Boolean(caveat));
}

function cipCodesForDirection(direction: string | undefined): string[] {
  if (!direction) return [];
  return DIRECTION_MAP[direction.toLowerCase().trim()] ?? [];
}

function programMatchesValue(value: unknown): ScorecardProgramMatch[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const matches: ScorecardProgramMatch[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const cipCode = typeof record.cipCode === "string" ? record.cipCode : undefined;
    if (!cipCode) continue;
    matches.push(
      stripUndefined({
        cipCode,
        cipDescription: readString(record.cipDescription),
        credentialLevel: readNumber(record.credentialLevel),
        credentialDescription: readString(record.credentialDescription),
        medianEarnings4yr: readNumber(record.medianEarnings4yr),
        medianEarnings5yr: readNumber(record.medianEarnings5yr),
        medianDebt: readNumber(record.medianDebt),
      }),
    );
  }

  return matches.length > 0 ? matches : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function missingCollegeDiscoveryInputs(
  query: CollegeDiscoveryOutput["query"],
): string[] {
  return [
    !query.direction && query.knownSchools.length === 0 ? "direction_or_known_schools" : undefined,
    !query.region && !query.openAnywhere && query.knownSchools.length === 0 ? "region_or_open_anywhere" : undefined,
    query.budgetAnnual === undefined ? "budgetAnnual" : undefined,
    query.gpa === undefined ? "gpa" : undefined,
  ].filter((field): field is string => Boolean(field));
}

function dedupeSchools(schools: ScorecardInstitutionResult[]): ScorecardInstitutionResult[] {
  const seen = new Set<string>();
  return schools.filter((school) => {
    const key = school.ipedsUnitId ? String(school.ipedsUnitId) : school.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanStringArray(value: string[] | undefined): string[] {
  return [...new Set((value ?? []).map((item) => item.trim()).filter(Boolean))];
}

function firstValue(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value && value.trim().length > 0)?.trim();
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function numberValue(value: number | string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function escapeLike(value: string): string {
  return value.replace(/[%_]/g, "\\$&");
}
