// Domain types for the Research tab.
// These mirror the shape of College Scorecard data we plan to ingest later,
// but for the demo they are populated from the seeded data in `data.ts`.

export type CampusSetting = "urban" | "suburban" | "rural";
export type SchoolKind = "public" | "private";

/** Average net price a family actually pays, bucketed by household income. */
export interface NetPriceByIncome {
  /** $0–$30k household income */
  band0_30k: number;
  /** $30k–$48k */
  band30_48k: number;
  /** $48k–$75k */
  band48_75k: number;
  /** $75k–$110k */
  band75_110k: number;
  /** $110k+ */
  band110kPlus: number;
}

export interface ProgramInfo {
  /** Major / program name, e.g. "Computer Science". */
  major: string;
  /** Whether the school offers the student's intended major. */
  offered: boolean;
  /** Relative program strength signal for the demo (0–100). */
  strength: number;
  /** Median earnings 10yr after entry for graduates of this field ($/yr). */
  medianEarnings: number;
  /** Careers this program commonly leads to. */
  careers: string[];
  /** A short, concrete distinguishing fact. */
  highlight: string;
}

export interface School {
  id: string;
  name: string;
  city: string;
  state: string;
  kind: SchoolKind;
  setting: CampusSetting;
  /** Undergraduate enrollment. */
  size: number;
  /** Admit rate 0–1. */
  admitRate: number;
  /** Middle-50 SAT range for admitted students. */
  satRange: [number, number];
  /** 6-year graduation rate 0–1. */
  gradRate: number;
  /** Published sticker cost of attendance for the year ($). */
  stickerPrice: number;
  netPriceByIncome: NetPriceByIncome;
  /** In-state for the seeded student? Drives public-school pricing context. */
  inState: boolean;
  /** Median earnings 10yr after entry, all graduates ($/yr). */
  medianEarnings: number;
  /** Program data for the student's intended major. */
  program: ProgramInfo;
  /** Short blurb shown in cards. */
  blurb: string;
}

export interface StudentProfile {
  name: string;
  grade: "sophomore" | "junior" | "senior" | "transfer";
  homeState: string;
  /** Self-reported / inferred GPA on a 4.0 scale. */
  gpa: number;
  /** Best SAT total. */
  sat: number;
  intendedMajor: string;
  careerInterest: string;
  /** Annual all-in budget the family is comfortable paying ($). */
  budget: number;
  /** Household income, used for net-price estimates ($). */
  householdIncome: number;
  /** Number of people in the household, used for the EFC-ish estimate. */
  householdSize: number;
  firstGen: boolean;
  /** Campus settings the student is drawn to. */
  settingPreferences: CampusSetting[];
  /** Things the student says matter to them. */
  priorities: string[];
}

export type ScholarshipStatus =
  | "not_started"
  | "tracking"
  | "in_progress"
  | "submitted"
  | "won";

export interface Scholarship {
  id: string;
  name: string;
  sponsor: string;
  /** Award amount in dollars (max if a range). */
  amount: number;
  /** Whether `amount` renews each year. */
  renewable: boolean;
  /** ISO date (YYYY-MM-DD). */
  deadline: string;
  /** Plain-English eligibility lines. */
  eligibility: string[];
  /** Structured eligibility signals we can match against the profile. */
  match: {
    states?: string[];
    majors?: string[];
    minGpa?: number;
    firstGenOnly?: boolean;
  };
  effortHours: number;
  status: ScholarshipStatus;
  url: string;
}

export type VisitMode = "in_person" | "virtual";
export type VisitStatus = "idea" | "planned" | "scheduled" | "done";

export interface CampusVisit {
  schoolId: string;
  mode: VisitMode;
  status: VisitStatus;
  /** ISO date or empty if not scheduled. */
  date: string;
  /** Logistics / checklist items the student ticks off. */
  checklist: { id: string; label: string; done: boolean }[];
}
