import { handleAgentTurn } from "../agent/handle-turn.ts";
import { InMemoryAgentStateStore } from "../agent/state-store.ts";
import type { AgentTurnResult, StudentProfileState } from "../agent/types.ts";

const store = new InMemoryAgentStateStore();
const allEventTypes = new Set<string>();

async function send(text: string) {
  const result = await handleAgentTurn(
    {
      channel: "imessage",
      userId: "smoke:newcomer",
      threadId: "smoke-thread",
      text,
      timestamp: new Date(),
    },
    store,
  );

  console.log(`\n> ${text}`);
  console.log(result.reply);
  console.log("goalStack:", result.goalStack);
  console.log("onboarding:", result.profile.facts.onboarding);
  for (const event of result.events) allEventTypes.add(event.eventType);

  return result;
}

function assertOnboardingComplete(profile: StudentProfileState) {
  const onboarding = profile.facts.onboarding;
  if (!onboarding || typeof onboarding !== "object" || Array.isArray(onboarding)) {
    throw new Error("Expected onboarding memory to exist.");
  }
  const onboardingRecord = onboarding as Record<string, unknown>;

  if (onboardingRecord.complete !== true) {
    throw new Error(`Expected onboarding to be complete. Got ${JSON.stringify(onboarding)}`);
  }

  if (onboardingRecord.role !== "student") {
    throw new Error(`Expected role=student. Got ${String(onboardingRecord.role)}`);
  }

  if (onboardingRecord.collegeIntent !== "looking_to_enter_college") {
    throw new Error(`Expected collegeIntent=looking_to_enter_college. Got ${String(onboardingRecord.collegeIntent)}`);
  }

  if (onboardingRecord.gradeLevel !== "11th") {
    throw new Error(`Expected gradeLevel=11th. Got ${String(onboardingRecord.gradeLevel)}`);
  }
}

function assertCollectedInfoEvents(result: AgentTurnResult) {
  const expectedEvents = [
    "onboarding_role_identified",
    "onboarding_college_intent_identified",
    "onboarding_grade_level_identified",
    "onboarding_lifecycle_stage_identified",
    "onboarding_completed",
  ];

  for (const eventType of expectedEvents) {
    if (!allEventTypes.has(eventType)) {
      throw new Error(`Expected ${eventType} event. Got ${JSON.stringify([...allEventTypes])}`);
    }
  }

  const finalTurnEvents = new Set(result.events.map((event) => event.eventType));
  if (!finalTurnEvents.has("onboarding_completed")) {
    throw new Error(`Expected final turn to complete onboarding. Got ${JSON.stringify([...finalTurnEvents])}`);
  }
}

await send("does UVU have nursing?");
await send("also what scholarships should I look at?");
const finalResult = await send("i'm a junior");

assertOnboardingComplete(finalResult.profile);
assertCollectedInfoEvents(finalResult);
console.log("\nOnboarding smoke test passed.");
