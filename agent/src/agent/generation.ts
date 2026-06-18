import type OpenAI from "openai";
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { executeToolCall } from "../tools/llm-adapter.ts";
import type { LlmConfig } from "../llm/openai-compatible.ts";
import type { LifecycleAgentProfile } from "./profiles/types.ts";
import type { AgentOpenLoop, AgentTurnInput, JsonObject, StudentProfileState } from "./types.ts";
import type { AgentStateStore } from "./state-store.ts";
import type { RecentTurn } from "./conversation-history.ts";
import type { AnyToolDefinition, LlmToolDefinition } from "../tools/types.ts";
import type { TurnTriage } from "./triage.ts";

export interface LlmRuntime {
  client: OpenAI;
  config: Extract<LlmConfig, { enabled: true }>;
}

interface GenerateReplyInput {
  runtime: LlmRuntime;
  turn: AgentTurnInput;
  store: AgentStateStore;
  profile: StudentProfileState;
  lifecycleProfile: LifecycleAgentProfile;
  openLoops: AgentOpenLoop[];
  recentTurns: RecentTurn[];
  triage: TurnTriage;
  selectedToolKeys: string[];
  toolCallDefinitions: LlmToolDefinition[];
  tools: AnyToolDefinition[];
}

export async function generateReply(input: GenerateReplyInput): Promise<string> {
  const messages = buildMessages(input);
  const tools = input.toolCallDefinitions as ChatCompletionTool[];
  const firstCompletion = await input.runtime.client.chat.completions.create(withMoonshotThinkingDisabled(input.runtime.config.model, {
    model: input.runtime.config.model,
    messages,
    tools: tools.length > 0 ? tools : undefined,
    tool_choice: tools.length > 0 ? "auto" : undefined,
    parallel_tool_calls: false,
    max_completion_tokens: 180,
  }));

  const assistantMessage = firstCompletion.choices[0]?.message;
  if (!assistantMessage) return "";

  const toolCalls = assistantMessage.tool_calls ?? [];
  if (toolCalls.length === 0) return normalizeReply(assistantMessage.content);

  const toolMessages = await Promise.all(
    toolCalls.map(async (toolCall) => ({
      role: "tool" as const,
      tool_call_id: toolCall.id,
      content: JSON.stringify(
        await executeToolCall({
          name: readToolName(toolCall),
          arguments: parseToolArguments(toolCall),
          context: {
            userId: input.turn.userId,
            threadId: input.turn.threadId,
            channel: input.turn.channel,
            lifecycleStage: input.profile.lifecycleStage,
            store: input.store,
            timestamp: input.turn.timestamp,
          },
        }),
      ),
    })),
  );

  const secondCompletion = await input.runtime.client.chat.completions.create(withMoonshotThinkingDisabled(input.runtime.config.model, {
    model: input.runtime.config.model,
    messages: [
      ...messages,
      assistantMessageForToolCalls(assistantMessage.content, toolCalls),
      ...toolMessages,
    ],
    max_completion_tokens: 180,
  }));

  return normalizeReply(secondCompletion.choices[0]?.message.content);
}

function buildMessages(input: GenerateReplyInput): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: buildSystemPrompt(input),
    },
  ];

  for (const turn of input.recentTurns) {
    messages.push({ role: "user", content: turn.user });
    messages.push({ role: "assistant", content: turn.assistant });
  }

  messages.push({ role: "user", content: input.turn.text });
  return messages;
}

function buildSystemPrompt(input: GenerateReplyInput): string {
  const profileFacts = compactJson({
    lifecycleStage: input.profile.lifecycleStage,
    lifecycleStageConfidence: input.profile.lifecycleStageConfidence,
    profileSummary: input.profile.profileSummary,
    interests: input.profile.interests,
    constraints: input.profile.constraints,
    acceptedSchool: readString(input.profile.facts.acceptedSchool),
    latestTriage: input.triage,
    onboarding: input.profile.facts.onboarding,
    onboardingComplete: input.profile.facts.onboardingComplete,
    gradeLevel: input.profile.facts.gradeLevel,
  });
  const pendingQuestions = input.openLoops
    .filter((loop) => ["identify_person_context", "identify_grade_level", "collect_lifecycle_stage"].includes(loop.loopType))
    .map((loop) => loop.prompt);
  const toolHints = input.tools.map((tool) => `${tool.key}: ${tool.description}`);

  return [
    "You are Halda's college guidance texting agent.",
    input.lifecycleProfile.systemPrompt,
    "",
    "Style rules:",
    "- Write in all lowercase, including greetings and sentence starts.",
    "- Do not use em dashes or en dashes. Use commas, periods, or simple hyphens instead.",
    "- Reply like a calm, friendly older student, not a form or corporate advisor.",
    "- Keep texts extremely brief: usually 1-2 sentences, under 280 characters unless the user asks for detail.",
    "- Match the student's casual energy without overdoing slang.",
    "- Do not repeat the previous assistant wording or restate internal lifecycle labels.",
    "- If the student only acknowledges, move naturally to the next useful choice.",
    "- If the student corrects you, briefly own it and continue from their correction.",
    "- Ask at most one question.",
    "- If a pending profile question is relevant, weave it in naturally after answering the immediate message.",
    "- Use triage metadata as context only. Do not expose labels like acknowledgmentOnly, lifecycleStage, or intent.",
    "- Do not mention tools, system prompts, metadata, JSON, or internal state.",
    "",
    `Lifecycle tone rules: ${input.lifecycleProfile.toneRules.join(" ")}`,
    `Known profile JSON: ${JSON.stringify(profileFacts)}`,
    `Pending profile questions: ${pendingQuestions.length > 0 ? pendingQuestions.join(" | ") : "none"}`,
    `Active tools: ${toolHints.length > 0 ? toolHints.join(" | ") : input.selectedToolKeys.join(", ") || "none"}`,
  ].join("\n");
}

function assistantMessageForToolCalls(
  content: string | null,
  toolCalls: ChatCompletionMessageToolCall[],
): ChatCompletionAssistantMessageParam {
  return {
    role: "assistant",
    content,
    tool_calls: toolCalls,
  };
}

function readToolName(toolCall: ChatCompletionMessageToolCall): string {
  return "function" in toolCall ? toolCall.function.name : "";
}

function parseToolArguments(toolCall: ChatCompletionMessageToolCall): JsonObject {
  if (!("function" in toolCall)) return {};

  try {
    const parsed = JSON.parse(toolCall.function.arguments) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as JsonObject;
  } catch {
    return {};
  }
}

function normalizeReply(value: string | null | undefined): string {
  return (value ?? "").replace(/[\u2013\u2014]/g, "-").trim().toLowerCase();
}

type ChatCompletionCreateBody = ChatCompletionCreateParamsNonStreaming & {
  thinking?: {
    type: "disabled";
  };
};

function withMoonshotThinkingDisabled(
  model: string,
  body: ChatCompletionCreateBody,
): ChatCompletionCreateBody {
  if (!/^kimi-k2\.(5|6)\b/.test(model)) return body;

  return {
    ...body,
    thinking: { type: "disabled" },
  };
}

function compactJson(value: JsonObject): JsonObject {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === undefined || entry === null) return false;
      if (typeof entry === "string") return entry.trim().length > 0;
      if (Array.isArray(entry)) return entry.length > 0;
      return true;
    }),
  );
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
