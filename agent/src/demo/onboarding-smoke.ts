import { handleAgentTurn } from "../agent/handle-turn.ts";
import { InMemoryAgentStateStore } from "../agent/state-store.ts";
import type { AgentTurnResult, StudentProfileState } from "../agent/types.ts";

const store = new InMemoryAgentStateStore();
const allEventTypes = new Set<string>();

async function send(text: string, userId = "smoke:newcomer") {
  const result = await handleAgentTurn(
    {
      channel: "imessage",
      userId,
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
const offTopicResult = await send("tell me a joke");
if (!offTopicResult.goalStack.includes("identify_person_context")) {
  throw new Error(`Expected onboarding goal to remain pending. Got ${JSON.stringify(offTopicResult.goalStack)}`);
}
await send("also what scholarships should I look at?");
const finalResult = await send("i'm a junior");

assertOnboardingComplete(finalResult.profile);
assertCollectedInfoEvents(finalResult);

const localUser = "smoke:local-quality";
const noisyGreeting = await send("Hello\nchinchin\nChinch", localUser);
if (noisyGreeting.goalStack.length > 0) {
  throw new Error(`Expected noisy greeting not to start onboarding. Got ${JSON.stringify(noisyGreeting.goalStack)}`);
}

const correction = await send("That wasn\u2019t what I was asking but thanks bro, I\u2019m a student,", localUser);
if (!correction.goalStack.includes("identify_grade_level")) {
  throw new Error(`Expected correction to leave grade collection pending. Got ${JSON.stringify(correction.goalStack)}`);
}
if (!hasLatestTriageFlag(correction, "correction", true)) {
  throw new Error(`Expected correction triage flag. Got ${JSON.stringify(correction.profile.facts.lastTriage)}`);
}

const acceptance = await send("Like 6+7th (im actually a senior) I just got accepted into Dartmouth", localUser);
if (acceptance.profile.facts.acceptedSchool !== "Dartmouth") {
  throw new Error(`Expected acceptedSchool=Dartmouth. Got ${String(acceptance.profile.facts.acceptedSchool)}`);
}
assertLocalSeniorAccepted(acceptance.profile);

const acknowledgment = await send("Bet", localUser);
if (!hasLatestTriageFlag(acknowledgment, "acknowledgmentOnly", true)) {
  throw new Error(`Expected acknowledgment triage flag. Got ${JSON.stringify(acknowledgment.profile.facts.lastTriage)}`);
}

console.log("\nOnboarding smoke test passed.");

function hasLatestTriageFlag(result: AgentTurnResult, key: string, expected: unknown): boolean {
  const triage = result.profile.facts.lastTriage;
  if (!triage || typeof triage !== "object" || Array.isArray(triage)) return false;
  return (triage as Record<string, unknown>)[key] === expected;
}

function assertLocalSeniorAccepted(profile: StudentProfileState) {
  const onboarding = profile.facts.onboarding;
  if (!onboarding || typeof onboarding !== "object" || Array.isArray(onboarding)) {
    throw new Error("Expected onboarding memory to exist for accepted senior.");
  }
  const record = onboarding as Record<string, unknown>;

  if (record.role !== "student" || record.gradeLevel !== "12th" || record.lifecycleStage !== "senior") {
    throw new Error(`Expected accepted senior onboarding state. Got ${JSON.stringify(onboarding)}`);
  }
}
