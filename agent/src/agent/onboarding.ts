import {
  createOpenLoop,
  type AgentStateStore,
  setLifecycleStage,
} from "./state-store.ts";
import type {
  TriageCollegeIntent,
  TriageOnboardingPlan,
  TriageOnboardingResolution,
  TriageRole,
  TurnTriage,
} from "./triage.ts";
import type {
  AgentEvent,
  AgentOpenLoop,
  AgentTurnInput,
  JsonObject,
  LifecycleStage,
  StudentProfileState,
} from "./types.ts";

type OnboardingRole = TriageRole;
type CollegeIntent = TriageCollegeIntent;

type OnboardingResolution = TriageOnboardingResolution;
type OnboardingSlotKey = "firstName" | "grade" | "highSchool";

interface OnboardingMemory extends JsonObject {
  firstName: string;
  highSchool: string;
  role: OnboardingRole;
  collegeIntent: CollegeIntent;
  gradeLevel: string;
  lifecycleStage: LifecycleStage;
  complete: boolean;
  completedAt?: string;
}

const onboardingSlots: Array<{
  key: OnboardingSlotKey;
  loopType: string;
  prompt: string;
  priority: number;
  isFilled: (memory: OnboardingMemory) => boolean;
  read: (input: NormalizeOnboardingInput) => Partial<TriageOnboardingPlan>;
}> = [
  {
    key: "firstName",
    loopType: "collect_first_name",
    prompt: "what’s your first name?",
    priority: 100,
    isFilled: (memory) => known(memory.firstName),
    read: (input) => ({
      firstName:
        input.plan.firstName ??
        input.triage.firstName ??
        readActiveSlotAnswer(input, "collect_first_name", cleanShortSlotAnswer),
    }),
  },
  {
    key: "grade",
    loopType: "identify_grade_level",
    prompt: "what grade are you in?",
    priority: 95,
    isFilled: (memory) => known(memory.gradeLevel) || memory.lifecycleStage !== "unknown",
    read: (input) => {
      const parsed = readGradeSlotAnswer(input);
      return {
        gradeLevel: input.plan.gradeLevel ?? knownString(input.triage.gradeLevel) ?? parsed?.gradeLevel,
        lifecycleStage:
          input.plan.lifecycleStage ?? knownLifecycleStage(input.triage.lifecycleStage) ?? parsed?.lifecycleStage,
      };
    },
  },
  {
    key: "highSchool",
    loopType: "collect_high_school",
    prompt: "what high school do you go to?",
    priority: 90,
    isFilled: (memory) => known(memory.highSchool),
    read: (input) => ({
      highSchool:
        normalizeHighSchool(input.plan.highSchool ?? input.triage.highSchool) ??
        readCurrentMissingSlotAnswer(input, "highSchool", normalizeHighSchool),
    }),
  },
];

interface NormalizeOnboardingInput {
  plan: TriageOnboardingPlan;
  triage: TurnTriage;
  previousMemory: OnboardingMemory;
  openLoops: AgentOpenLoop[];
  text: string;
}

interface AdvanceOnboardingInput {
  turn: AgentTurnInput;
  store: AgentStateStore;
  profile: StudentProfileState;
  openLoops: AgentOpenLoop[];
  triage: TurnTriage;
}

export interface OnboardingAdvanceResult {
  profile: StudentProfileState;
  openLoops: AgentOpenLoop[];
  goalStack: string[];
  stateBlob: JsonObject;
  resolution: OnboardingResolution;
  events: AgentEvent[];
}

export async function advanceOnboarding(input: AdvanceOnboardingInput): Promise<OnboardingAdvanceResult> {
  const previousMemory = readOnboardingMemory(input.profile);
  const onboarding = normalizeOnboardingPlan({
    plan: input.triage.onboarding,
    triage: input.triage,
    previousMemory,
    openLoops: input.openLoops,
    text: input.turn.text,
  });
  let memory = mergeOnboardingMemory(previousMemory, onboarding, input.turn.timestamp);
  let profile = applyOnboardingMemory(input.profile, memory);
  const events: AgentEvent[] = [];

  if (onboarding.lifecycleStage && onboarding.lifecycleStage !== profile.lifecycleStage) {
    profile = setLifecycleStage(profile, onboarding.lifecycleStage, input.triage.lifecycleConfidence, onboarding.lifecycleStage);
    memory = mergeOnboardingMemory(readOnboardingMemory(profile), onboarding, input.turn.timestamp);
    profile = applyOnboardingMemory(profile, memory);
  }

  const nextLoop = getNeededOnboardingLoop(memory);
  const openLoopTypes = new Set(input.openLoops.map((loop) => loop.loopType));
  const resolution = onboarding.resolution ?? "no_answer";

  const loopsToComplete: Array<Promise<void>> = [];
  for (const loop of input.openLoops) {
    if (!shouldCompleteOnboardingLoop(loop, nextLoop, memory)) continue;
    loopsToComplete.push(
      input.store.upsertOpenLoop({
        ...loop,
        status: "completed",
        result: { onboarding: memory },
      }),
    );
  }
  await Promise.all(loopsToComplete);

  if (nextLoop && !openLoopTypes.has(nextLoop.loopType)) {
    await input.store.upsertOpenLoop(
      createOpenLoop({
        userId: input.turn.userId,
        threadId: input.turn.threadId,
        loopType: nextLoop.loopType,
        prompt: nextLoop.prompt,
        priority: nextLoop.priority,
        blocking: nextLoop.blocking,
      }),
    );
  }

  if (onboarding.evidence.length > 0 || resolution !== "no_answer") {
    events.push(...buildCollectedInfoEvents(previousMemory, memory, onboarding, input.turn, resolution));
    events.push({
      userId: input.turn.userId,
      threadId: input.turn.threadId,
      eventType: "onboarding_state_updated",
      input: { text: input.turn.text, activeGoals: input.openLoops.map((loop) => loop.loopType) },
      output: { onboarding: memory, plan: onboarding, resolution },
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

function normalizeOnboardingPlan(input: NormalizeOnboardingInput): TriageOnboardingPlan {
  const slotValues = Object.assign({}, ...onboardingSlots.map((slot) => slot.read(input))) as Partial<TriageOnboardingPlan>;

  const mergedPreview = mergeOnboardingMemory(input.previousMemory, {
    ...input.plan,
    ...slotValues,
    role: input.plan.role ?? knownRole(input.triage.role),
    collegeIntent: input.plan.collegeIntent ?? knownCollegeIntent(input.triage.collegeIntent),
    complete: undefined,
  }, new Date());

  return {
    ...input.plan,
    ...slotValues,
    role: input.plan.role ?? knownRole(input.triage.role),
    collegeIntent: input.plan.collegeIntent ?? knownCollegeIntent(input.triage.collegeIntent),
    complete: isOnboardingComplete(mergedPreview),
    nextLoop: getNeededOnboardingLoop(mergedPreview),
    evidence: [
      ...input.plan.evidence,
      slotValues.firstName ? `first_name:${slotValues.firstName}` : undefined,
      slotValues.highSchool ? `high_school:${slotValues.highSchool}` : undefined,
    ].filter((item): item is string => Boolean(item)),
  };
}

function buildCollectedInfoEvents(
  previous: OnboardingMemory,
  current: OnboardingMemory,
  onboarding: TriageOnboardingPlan,
  turn: AgentTurnInput,
  resolution: OnboardingResolution,
): AgentEvent[] {
  const events: AgentEvent[] = [];

  pushCollectedEvent({
    events,
    previousValue: previous.firstName,
    currentValue: current.firstName,
    unknownValue: "unknown",
    eventType: "onboarding_first_name_identified",
    field: "firstName",
    directEvidence: onboarding.firstName,
    turn,
    resolution,
  });
  pushCollectedEvent({
    events,
    previousValue: previous.highSchool,
    currentValue: current.highSchool,
    unknownValue: "unknown",
    eventType: "onboarding_high_school_identified",
    field: "highSchool",
    directEvidence: onboarding.highSchool,
    turn,
    resolution,
  });
  pushCollectedEvent({
    events,
    previousValue: previous.role,
    currentValue: current.role,
    unknownValue: "unknown",
    eventType: "onboarding_role_identified",
    field: "role",
    directEvidence: onboarding.role,
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
    directEvidence: onboarding.collegeIntent,
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
    directEvidence: onboarding.gradeLevel,
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
    directEvidence: onboarding.lifecycleStage,
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
    firstName: typeof raw.firstName === "string" ? raw.firstName : readString(profile.facts.firstName) ?? "unknown",
    highSchool: typeof raw.highSchool === "string" ? raw.highSchool : readString(profile.facts.highSchool) ?? "unknown",
    role: readEnum(raw.role, ["student", "supporter", "counselor", "institution_staff", "not_college_bound"]) ?? "unknown",
    collegeIntent:
      readEnum(raw.collegeIntent, ["looking_to_enter_college", "helping_someone", "not_looking"]) ?? "unknown",
    gradeLevel: typeof raw.gradeLevel === "string" ? raw.gradeLevel : "unknown",
    lifecycleStage: readLifecycleStage(raw.lifecycleStage) ?? profile.lifecycleStage,
    complete: raw.complete === true,
    completedAt: typeof raw.completedAt === "string" ? raw.completedAt : undefined,
  };
}

function mergeOnboardingMemory(
  current: OnboardingMemory,
  onboarding: TriageOnboardingPlan,
  now: Date,
): OnboardingMemory {
  const firstName = onboarding.firstName ?? current.firstName;
  const highSchool = onboarding.highSchool ?? current.highSchool;
  const role = onboarding.role ?? current.role;
  const collegeIntent = onboarding.collegeIntent ?? current.collegeIntent;
  const gradeLevel = onboarding.gradeLevel ?? current.gradeLevel;
  const lifecycleStage = onboarding.lifecycleStage ?? current.lifecycleStage;
  const complete = isOnboardingComplete({
    ...current,
    firstName,
    highSchool,
    role,
    collegeIntent,
    gradeLevel,
    lifecycleStage,
  });

  return {
    ...current,
    firstName,
    highSchool,
    role,
    collegeIntent,
    gradeLevel,
    lifecycleStage,
    complete,
    completedAt: complete ? current.completedAt ?? now.toISOString() : undefined,
  };
}

function isOnboardingComplete(memory: OnboardingMemory): boolean {
  return memory.collegeIntent === "not_looking" || onboardingSlots.every((slot) => slot.isFilled(memory));
}

function getNeededOnboardingLoop(memory: OnboardingMemory): TriageOnboardingPlan["nextLoop"] {
  const slot = onboardingSlots.find((candidate) => !candidate.isFilled(memory));
  return slot ? { loopType: slot.loopType, prompt: slot.prompt, priority: slot.priority } : undefined;
}

function shouldCompleteOnboardingLoop(
  loop: AgentOpenLoop,
  nextLoop: TriageOnboardingPlan["nextLoop"],
  memory: OnboardingMemory,
): boolean {
  const slot = onboardingSlots.find((candidate) => candidate.loopType === loop.loopType);
  return Boolean(slot && loop.loopType !== nextLoop?.loopType && slot.isFilled(memory));
}

function applyOnboardingMemory(
  profile: StudentProfileState,
  memory: OnboardingMemory,
): StudentProfileState {
  return {
    ...profile,
    facts: {
      ...profile.facts,
      firstName: memory.firstName,
      highSchool: memory.highSchool,
      onboarding: memory,
      onboardingComplete: memory.complete,
      onboardingRole: memory.role,
      collegeIntent: memory.collegeIntent,
      gradeLevel: memory.gradeLevel,
    },
  };
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

function readActiveSlotAnswer(
  input: NormalizeOnboardingInput,
  loopType: string,
  normalize: (value: string) => string | undefined,
): string | undefined {
  return input.openLoops.some((loop) => loop.loopType === loopType) ? normalize(input.text) : undefined;
}

function readCurrentMissingSlotAnswer(
  input: NormalizeOnboardingInput,
  key: OnboardingSlotKey,
  normalize: (value: string) => string | undefined,
): string | undefined {
  return nextMissingSlot(input.previousMemory)?.key === key ? normalize(input.text) : undefined;
}

function nextMissingSlot(memory: OnboardingMemory) {
  return onboardingSlots.find((slot) => !slot.isFilled(memory));
}

function readGradeSlotAnswer(
  input: NormalizeOnboardingInput,
): { gradeLevel: string; lifecycleStage: LifecycleStage } | undefined {
  const gradeLoopActive =
    input.openLoops.some((loop) => loop.loopType === "identify_grade_level") ||
    nextMissingSlot(input.previousMemory)?.key === "grade";
  if (!gradeLoopActive) return undefined;
  return parseGradeAnswer(input.text);
}

const numericGradeLifecycle: Record<string, LifecycleStage> = {
  "9": "freshman",
  "10": "sophomore",
  "11": "junior",
  "12": "senior",
};

function parseGradeAnswer(
  value: string,
): { gradeLevel: string; lifecycleStage: LifecycleStage } | undefined {
  const cleaned = value.toLowerCase().trim();
  if (!cleaned) return undefined;

  if (/\bsenior\b/.test(cleaned)) return { gradeLevel: "12th", lifecycleStage: "senior" };
  if (/\bjunior\b/.test(cleaned)) return { gradeLevel: "11th", lifecycleStage: "junior" };
  if (/\bsophomore\b/.test(cleaned)) return { gradeLevel: "10th", lifecycleStage: "sophomore" };
  if (/\b(?:freshman|frosh)\b/.test(cleaned)) return { gradeLevel: "9th", lifecycleStage: "freshman" };
  if (/\bgap\s*year\b/.test(cleaned)) return { gradeLevel: "gap_year", lifecycleStage: "gap_year" };
  if (/\btransfer\b/.test(cleaned)) return { gradeLevel: "transfer", lifecycleStage: "transfer" };
  if (/\b(?:college|university|undergrad)\b/.test(cleaned)) {
    return { gradeLevel: "current_college", lifecycleStage: "current_college" };
  }

  const numeric = cleaned.match(/\b(9|10|11|12)(?:th|st|nd|rd)?\b/);
  const grade = numeric?.[1];
  if (grade && numericGradeLifecycle[grade]) {
    return { gradeLevel: `${grade}th`, lifecycleStage: numericGradeLifecycle[grade] };
  }

  return undefined;
}

function known(value: string): boolean {
  return value !== "unknown" && value.trim().length > 0;
}

function cleanShortSlotAnswer(value: string): string | undefined {
  const cleaned = value.trim().replace(/[.!?]+$/g, "").replace(/\s+/g, " ");
  if (!cleaned || cleaned.length > 32 || cleaned.split(/\s+/).length > 2) return undefined;
  if (/^(hi|hey|hello|yo|ok|okay|bet|thanks|thank you|senior|junior|jr|sr)$/i.test(cleaned)) return undefined;
  return titleCase(cleaned);
}

function normalizeHighSchool(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\b(?:do you know it|do u know it|you know it|do you know|do u know)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length > 70) return undefined;
  if (/^(hi|hey|hello|yo|ok|okay|yes|yeah|yep|ya|bet|thanks|thank you|senior|junior|jr|sr)$/i.test(cleaned)) return undefined;
  return titleCase(cleaned.replace(/\bhs\b/gi, "High School"));
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .map((part) => {
      if (/^[A-Z0-9&.'-]+$/.test(part) && part.length <= 4) return part.toUpperCase();
      return part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function knownString(value: string | undefined): string | undefined {
  return value && value !== "unknown" ? value : undefined;
}

function knownRole(value: TriageRole): TriageRole | undefined {
  return value === "unknown" ? undefined : value;
}

function knownCollegeIntent(value: TriageCollegeIntent): TriageCollegeIntent | undefined {
  return value === "unknown" ? undefined : value;
}

function knownLifecycleStage(value: LifecycleStage): LifecycleStage | undefined {
  return value === "unknown" ? undefined : value;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readEnum<T extends string>(value: unknown, allowed: T[]): T | undefined {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : undefined;
}

function readLifecycleStage(value: unknown): LifecycleStage | undefined {
  return readEnum(value, ["unknown", "freshman", "sophomore", "junior", "senior", "transfer", "current_college", "gap_year"]);
}
