import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import type { LlmRuntime } from "./generation.ts";
import type { AgentConversationMessage, AgentOpenLoop, LifecycleStage, StudentProfileState } from "./types.ts";

export type TriageIntent =
  | "application"
  | "activities"
  | "career"
  | "chat"
  | "college_search"
  | "decision"
  | "essay"
  | "email"
  | "financial_aid"
  | "interview"
  | "transfer";

export type TriageRole =
  | "student"
  | "supporter"
  | "counselor"
  | "institution_staff"
  | "not_college_bound"
  | "unknown";

export type TriageCollegeIntent = "looking_to_enter_college" | "helping_someone" | "not_looking" | "unknown";
export type TriageUrgency = "low" | "medium" | "high";
export type TriageOnboardingResolution = "full_answer" | "partial_answer" | "topic_switch" | "no_answer";

export interface TriageOpenLoopPlan {
  loopType: string;
  prompt: string;
  priority: number;
  blocking?: boolean;
}

export interface TriageOnboardingPlan {
  firstName?: string;
  highSchool?: string;
  role?: TriageRole;
  collegeIntent?: TriageCollegeIntent;
  gradeLevel?: string;
  lifecycleStage?: LifecycleStage;
  complete?: boolean;
  resolution?: TriageOnboardingResolution;
  nextLoop?: TriageOpenLoopPlan;
  completeLoopTypes: string[];
  evidence: string[];
}

export interface TurnTriage {
  source: "llm" | "fallback";
  intent: TriageIntent;
  role: TriageRole;
  collegeIntent: TriageCollegeIntent;
  gradeLevel: string;
  lifecycleStage: LifecycleStage;
  lifecycleConfidence: number;
  lifecycleReason: string;
  firstName?: string;
  highSchool?: string;
  acceptedSchool?: string;
  interests: string[];
  acknowledgmentOnly: boolean;
  correction: boolean;
  onboardingRelevant: boolean;
  onboarding: TriageOnboardingPlan;
  urgency: TriageUrgency;
  evidence: string[];
}

interface TriageOptions {
  runtime?: LlmRuntime;
  recentMessages?: AgentConversationMessage[];
  openLoops?: AgentOpenLoop[];
}

type ChatCompletionCreateBody = ChatCompletionCreateParamsNonStreaming & {
  thinking?: {
    type: "disabled";
  };
};

export async function triageTurn(
  text: string,
  profile: StudentProfileState,
  options: TriageOptions = {},
): Promise<TurnTriage> {
  if (options.runtime) {
    const llmTriage = await triageTurnWithLlm(text, profile, { ...options, runtime: options.runtime });
    if (llmTriage) return llmTriage;
  }

  return buildUnknownTriage(profile);
}

async function triageTurnWithLlm(
  text: string,
  profile: StudentProfileState,
  options: Required<Pick<TriageOptions, "runtime">> & TriageOptions,
): Promise<TurnTriage | undefined> {
  try {
    const completion = await options.runtime.client.chat.completions.create(withMoonshotThinkingDisabled(
      options.runtime.config.model,
      {
        model: options.runtime.config.model,
        messages: [
          {
            role: "system",
            content: [
              "You classify one student message for Halda, a college guidance agent.",
              "Return only valid JSON. Do not include markdown.",
              "Infer meaning from the message and recent context. Prefer unknown/null over guessing.",
              "Use these exact enum values when applicable:",
              "intent: application, activities, career, chat, college_search, decision, essay, email, financial_aid, interview, transfer",
              "role: student, supporter, counselor, institution_staff, not_college_bound, unknown",
              "collegeIntent: looking_to_enter_college, helping_someone, not_looking, unknown",
              "lifecycleStage: unknown, freshman, sophomore, junior, senior, transfer, current_college, gap_year",
              "urgency: low, medium, high",
              "gradeLevel should be a natural compact value like 9th, 10th, 11th, 12th, transfer, current_college, gap_year, or unknown.",
              "firstName and highSchool should be null unless the user gave that information.",
              "Do not treat a greeting, acknowledgment, slang, grade, or role as a person's name unless the user clearly says it is their name.",
              "onboardingRelevant is false only when the message is noise, empty, spam, or clearly not a real student/supporter turn.",
              "You own onboarding decisions. Set onboarding.nextLoop to the next thing Halda should remember to ask, or null if no onboarding loop should be open.",
              "Return shape: {\"intent\":\"chat\",\"role\":\"unknown\",\"collegeIntent\":\"unknown\",\"gradeLevel\":\"unknown\",\"lifecycleStage\":\"unknown\",\"lifecycleConfidence\":0,\"lifecycleReason\":\"...\",\"firstName\":null,\"highSchool\":null,\"acceptedSchool\":null,\"interests\":[],\"acknowledgmentOnly\":false,\"correction\":false,\"onboardingRelevant\":true,\"urgency\":\"low\",\"evidence\":[],\"onboarding\":{\"firstName\":null,\"highSchool\":null,\"role\":\"unknown\",\"collegeIntent\":\"unknown\",\"gradeLevel\":\"unknown\",\"lifecycleStage\":\"unknown\",\"complete\":false,\"resolution\":\"partial_answer\",\"nextLoop\":{\"loopType\":\"collect_first_name\",\"prompt\":\"what’s your first name?\",\"priority\":100},\"completeLoopTypes\":[],\"evidence\":[]}}",
            ].join("\n"),
          },
          {
            role: "user",
            content: JSON.stringify({
              currentProfile: {
                lifecycleStage: profile.lifecycleStage,
                lifecycleStageConfidence: profile.lifecycleStageConfidence,
                profileSummary: profile.profileSummary,
                facts: {
                  firstName: profile.facts.firstName,
                  highSchool: profile.facts.highSchool,
                  onboarding: profile.facts.onboarding,
                  gradeLevel: profile.facts.gradeLevel,
                  collegeIntent: profile.facts.collegeIntent,
                },
                interests: profile.interests,
                constraints: profile.constraints,
              },
              recentMessages: (options.recentMessages ?? []).slice(-6).map((message) => ({
                role: message.role,
                channel: message.channel,
                body: message.body,
              })),
              openLoops: (options.openLoops ?? []).map((loop) => ({
                loopType: loop.loopType,
                prompt: loop.prompt,
                priority: loop.priority,
              })),
              latestMessage: text,
            }),
          },
        ],
        temperature: 0,
        max_completion_tokens: 360,
      },
    ));

    return parseLlmTriage(completion.choices[0]?.message.content, profile);
  } catch {
    return undefined;
  }
}

const triageIntents: TriageIntent[] = [
  "application",
  "activities",
  "career",
  "chat",
  "college_search",
  "decision",
  "essay",
  "email",
  "financial_aid",
  "interview",
  "transfer",
];

const triageRoles: TriageRole[] = [
  "student",
  "supporter",
  "counselor",
  "institution_staff",
  "not_college_bound",
  "unknown",
];

const triageCollegeIntents: TriageCollegeIntent[] = [
  "looking_to_enter_college",
  "helping_someone",
  "not_looking",
  "unknown",
];

const lifecycleStages: LifecycleStage[] = [
  "unknown",
  "freshman",
  "sophomore",
  "junior",
  "senior",
  "transfer",
  "current_college",
  "gap_year",
];

const triageUrgencies: TriageUrgency[] = ["low", "medium", "high"];

function parseLlmTriage(content: string | null | undefined, profile: StudentProfileState): TurnTriage | undefined {
  if (!content) return undefined;

  const raw = asRecord(JSON.parse(content.trim()));
  if (!raw) return undefined;

  const intent = readEnum(raw.intent, triageIntents) ?? "chat";
  const role = readEnum(raw.role, triageRoles) ?? "unknown";
  const collegeIntent = readEnum(raw.collegeIntent, triageCollegeIntents) ?? "unknown";
  const modelLifecycleStage = readEnum(raw.lifecycleStage, lifecycleStages) ?? "unknown";
  const lifecycleStage = modelLifecycleStage === "unknown" ? profile.lifecycleStage : modelLifecycleStage;
  const lifecycleConfidence =
    readNumber(raw.lifecycleConfidence) ??
    (lifecycleStage === profile.lifecycleStage ? profile.lifecycleStageConfidence : 0);
  const lifecycleReason = readString(raw.lifecycleReason) ?? "llm-classified turn";
  const firstName = readString(raw.firstName);
  const highSchool = readString(raw.highSchool);
  const acceptedSchool = readString(raw.acceptedSchool);
  const interests = readStringArray(raw.interests);
  const acknowledgmentOnly = typeof raw.acknowledgmentOnly === "boolean" ? raw.acknowledgmentOnly : false;
  const correction = typeof raw.correction === "boolean" ? raw.correction : false;
  const onboardingRelevant = typeof raw.onboardingRelevant === "boolean" ? raw.onboardingRelevant : true;
  const urgency = readEnum(raw.urgency, triageUrgencies) ?? "low";
  const evidence = readStringArray(raw.evidence);
  if (evidence.length === 0) evidence.push(`intent:${intent}`, "source:llm");
  const onboarding = readOnboardingPlan(raw.onboarding);

  return {
    source: "llm",
    intent,
    role,
    collegeIntent,
    gradeLevel: readString(raw.gradeLevel) ?? "unknown",
    lifecycleStage,
    lifecycleConfidence,
    lifecycleReason,
    firstName,
    highSchool,
    acceptedSchool,
    interests,
    acknowledgmentOnly,
    correction,
    onboardingRelevant,
    onboarding,
    urgency,
    evidence,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown" || trimmed.toLowerCase() === "null") return undefined;
  return trimmed;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.max(0, Math.min(1, value));
}

function readEnum<T extends string>(value: unknown, allowed: T[]): T | undefined {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : undefined;
}

function readKnownEnum<T extends string>(value: unknown, allowed: T[]): T | undefined {
  const parsed = readEnum(value, allowed);
  return parsed === "unknown" ? undefined : parsed;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const items: string[] = [];
  for (const item of value) {
    const text = readString(item);
    if (text) items.push(text);
  }
  return items;
}

const onboardingResolutions: TriageOnboardingResolution[] = [
  "full_answer",
  "partial_answer",
  "topic_switch",
  "no_answer",
];

function readOnboardingPlan(value: unknown): TriageOnboardingPlan {
  const raw = asRecord(value) ?? {};
  const nextLoop = readOpenLoopPlan(raw.nextLoop);

  return {
    firstName: readString(raw.firstName),
    highSchool: readString(raw.highSchool),
    role: readKnownEnum(raw.role, triageRoles),
    collegeIntent: readKnownEnum(raw.collegeIntent, triageCollegeIntents),
    gradeLevel: readString(raw.gradeLevel),
    lifecycleStage: readKnownEnum(raw.lifecycleStage, lifecycleStages),
    complete: typeof raw.complete === "boolean" ? raw.complete : undefined,
    resolution: readEnum(raw.resolution, onboardingResolutions),
    nextLoop,
    completeLoopTypes: readStringArray(raw.completeLoopTypes),
    evidence: readStringArray(raw.evidence),
  };
}

function readOpenLoopPlan(value: unknown): TriageOpenLoopPlan | undefined {
  const raw = asRecord(value);
  if (!raw) return undefined;

  const loopType = readString(raw.loopType);
  const prompt = readString(raw.prompt);
  if (!loopType || !prompt) return undefined;

  return {
    loopType,
    prompt,
    priority: readPriority(raw.priority),
    blocking: typeof raw.blocking === "boolean" ? raw.blocking : undefined,
  };
}

function readPriority(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function withMoonshotThinkingDisabled(
  model: string,
  body: ChatCompletionCreateBody,
): ChatCompletionCreateBody {
  if (!model.toLowerCase().startsWith("kimi-k2")) return body;

  return {
    ...body,
    thinking: { type: "disabled" },
  };
}

function buildUnknownTriage(profile: StudentProfileState): TurnTriage {
  return {
    source: "fallback",
    intent: "chat",
    role: "unknown",
    collegeIntent: "unknown",
    gradeLevel: "unknown",
    lifecycleStage: profile.lifecycleStage,
    lifecycleConfidence: profile.lifecycleStageConfidence,
    lifecycleReason: "llm unavailable",
    interests: [],
    acknowledgmentOnly: false,
    correction: false,
    onboardingRelevant: false,
    onboarding: {
      completeLoopTypes: [],
      evidence: [],
    },
    urgency: "low",
    evidence: ["source:fallback"],
  };
}
