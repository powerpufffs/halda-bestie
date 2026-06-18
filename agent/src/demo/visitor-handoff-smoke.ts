import { handleAgentTurn } from "../agent/handle-turn.ts";
import { InMemoryAgentStateStore } from "../agent/state-store.ts";
import {
  assistantCompletion,
  fakeRuntime,
  isTriageRequest,
  latestTriageMessage,
  triageCompletion,
} from "./fake-llm.ts";

process.env.APP_SECRET ??= "visitor-handoff-smoke-secret";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";

const store = new InMemoryAgentStateStore();
const userId = "imessage:+15550001111";
const threadId = "visitor-handoff-smoke";
const llmRuntime = fakeRuntime(async (body) => {
  if (isTriageRequest(body)) return triageFor(latestTriageMessage(body));
  return assistantCompletion("ok");
});

async function send(text: string) {
  return handleAgentTurn(
    {
      channel: "imessage",
      userId,
      threadId,
      text,
      timestamp: new Date(),
    },
    store,
    { llmRuntime },
  );
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
          completeLoopTypes: ["identify_grade_level"],
          evidence: ["role:student", "college_intent:looking_to_enter_college", "grade:11th", "lifecycle:junior"],
        },
      });
    case "Timpview":
      return triageCompletion({
        evidence: [],
        onboarding: {},
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

const greeting = await send("hey");
if (greeting.reply.includes("/join?token=")) {
  throw new Error("Handoff link should not be sent before onboarding starts.");
}

const name = await send("Keilyn");
if (name.reply.includes("/join?token=")) {
  throw new Error("Handoff link should wait for grade and high school.");
}

const stage = await send("jr");
if (stage.profile.lifecycleStage !== "junior") {
  throw new Error(`Expected junior lifecycle stage. Got ${stage.profile.lifecycleStage}.`);
}
if (stage.reply.includes("/join?token=")) {
  throw new Error("Handoff link should wait for high school.");
}

const handoff = await send("Timpview");
const onboarding = handoff.profile.facts.onboarding as Record<string, unknown>;
if (onboarding.firstName !== "Keilyn" || onboarding.gradeLevel !== "11th" || onboarding.highSchool !== "Timpview") {
  throw new Error(`Expected signup onboarding fields. Got ${JSON.stringify(onboarding)}.`);
}

const demoCode = handoff.reply.match(/\/join\?demo=([a-f0-9]+)/)?.[1];
if (!demoCode) {
  throw new Error(`Expected short demo handoff link in reply. Got ${handoff.reply}`);
}
if (handoff.reply.includes("token=")) {
  throw new Error(`Demo handoff should not expose a signed token. Got ${handoff.reply}`);
}

const repeat = await send("cool");
if (repeat.reply.includes("/join?token=")) {
  throw new Error("Handoff link should only be sent once.");
}

console.log("Visitor handoff smoke test passed.");
