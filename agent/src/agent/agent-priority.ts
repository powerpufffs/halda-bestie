import { createOpenLoop, type AgentStateStore } from "./state-store.ts";
import type { AgentPriorityConfig, ProfileConfig } from "./config/types.ts";
import type { TriageIntent } from "./triage.ts";
import type { AgentOpenLoop, JsonObject } from "./types.ts";

export interface AgentPriority extends JsonObject {
  loopType: string;
  prompt: string;
  priority: number;
  blocking: boolean;
}

export function resolveAgentPriority(openLoops: AgentOpenLoop[]): AgentPriority | undefined {
  const [loop] = openLoops.toSorted((left, right) => {
    const priorityDelta = right.priority - left.priority;
    if (priorityDelta !== 0) return priorityDelta;

    return right.updatedAt.getTime() - left.updatedAt.getTime();
  });

  if (!loop) return undefined;

  return {
    loopType: loop.loopType,
    prompt: loop.prompt,
    priority: loop.priority,
    blocking: loop.blocking,
  };
}

interface SyncConfiguredAgentPrioritiesInput {
  userId: string;
  threadId: string;
  store: AgentStateStore;
  profile: {
    facts: JsonObject;
    interests: string[];
    milestones: JsonObject;
    lifecycleStage: string;
  };
  profileConfig: ProfileConfig;
  openLoops: AgentOpenLoop[];
  currentIntent: TriageIntent;
}

export async function syncConfiguredAgentPriorities(
  input: SyncConfiguredAgentPrioritiesInput,
): Promise<AgentOpenLoop[]> {
  if (input.profileConfig.name === "visitor") return input.openLoops;

  let openLoops = input.openLoops;
  const completedLoops = openLoops.filter((loop) => {
    const priority = findConfiguredPriority(input.profileConfig, loop.loopType);
    return priority ? isPriorityFulfilled(priority, input.profile) : false;
  });

  await Promise.all(
    completedLoops.map((loop) =>
      input.store.upsertOpenLoop({
        ...loop,
        status: "completed",
        result: {
          fulfilledBy: "configured_agent_priority",
          loopType: loop.loopType,
        },
      }),
    ),
  );

  if (completedLoops.length > 0) {
    openLoops = await input.store.listOpenLoops(input.userId);
  }

  const applicableOpenLoops = openLoops.filter((loop) => {
    const priority = findConfiguredPriority(input.profileConfig, loop.loopType);
    return priority ? priorityAppliesToIntent(priority, input.currentIntent) : true;
  });

  if (applicableOpenLoops.length > 0) return applicableOpenLoops;

  const intentScopedPriorities = input.profileConfig.agentPriorities.filter((priority) =>
    priority.appliesToIntents?.includes(input.currentIntent),
  );
  const priorityPool = intentScopedPriorities.length > 0
    ? intentScopedPriorities
    : input.profileConfig.agentPriorities.filter((priority) => priorityAppliesToIntent(priority, input.currentIntent));
  const nextPriority = priorityPool
    .filter((priority) => !isPriorityFulfilled(priority, input.profile))
    .toSorted((left, right) => right.priority - left.priority)[0];
  if (!nextPriority) return openLoops;

  await input.store.upsertOpenLoop(
    createOpenLoop({
      userId: input.userId,
      threadId: input.threadId,
      loopType: nextPriority.name,
      prompt: nextPriority.prompt,
      priority: nextPriority.priority,
      blocking: nextPriority.blocking ?? false,
    }),
  );

  return input.store.listOpenLoops(input.userId);
}

function priorityAppliesToIntent(priority: AgentPriorityConfig, intent: TriageIntent): boolean {
  return !priority.appliesToIntents || priority.appliesToIntents.includes(intent);
}

function findConfiguredPriority(
  profileConfig: ProfileConfig,
  loopType: string,
): AgentPriorityConfig | undefined {
  return profileConfig.agentPriorities.find((priority) => priority.name === loopType);
}

function isPriorityFulfilled(
  priority: AgentPriorityConfig,
  profile: SyncConfiguredAgentPrioritiesInput["profile"],
): boolean {
  const facts = asRecord(profile.facts);
  const onboarding = asRecord(facts.onboarding);
  const collegeSearch = asRecord(facts.collegeSearch);
  const milestones = asRecord(profile.milestones);

  switch (priority.fulfillmentCondition) {
    case "profile.role_known":
      return stringValue(facts.onboardingRole) !== undefined || stringValue(onboarding.role) !== undefined;
    case "profile.lifecycle_stage_known":
      return profile.lifecycleStage !== "unknown";
    case "profile.interests_or_target_majors_present":
      return profile.interests.length > 0 || asStringArray(facts.targetMajors).length > 0;
    case "profile.target_schools_present":
      return (
        asStringArray(facts.targetSchools).length > 0 ||
        asStringArray(facts.acceptedSchools).length > 0 ||
        stringValue(facts.acceptedSchool) !== undefined
      );
    case "profile.college_search_direction_present":
      return (
        stringValue(collegeSearch.direction) !== undefined ||
        asStringArray(collegeSearch.interests).length > 0 ||
        asStringArray(collegeSearch.knownSchools).length > 0 ||
        profile.interests.length > 0 ||
        asStringArray(facts.targetMajors).length > 0
      );
    case "profile.college_search_region_present":
      return (
        stringValue(collegeSearch.region) !== undefined ||
        collegeSearch.openAnywhere === true ||
        asStringArray(collegeSearch.knownSchools).length > 0
      );
    case "profile.college_search_budget_present":
      return numberValue(collegeSearch.budgetAnnual) !== undefined;
    case "profile.college_search_gpa_present":
      return numberValue(collegeSearch.gpa) !== undefined || collegeSearch.gpaSkipped === true;
    case "profile.next_deadline_checked":
      return milestones.nextDeadlineChecked === true;
    case "profile.first_plan_created":
      return (
        milestones.firstPlanCreated === true ||
        milestones.sophomoreChecklistCreated === true ||
        milestones.junior90DayPlanCreated === true ||
        milestones.seniorActionPlanCreated === true
      );
    case "profile.current_institution_present":
      return stringValue(facts.currentInstitution) !== undefined;
    case "profile.transfer_credit_risk_checked":
      return milestones.creditRiskChecked === true;
  }
}

function asRecord(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
