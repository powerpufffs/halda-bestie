import { handleAgentTurn } from "../agent/handle-turn.ts";
import type { LlmRuntime } from "../agent/generation.ts";
import { InMemoryAgentStateStore } from "../agent/state-store.ts";
import { isTriageRequest, triageCompletion, type FakeChatBody } from "./fake-llm.ts";

const store = new InMemoryAgentStateStore();
const fakeRuntime = {
  config: {
    enabled: true,
    apiKey: "fake",
    baseUrl: "http://fake.local",
    model: "fake-model",
  },
  client: {
    chat: {
      completions: {
        create: async (body: FakeChatBody) => {
          if (isTriageRequest(body)) return triageCompletion({ onboardingRelevant: false });

          const hasCommunicationStyleTool = body.tools?.some(
            (tool) => tool.function.name === "update_communication_style",
          );

          if (hasCommunicationStyleTool) {
            return {
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: null,
                    tool_calls: [
                      {
                        id: "call_style",
                        type: "function",
                        function: {
                          name: "update_communication_style",
                          arguments: JSON.stringify({
                            directness: "high",
                            slangLevel: "low",
                            roastLevel: "none",
                          }),
                        },
                      },
                    ],
                  },
                },
              ],
            };
          }

          return {
            choices: [
              {
                message: {
                  role: "assistant",
                  content: "got you, i’ll keep it direct and chill",
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
    userId: "imessage:+15550002222",
    threadId: "communication-style-smoke",
    text: "can you be direct and use less slang, also don't roast me please",
    timestamp: new Date(),
  },
  store,
  { llmRuntime: fakeRuntime },
);

const style = result.profile.communicationStyle;
if (!result.selectedToolKeys.includes("update_communication_style")) {
  throw new Error(`Expected update_communication_style tool. Got ${JSON.stringify(result.selectedToolKeys)}`);
}
if (style.directness !== "high") {
  throw new Error(`Expected directness=high. Got ${JSON.stringify(style)}`);
}
if (style.slangLevel !== "low") {
  throw new Error(`Expected slangLevel=low. Got ${JSON.stringify(style)}`);
}
if (style.roastLevel !== "none") {
  throw new Error(`Expected roastLevel=none. Got ${JSON.stringify(style)}`);
}
if (style.userSteerable !== true) {
  throw new Error(`Expected userSteerable=true. Got ${JSON.stringify(style)}`);
}
if (style.source !== "update_communication_style") {
  throw new Error(`Expected source=update_communication_style. Got ${JSON.stringify(style)}`);
}

console.log("Communication style smoke test passed.");
