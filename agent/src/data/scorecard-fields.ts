export const SCORECARD_INSTITUTION_URL =
  "https://ed-public-download.scorecard.network/downloads/Most-Recent-Cohorts-Institution_06102026.zip";

export const SCORECARD_SOURCE_KEY = "college_scorecard";
export const SCORECARD_SOURCE_VERSION = "2026-06-10-most-recent-institution";

export const scorecardFields = [
  "UNITID",
  "OPEID",
  "INSTNM",
  "CITY",
  "STABBR",
  "ZIP",
  "INSTURL",
  "NPCURL",
  "PREDDEG",
  "HIGHDEG",
  "CONTROL",
  "LATITUDE",
  "LONGITUDE",
  "ADM_RATE",
  "SAT_AVG",
  "ACTCMMID",
  "UGDS",
  "TUITIONFEE_IN",
  "TUITIONFEE_OUT",
  "COSTT4_A",
  "NPT4_PUB",
  "NPT4_PRIV",
  "C150_4",
  "C150_L4",
  "RET_FT4",
  "MD_EARN_WNE_P10",
  "PCTPELL",
] as const;

export type ScorecardField = (typeof scorecardFields)[number];
export type ScorecardRow = Partial<Record<ScorecardField, string>>;

