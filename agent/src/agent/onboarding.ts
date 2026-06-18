import { inferLifecycleStage } from "./lifecycle.ts";
import {
  createOpenLoop,
  type AgentStateStore,
  setLifecycleStage,
} from "./state-store.ts";
import type {
  AgentEvent,
  AgentOpenLoop,
  AgentTurnInput,
  JsonObject,
  LifecycleStage,
  StudentProfileState,
} from "./types.ts";

type OnboardingRole =
  | "student"
  | "supporter"
  | "counselor"
  | "institution_staff"
  | "not_college_bound"
  | "unknown";

type CollegeIntent = "looking_to_enter_college" | "helping_someone" | "not_looking" | "unknown";

type OnboardingResolution = "full_answer" | "partial_answer" | "topic_switch" | "no_answer";

interface OnboardingMemory extends JsonObject {
  role: OnboardingRole;
  collegeIntent: CollegeIntent;
  gradeLevel: string;
  lifecycleStage: LifecycleStage;
  complete: boolean;
  completedAt?: string;
}

interface OnboardingSignals {
  role?: OnboardingRole;
  collegeIntent?: CollegeIntent;
  gradeLevel?: string;
  lifecycleStage?: LifecycleStage;
  evidence: string[];
}

interface AdvanceOnboardingInput {
  turn: AgentTurnInput;
  store: AgentStateStore;
  profile: StudentProfileState;
  openLoops: AgentOpenLoop[];
}

export interface OnboardingAdvanceResult {
  profile: StudentProfileState;
  openLoops: AgentOpenLoop[];
  goalStack: string[];
  stateBlob: JsonObject;
  resolution: OnboardingResolution;
  events: AgentEvent[];
}

const onboardingLoopTypes = new Set(["identify_person_context", "identify_grade_level"]);

export async function advanceOnboarding(input: AdvanceOnboardingInput): Promise<OnboardingAdvanceResult> {
  const signals = detectOnboardingSignals(input.turn.text, input.profile);
  const previousMemory = readOnboardingMemory(input.profile);
  let memory = mergeOnboardingMemory(previousMemory, signals, input.turn.timestamp);
  let profile = applyOnboardingMemory(input.profile, memory);
  const events: AgentEvent[] = [];

  if (signals.lifecycleStage && signals.lifecycleStage !== profile.lifecycleStage) {
    profile = setLifecycleStage(profile, signals.lifecycleStage, 0.95, signals.lifecycleStage);
    memory = mergeOnboardingMemory(readOnboardingMemory(profile), signals, input.turn.timestamp);
    profile = applyOnboardingMemory(profile, memory);
  }

  const neededLoop = getNeededOnboardingLoop(memory);
  const openLoopTypes = new Set(input.openLoops.map((loop) => loop.loopType));
  const resolution = classifyOnboardingResolution(input.openLoops, neededLoop?.loopType, signals);

  const loopsToComplete = input.openLoops
    .filter((loop) => onboardingLoopTypes.has(loop.loopType) && loop.loopType !== neededLoop?.loopType)
    .map((loop) =>
      input.store.upsertOpenLoop({
        ...loop,
        status: "completed",
        result: { onboarding: memory },
      }),
    );
  await Promise.all(loopsToComplete);

  if (neededLoop && !openLoopTypes.has(neededLoop.loopType)) {
    await input.store.upsertOpenLoop(
      createOpenLoop({
        userId: input.turn.userId,
        threadId: input.turn.threadId,
        loopType: neededLoop.loopType,
        prompt: neededLoop.prompt,
        priority: neededLoop.priority,
      }),
    );
  }

  if (signals.evidence.length > 0 || resolution !== "no_answer") {
    events.push(...buildCollectedInfoEvents(previousMemory, memory, signals, input.turn, resolution));
    events.push({
      userId: input.turn.userId,
      threadId: input.turn.threadId,
      eventType: "onboarding_state_updated",
      input: { text: input.turn.text, activeGoals: input.openLoops.map((loop) => loop.loopType) },
      output: { onboarding: memory, signals, resolution },
      createdAt: input.turn.timestamp,
    });
  }

  const openLoops = await input.store.listOpenLoops(input.turn.userId);
  const goalStack = openLoops.map((loop) => loop.loopType);

  return {
    profile,
    openLoops,
    goalStack,
    stateBlob: buildStateBlob(profile, goalStack),
    resolution,
    events,
  };
}

function buildCollectedInfoEvents(
  previous: OnboardingMemory,
  current: OnboardingMemory,
  signals: OnboardingSignals,
  turn: AgentTurnInput,
  resolution: OnboardingResolution,
): AgentEvent[] {
  const events: AgentEvent[] = [];

  pushCollectedEvent({
    events,
    previousValue: previous.role,
    currentValue: current.role,
    unknownValue: "unknown",
    eventType: "onboarding_role_identified",
    field: "role",
    directEvidence: signals.role,
    turn,
    resolution,
  });
  pushCollectedEvent({
    events,
    previousValue: previous.collegeIntent,
    currentValue: current.collegeIntent,
    unknownValue: "unknown",
    eventType: "onboarding_college_intent_identified",
    field: "collegeIntent",
    directEvidence: signals.collegeIntent,
    turn,
    resolution,
  });
  pushCollectedEvent({
    events,
    previousValue: previous.gradeLevel,
    currentValue: current.gradeLevel,
    unknownValue: "unknown",
    eventType: "onboarding_grade_level_identified",
    field: "gradeLevel",
    directEvidence: signals.gradeLevel,
    turn,
    resolution,
  });
  pushCollectedEvent({
    events,
    previousValue: previous.lifecycleStage,
    currentValue: current.lifecycleStage,
    unknownValue: "unknown",
    eventType: "onboarding_lifecycle_stage_identified",
    field: "lifecycleStage",
    directEvidence: signals.lifecycleStage,
    turn,
    resolution,
  });

  if (!previous.complete && current.complete) {
    events.push({
      userId: turn.userId,
      threadId: turn.threadId,
      eventType: "onboarding_completed",
      input: { text: turn.text },
      output: {
        onboarding: current,
        resolution,
      },
      createdAt: turn.timestamp,
    });
  }

  return events;
}

function pushCollectedEvent(input: {
  events: AgentEvent[];
  previousValue: string;
  currentValue: string;
  unknownValue: string;
  eventType: string;
  field: string;
  directEvidence?: string;
  turn: AgentTurnInput;
  resolution: OnboardingResolution;
}): void {
  if (input.currentValue === input.unknownValue || input.previousValue === input.currentValue) return;

  input.events.push({
    userId: input.turn.userId,
    threadId: input.turn.threadId,
    eventType: input.eventType,
    input: { text: input.turn.text },
    output: {
      field: input.field,
      previousValue: input.previousValue,
      value: input.currentValue,
      source: input.directEvidence === input.currentValue ? "direct" : "inferred",
      resolution: input.resolution,
    },
    createdAt: input.turn.timestamp,
  });
}

export function readOnboardingMemory(profile: StudentProfileState): OnboardingMemory {
  const raw = asRecord(profile.facts.onboarding);

  return {
    role: readEnum(raw.role, ["student", "supporter", "counselor", "institution_staff", "not_college_bound"]) ?? "unknown",
    collegeIntent:
      readEnum(raw.collegeIntent, ["looking_to_enter_college", "helping_someone", "not_looking"]) ?? "unknown",
    gradeLevel: typeof raw.gradeLevel === "string" ? raw.gradeLevel : "unknown",
    lifecycleStage: readLifecycleStage(raw.lifecycleStage) ?? profile.lifecycleStage,
    complete: raw.complete === true,
    completedAt: typeof raw.completedAt === "string" ? raw.completedAt : undefined,
  };
}

function detectOnboardingSignals(text: string, profile: StudentProfileState): OnboardingSignals {
  const evidence: string[] = [];
  const normalized = text.toLowerCase();
  const lifecycle = inferLifecycleStage(text, profile);
  const gradeLevel = detectGradeLevel(normalized);
  const role = detectRole(normalized);
  const collegeIntent = detectCollegeIntent(normalized, role, gradeLevel);

  if (role) evidence.push(`role:${role}`);
  if (collegeIntent) evidence.push(`college_intent:${collegeIntent}`);
  if (gradeLevel) evidence.push(`grade:${gradeLevel}`);
  if (lifecycle.stage !== "unknown" && lifecycle.reason !== "kept existing lifecycle stage") {
    evidence.push(`lifecycle:${lifecycle.stage}`);
  }

  return {
    role,
    collegeIntent,
    gradeLevel,
    lifecycleStage: lifecycle.stage !== "unknown" ? lifecycle.stage : undefined,
    evidence,
  };
}

function detectRole(text: string): OnboardingRole | undefined {
  if (/\b(not|don't|do not|dont|no)\b.{0,30}\b(college|university|school)\b/.test(text)) {
    return "not_college_bound";
  }

  if (/\b(parent|guardian|mom|dad)\b/.test(text) || /\bmy (son|daughter|kid|child)\b/.test(text)) {
    return "supporter";
  }

  if (/\b(counselor|advisor|teacher)\b/.test(text)) {
    return "counselor";
  }

  if (/\b(admissions|staff|recruiter|institution)\b/.test(text)) {
    return "institution_staff";
  }

  if (/\b(i am|i'm|im|me)\b/.test(text) || /\b(student|sophomore|junior|senior|transfer)\b/.test(text)) {
    return "student";
  }

  return undefined;
}

function detectCollegeIntent(
  text: string,
  role: OnboardingRole | undefined,
  gradeLevel: string | undefined,
): CollegeIntent | undefined {
  if (role === "not_college_bound") return "not_looking";
  if (role && ["supporter", "counselor", "institution_staff"].includes(role)) return "helping_someone";

  if (
    /\b(college|university|school|major|career|apply|application|fafsa|scholarship|transfer)\b/.test(text) ||
    /\b(nursing|computer science|coding|business|healthcare)\b/.test(text) ||
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

function mergeOnboardingMemory(
  current: OnboardingMemory,
  signals: OnboardingSignals,
  now: Date,
): OnboardingMemory {
  const role = signals.role ?? inferRoleFromGrade(current.role, signals.gradeLevel) ?? current.role;
  const collegeIntent =
    signals.collegeIntent ?? inferCollegeIntentFromRoleOrGrade(current.collegeIntent, role, signals.gradeLevel);
  const gradeLevel = signals.gradeLevel ?? current.gradeLevel;
  const lifecycleStage = signals.lifecycleStage ?? current.lifecycleStage;
  const complete = isOnboardingComplete({ ...current, role, collegeIntent, gradeLevel, lifecycleStage });

  return {
    ...current,
    role,
    collegeIntent,
    gradeLevel,
    lifecycleStage,
    complete,
    completedAt: complete ? current.completedAt ?? now.toISOString() : undefined,
  };
}

function inferRoleFromGrade(role: OnboardingRole, gradeLevel: string | undefined): OnboardingRole | undefined {
  if (role !== "unknown" || !gradeLevel) return undefined;
  return "student";
}

function inferCollegeIntentFromRoleOrGrade(
  collegeIntent: CollegeIntent,
  role: OnboardingRole,
  gradeLevel: string | undefined,
): CollegeIntent {
  if (collegeIntent !== "unknown") return collegeIntent;
  if (role === "not_college_bound") return "not_looking";
  if (["supporter", "counselor", "institution_staff"].includes(role)) return "helping_someone";
  if (role === "student" || gradeLevel) return "looking_to_enter_college";
  return "unknown";
}

function isOnboardingComplete(memory: OnboardingMemory): boolean {
  if (memory.role === "unknown" || memory.collegeIntent === "unknown") return false;
  if (memory.collegeIntent === "not_looking") return true;

  return memory.gradeLevel !== "unknown" || memory.lifecycleStage !== "unknown";
}

function applyOnboardingMemory(
  profile: StudentProfileState,
  memory: OnboardingMemory,
): StudentProfileState {
  return {
    ...profile,
    facts: {
      ...profile.facts,
      onboarding: memory,
      onboardingComplete: memory.complete,
      onboardingRole: memory.role,
      collegeIntent: memory.collegeIntent,
      gradeLevel: memory.gradeLevel,
    },
  };
}

function getNeededOnboardingLoop(memory: OnboardingMemory) {
  if (memory.role === "unknown" || memory.collegeIntent === "unknown") {
    return {
      loopType: "identify_person_context",
      priority: 30,
      prompt:
        "quick context so I pick the right mode: are you a student looking at college, helping someone, or not really looking at college?",
    };
  }

  if (!memory.complete) {
    return {
      loopType: "identify_grade_level",
      priority: 20,
      prompt:
        memory.collegeIntent === "helping_someone"
          ? "got it — what grade/year is the student you are helping? 10th, 11th, 12th, transfer, already in college, or something else?"
          : "got it — what grade/year are you? 10th, 11th, 12th, transfer, already in college, or something else?",
    };
  }

  return undefined;
}

function classifyOnboardingResolution(
  openLoops: AgentOpenLoop[],
  neededLoopType: string | undefined,
  signals: OnboardingSignals,
): OnboardingResolution {
  const hadOnboardingLoop = openLoops.some((loop) => onboardingLoopTypes.has(loop.loopType));

  if (signals.evidence.length === 0) {
    return hadOnboardingLoop ? "topic_switch" : "no_answer";
  }

  if (!neededLoopType) return "full_answer";
  return hadOnboardingLoop ? "partial_answer" : "no_answer";
}

function buildStateBlob(profile: StudentProfileState, goalStack: string[]): JsonObject {
  return {
    profileSummary: profile.profileSummary,
    lifecycleStage: profile.lifecycleStage,
    onboarding: readOnboardingMemory(profile),
    interests: profile.interests,
    constraints: profile.constraints,
    goalStack,
    lastIntent: profile.facts.lastIntent,
    lastMessagePreview: profile.facts.lastMessagePreview,
  };
}

function asRecord(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
}

function readEnum<T extends string>(value: unknown, allowed: T[]): T | undefined {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : undefined;
}

function readLifecycleStage(value: unknown): LifecycleStage | undefined {
  return readEnum(value, ["unknown", "sophomore", "junior", "senior", "transfer", "current_college", "gap_year"]);
}
