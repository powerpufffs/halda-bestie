import { handleAgentTurn } from "../agent/handle-turn.ts";
import type { LlmRuntime } from "../agent/generation.ts";
import { InMemoryAgentStateStore } from "../agent/state-store.ts";
import { isTriageRequest, triageCompletion, type FakeChatBody } from "./fake-llm.ts";

const leakedReasoning = [
  'the user wants to be "crazy rich" after college. they are also worried about being too poor for college.',
  "i should avoid over-explaining or being preachy.",
  "let me give a brief, realistic take and ask one question.",
  "draft:",
  '"no cap, tech, finance, and healthcare usually pay the most out the gate."',
  "better. one slang phrase is enough.",
  "",
  "i feel you, money stress is real. college can still be worth it if we aim for high-paying paths and schools that give real aid.",
  "are you more interested in tech, healthcare, business, or just whatever gets you paid?",
].join("\n");

const fakeRuntime = {
  config: {
    enabled: true,
    apiKey: "fake",
    baseUrl: "http://fake.local",
    model: "kimi-k2.7",
  },
  client: {
    chat: {
      completions: {
        create: async (body: FakeChatBody) => {
          if (isTriageRequest(body)) {
            return triageCompletion({
              intent: "career",
              role: "student",
              collegeIntent: "looking_to_enter_college",
              interests: ["money"],
            });
          }

          if (body.thinking?.type !== "disabled") {
            throw new Error(`Expected thinking disabled for kimi-k2.7. Got ${JSON.stringify(body.thinking)}`);
          }

          return {
            choices: [
              {
                message: {
                  role: "assistant",
                  content: leakedReasoning,
                },
              },
            ],
          };
        },
      },
    },
  },
} as unknown as LlmRuntime;

const result = await handleAgentTurn(
  {
    channel: "imessage",
    userId: "imessage:+15550003333",
    threadId: "reasoning-leak-smoke",
    text: "after college. i wanna be crazy rich. i'm also too poor for college",
    timestamp: new Date(),
  },
  new InMemoryAgentStateStore(),
  { llmRuntime: fakeRuntime },
);

const forbidden = ["the user wants", "i should", "let me", "draft:", "better."];
for (const marker of forbidden) {
  if (result.reply.includes(marker)) {
    throw new Error(`Reasoning marker leaked: ${marker}. Reply: ${result.reply}`);
  }
}

if (!result.reply.includes("i feel you")) {
  throw new Error(`Expected final answer to survive. Got: ${result.reply}`);
}

console.log("Reasoning leak smoke test passed.");
