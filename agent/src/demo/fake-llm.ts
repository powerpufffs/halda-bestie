import type { LlmRuntime } from "../agent/generation.ts";
import type { TurnTriage } from "../agent/triage.ts";

export type FakeChatBody = {
  messages?: Array<{ content?: unknown }>;
  tools?: Array<{ function: { name: string } }>;
  thinking?: { type: string };
};

type FakeTriage = Partial<Omit<TurnTriage, "source" | "evidence" | "onboarding">> & {
  evidence?: string[];
  onboarding?: Partial<TurnTriage["onboarding"]>;
};

export function isTriageRequest(body: FakeChatBody): boolean {
  const content = body.messages?.[0]?.content;
  return typeof content === "string" && content.includes("You classify one student message for Halda");
}

export function latestTriageMessage(body: FakeChatBody): string {
  const content = body.messages?.[1]?.content;
  if (typeof content !== "string") return "";
  const parsed = JSON.parse(content) as { latestMessage?: unknown };
  return typeof parsed.latestMessage === "string" ? parsed.latestMessage : "";
}

export function triageCompletion(overrides: FakeTriage = {}) {
  const base = {
    intent: "chat",
    role: "unknown",
    collegeIntent: "unknown",
    gradeLevel: "unknown",
    lifecycleStage: "unknown",
    lifecycleConfidence: 0,
    lifecycleReason: "fake llm triage",
    firstName: null,
    highSchool: null,
    acceptedSchool: null,
    interests: [],
    acknowledgmentOnly: false,
    correction: false,
    onboardingRelevant: true,
    urgency: "low",
    evidence: [],
    ...overrides,
  };
  const onboarding = {
    firstName: base.firstName,
    highSchool: base.highSchool,
    role: base.role,
    collegeIntent: base.collegeIntent,
    gradeLevel: base.gradeLevel,
    lifecycleStage: base.lifecycleStage,
    complete: false,
    resolution: "partial_answer",
    nextLoop: null,
    completeLoopTypes: [],
    evidence: base.evidence,
    ...overrides.onboarding,
  };

  return {
    choices: [
      {
        message: {
          role: "assistant",
          content: JSON.stringify({
            ...base,
            onboarding,
          }),
        },
      },
    ],
  };
}

export function assistantCompletion(content: string) {
  return {
    choices: [
      {
        message: {
          role: "assistant",
          content,
        },
      },
    ],
  };
}

export function fakeRuntime(create: (body: FakeChatBody) => Promise<unknown>): LlmRuntime {
  return {
    config: {
      enabled: true,
      apiKey: "fake",
      baseUrl: "http://fake.local",
      model: "fake-model",
    },
    client: {
      chat: {
        completions: {
          create,
        },
      },
    },
  } as unknown as LlmRuntime;
}
