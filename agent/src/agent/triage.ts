import { inferLifecycleStage } from "./lifecycle.ts";
import type { LifecycleStage, StudentProfileState } from "./types.ts";

export type TriageIntent =
  | "acknowledgment"
  | "application"
  | "career"
  | "college_search"
  | "financial_aid"
  | "off_topic"
  | "small_talk"
  | "transfer"
  | "unknown";

export type TriageRole =
  | "student"
  | "supporter"
  | "counselor"
  | "institution_staff"
  | "not_college_bound"
  | "unknown";

export type TriageCollegeIntent = "looking_to_enter_college" | "helping_someone" | "not_looking" | "unknown";
export type TriageUrgency = "low" | "medium" | "high";

export interface TurnTriage {
  intent: TriageIntent;
  role: TriageRole;
  collegeIntent: TriageCollegeIntent;
  gradeLevel: string;
  lifecycleStage: LifecycleStage;
  lifecycleConfidence: number;
  lifecycleReason: string;
  acceptedSchool?: string;
  interests: string[];
  acknowledgmentOnly: boolean;
  correction: boolean;
  urgency: TriageUrgency;
  evidence: string[];
}

const interestPatterns: Array<{ interest: string; pattern: RegExp }> = [
  { interest: "nursing", pattern: /\bnursing\b/i },
  { interest: "computer science", pattern: /\b(cs|computer science|coding|programming|ai)\b/i },
  { interest: "business", pattern: /\bbusiness\b/i },
  { interest: "healthcare", pattern: /\bhealthcare\b/i },
];

const intentPatterns: Array<{ intent: TriageIntent; patterns: RegExp[] }> = [
  { intent: "acknowledgment", patterns: [/^(bet|ok|okay|k|cool|nice|word|gotcha|got it|sounds good|alright|all right|thanks|thank you|ty)\b[.!?]*$/i] },
  { intent: "small_talk", patterns: [/^(hi|hey|hello|yo|sup|what'?s up|wyd)\b/i, /\bhow are you\b/i, /\bwho are you\b/i] },
  { intent: "off_topic", patterns: [/\btell me a joke\b/i, /\bfavorite\b/i, /\bmovie\b/i, /\bmusic\b/i, /\bgame\b/i, /\bsports?\b/i, /\bweather\b/i, /\bwhat should i eat\b/i] },
  { intent: "transfer", patterns: [/\btransfer\b/i, /\bcredits?\b/i, /\bcommunity college\b/i] },
  { intent: "financial_aid", patterns: [/\bscholarship/i, /\bfafsa\b/i, /\bfinancial aid\b/i, /\bcost\b/i, /\baid\b/i, /\btuition\b/i] },
  { intent: "application", patterns: [/\bapply\b/i, /\bapplication\b/i, /\bessay\b/i, /\bdeadline\b/i, /\baccepted\s+(to|into|at)\b/i, /\badmitted\s+(to|into|at)\b/i, /\bgot\s+(accepted|into)\b/i] },
  { intent: "career", patterns: [/\bcareer\b/i, /\bmajor\b/i, /\bjob\b/i, /\bwant to do\b/i, /\bnursing\b/i, /\bhealthcare\b/i, /\bcomputer science\b/i, /\bcoding\b/i, /\bbusiness\b/i] },
  { intent: "college_search", patterns: [/\bschool\b/i, /\bcollege\b/i, /\buniversity\b/i, /\buvu\b/i] },
];

export function triageTurn(text: string, profile: StudentProfileState): TurnTriage {
  const normalized = text.toLowerCase();
  const lifecycle = inferLifecycleStage(text, profile);
  const gradeLevel = detectGradeLevel(normalized);
  const role = detectRole(normalized) ?? inferRoleFromGrade(gradeLevel);
  const collegeIntent = detectCollegeIntent(normalized, role, gradeLevel);
  const acceptedSchool = extractAcceptedSchool(text);
  const interests = interestPatterns.filter(({ pattern }) => pattern.test(text)).map(({ interest }) => interest);
  const acknowledgmentOnly = detectAcknowledgmentOnly(text);
  const correction = detectCorrection(text);
  const intent = detectIntent(text);
  const urgency = detectUrgency(normalized);
  const evidence = buildEvidence({
    role,
    collegeIntent,
    gradeLevel,
    lifecycleStage: lifecycle.stage,
    lifecycleReason: lifecycle.reason,
    acceptedSchool,
    interests,
    acknowledgmentOnly,
    correction,
    urgency,
    intent,
  });

  return {
    intent,
    role: role ?? "unknown",
    collegeIntent: collegeIntent ?? "unknown",
    gradeLevel: gradeLevel ?? "unknown",
    lifecycleStage: lifecycle.stage,
    lifecycleConfidence: lifecycle.confidence,
    lifecycleReason: lifecycle.reason,
    acceptedSchool,
    interests,
    acknowledgmentOnly,
    correction,
    urgency,
    evidence,
  };
}

function detectIntent(text: string): TriageIntent {
  return intentPatterns.find((candidate) => candidate.patterns.some((pattern) => pattern.test(text)))?.intent ?? "unknown";
}

function detectRole(text: string): TriageRole | undefined {
  if (/\b(not|don't|do not|dont|no)\b.{0,30}\b(college|university|school)\b/.test(text)) return "not_college_bound";
  if (/\b(parent|guardian|mom|dad)\b/.test(text) || /\bmy (son|daughter|kid|child)\b/.test(text)) return "supporter";
  if (/\b(counselor|advisor|teacher)\b/.test(text)) return "counselor";
  if (/\b(admissions|staff|recruiter|institution)\b/.test(text)) return "institution_staff";
  if (/\b(i am|i['\u2019]m|im)\b/.test(text) || /\b(student|sophomore|junior|senior|transfer)\b/.test(text)) return "student";
  return undefined;
}

function detectCollegeIntent(
  text: string,
  role: TriageRole | undefined,
  gradeLevel: string | undefined,
): TriageCollegeIntent | undefined {
  if (role === "not_college_bound") return "not_looking";
  if (role && ["supporter", "counselor", "institution_staff"].includes(role)) return "helping_someone";

  if (
    /\b(college|university|school|major|career|apply|application|fafsa|scholarship|transfer|tuition|admission|accepted|admitted|uvu)\b/.test(text) ||
    interestPatterns.some(({ pattern }) => pattern.test(text)) ||
    Boolean(gradeLevel)
  ) {
    return "looking_to_enter_college";
  }

  return undefined;
}

function detectGradeLevel(text: string): string | undefined {
  if (/\b9th\b|\bfreshman\b/.test(text) && !/\bcollege\b/.test(text)) return "9th";
  if (/\b10th\b|\bsophomore\b/.test(text)) return "10th";
  if (/\b11th\b|\bjunior\b/.test(text)) return "11th";
  if (/\b12th\b|\bsenior\b/.test(text)) return "12th";
  if (/\btransfer|transferring|community college\b/.test(text)) return "transfer";
  if (/\bin college\b|\bcollege student\b|\bfreshman in college\b|\balready in college\b/.test(text)) return "current_college";
  if (/\bgap year\b|\btook a year off\b/.test(text)) return "gap_year";
  return undefined;
}

function inferRoleFromGrade(gradeLevel: string | undefined): TriageRole | undefined {
  return gradeLevel ? "student" : undefined;
}

function extractAcceptedSchool(text: string): string | undefined {
  const acceptedMatch =
    text.match(
      /\b(?:got\s+accepted|accepted|admitted)\s+(?:into|to|at)\s+([a-z][a-z0-9&.' -]*?)(?=$|[.!?,;]|\s+(?:and|but|so|because|lol)\b)/i,
    ) ??
    text.match(/\bgot\s+into\s+([a-z][a-z0-9&.' -]*?)(?=$|[.!?,;]|\s+(?:and|but|so|because|lol)\b)/i);
  const school = acceptedMatch?.[1]?.trim().replace(/\s+/g, " ");

  return school ? formatSchoolName(school) : undefined;
}

function formatSchoolName(value: string): string {
  if (/[A-Z]{2,}/.test(value)) return value;

  return value
    .split(" ")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function detectAcknowledgmentOnly(text: string): boolean {
  return /^(bet|ok|okay|k|cool|nice|word|gotcha|got it|sounds good|alright|all right|thanks|thank you|ty)\b[.!?]*$/i.test(
    text.trim(),
  );
}

function detectCorrection(text: string): boolean {
  return /\b(that was(?:n['\u2019]t| not)|not)\b.{0,30}\b(what i (?:was )?ask(?:ing|ed)?|my question)\b/i.test(
    text,
  );
}

function detectUrgency(text: string): TriageUrgency {
  if (/\b(urgent|asap|today|tonight|deadline|due|panic|stressed|freaking out)\b/.test(text)) return "high";
  if (/\b(soon|this week|next week|worried|nervous)\b/.test(text)) return "medium";
  return "low";
}

function buildEvidence(input: {
  role?: TriageRole;
  collegeIntent?: TriageCollegeIntent;
  gradeLevel?: string;
  lifecycleStage: LifecycleStage;
  lifecycleReason: string;
  acceptedSchool?: string;
  interests: string[];
  acknowledgmentOnly: boolean;
  correction: boolean;
  urgency: TriageUrgency;
  intent: TriageIntent;
}): string[] {
  const evidence: string[] = [`intent:${input.intent}`];
  if (input.role) evidence.push(`role:${input.role}`);
  if (input.collegeIntent) evidence.push(`college_intent:${input.collegeIntent}`);
  if (input.gradeLevel) evidence.push(`grade:${input.gradeLevel}`);
  if (input.lifecycleStage !== "unknown" && input.lifecycleReason !== "kept existing lifecycle stage") {
    evidence.push(`lifecycle:${input.lifecycleStage}`);
  }
  if (input.acceptedSchool) evidence.push(`accepted_school:${input.acceptedSchool}`);
  for (const interest of input.interests) evidence.push(`interest:${interest}`);
  if (input.acknowledgmentOnly) evidence.push("acknowledgment_only");
  if (input.correction) evidence.push("correction");
  if (input.urgency !== "low") evidence.push(`urgency:${input.urgency}`);

  return evidence;
}
