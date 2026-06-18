import { handleAgentTurn } from "../agent/handle-turn.ts";
import { InMemoryAgentStateStore } from "../agent/state-store.ts";
import type { AgentTurnResult, StudentProfileState } from "../agent/types.ts";
import {
  assistantCompletion,
  fakeRuntime,
  isTriageRequest,
  latestTriageMessage,
  triageCompletion,
} from "./fake-llm.ts";

const store = new InMemoryAgentStateStore();
const allEventTypes = new Set<string>();
const llmRuntime = fakeRuntime(async (body) => {
  if (isTriageRequest(body)) return triageFor(latestTriageMessage(body));
  return assistantCompletion("ok");
});

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
    { llmRuntime },
  );

  console.log(`\n> ${text}`);
  console.log(result.reply);
  console.log("goalStack:", result.goalStack);
  console.log("onboarding:", result.profile.facts.onboarding);
  for (const event of result.events) allEventTypes.add(event.eventType);

  return result;
}

function triageFor(text: string) {
  switch (text) {
    case "Keilyn":
      return triageCompletion({
        firstName: "Keilyn",
        evidence: ["first_name:Keilyn"],
        onboarding: {
          firstName: "Keilyn",
          nextLoop: {
            loopType: "identify_grade_level",
            prompt: "what grade are you in?",
            priority: 95,
          },
          completeLoopTypes: ["collect_first_name"],
          evidence: ["first_name:Keilyn"],
        },
      });
    case "jr":
      return triageCompletion({
        role: "student",
        collegeIntent: "looking_to_enter_college",
        gradeLevel: "11th",
        lifecycleStage: "junior",
        lifecycleConfidence: 0.95,
        evidence: ["role:student", "college_intent:looking_to_enter_college", "grade:11th", "lifecycle:junior"],
        onboarding: {
          role: "student",
          collegeIntent: "looking_to_enter_college",
          gradeLevel: "11th",
          lifecycleStage: "junior",
          nextLoop: {
            loopType: "collect_high_school",
            prompt: "what high school do you go to?",
            priority: 90,
          },
          completeLoopTypes: ["identify_grade_level"],
          evidence: ["role:student", "college_intent:looking_to_enter_college", "grade:11th", "lifecycle:junior"],
        },
      });
    case "Timpview High School":
      return triageCompletion({
        highSchool: "Timpview High School",
        evidence: ["high_school:Timpview High School"],
        onboarding: {
          highSchool: "Timpview High School",
          complete: true,
          resolution: "full_answer",
          completeLoopTypes: ["collect_high_school"],
          evidence: ["high_school:Timpview High School"],
        },
      });
    case "Hello\nchinchin\nChinch":
      return triageCompletion({
        onboardingRelevant: false,
        onboarding: { resolution: "no_answer", evidence: [] },
      });
    case "That wasn’t what I was asking but thanks bro, I’m a student,":
      return triageCompletion({
        role: "student",
        collegeIntent: "looking_to_enter_college",
        correction: true,
        evidence: ["role:student", "college_intent:looking_to_enter_college", "correction"],
        onboarding: {
          role: "student",
          collegeIntent: "looking_to_enter_college",
          nextLoop: {
            loopType: "collect_first_name",
            prompt: "what’s your first name?",
            priority: 100,
          },
          evidence: ["role:student", "college_intent:looking_to_enter_college"],
        },
      });
    case "Like 6+7th (im actually a senior) I just got accepted into Dartmouth":
      return triageCompletion({
        role: "student",
        collegeIntent: "looking_to_enter_college",
        gradeLevel: "12th",
        lifecycleStage: "senior",
        lifecycleConfidence: 0.95,
        acceptedSchool: "Dartmouth",
        evidence: ["role:student", "college_intent:looking_to_enter_college", "grade:12th", "lifecycle:senior", "accepted_school:Dartmouth"],
        onboarding: {
          role: "student",
          collegeIntent: "looking_to_enter_college",
          gradeLevel: "12th",
          lifecycleStage: "senior",
          nextLoop: {
            loopType: "collect_first_name",
            prompt: "what’s your first name?",
            priority: 100,
          },
          evidence: ["role:student", "college_intent:looking_to_enter_college", "grade:12th", "lifecycle:senior"],
        },
      });
    case "Bet":
      return triageCompletion({
        acknowledgmentOnly: true,
        onboarding: { nextLoop: { loopType: "collect_first_name", prompt: "what’s your first name?", priority: 100 } },
      });
    default:
      return triageCompletion({
        onboarding: {
          nextLoop: {
            loopType: "collect_first_name",
            prompt: "what’s your first name?",
            priority: 100,
          },
        },
      });
  }
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

  if (onboardingRecord.firstName !== "Keilyn") {
    throw new Error(`Expected firstName=Keilyn. Got ${String(onboardingRecord.firstName)}`);
  }

  if (onboardingRecord.highSchool !== "Timpview High School") {
    throw new Error(`Expected highSchool=Timpview High School. Got ${String(onboardingRecord.highSchool)}`);
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
    "onboarding_first_name_identified",
    "onboarding_high_school_identified",
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

const greeting = await send("hello");
if (!greeting.goalStack.includes("collect_first_name")) {
  throw new Error(`Expected first-name collection to start. Got ${JSON.stringify(greeting.goalStack)}`);
}
const nameResult = await send("Keilyn");
if (!nameResult.goalStack.includes("identify_grade_level")) {
  throw new Error(`Expected grade collection after name. Got ${JSON.stringify(nameResult.goalStack)}`);
}
const gradeResult = await send("jr");
if (!gradeResult.goalStack.includes("collect_high_school")) {
  throw new Error(`Expected high-school collection after grade. Got ${JSON.stringify(gradeResult.goalStack)}`);
}
const finalResult = await send("Timpview High School");

assertOnboardingComplete(finalResult.profile);
assertCollectedInfoEvents(finalResult);

const localUser = "smoke:local-quality";
const noisyGreeting = await send("Hello\nchinchin\nChinch", localUser);
if (!noisyGreeting.goalStack.includes("collect_first_name")) {
  throw new Error(`Expected signup onboarding to start. Got ${JSON.stringify(noisyGreeting.goalStack)}`);
}

const correction = await send("That wasn\u2019t what I was asking but thanks bro, I\u2019m a student,", localUser);
if (!correction.goalStack.includes("collect_first_name")) {
  throw new Error(`Expected correction to leave first-name collection pending. Got ${JSON.stringify(correction.goalStack)}`);
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
if (!acknowledgment.goalStack.includes("collect_first_name")) {
  throw new Error(`Expected acknowledgment not to be saved as a first name. Got ${JSON.stringify(acknowledgment.goalStack)}`);
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
