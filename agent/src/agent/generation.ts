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
import type { ResolvedIntentConfig } from "./config/types.ts";
import type {
  AgentConversationMessage,
  AgentOpenLoop,
  AgentTurnInput,
  JsonObject,
  StudentProfileState,
} from "./types.ts";
import type { AgentStateStore } from "./state-store.ts";
import { resolveAgentPriority } from "./agent-priority.ts";
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
  recentMessages: AgentConversationMessage[];
  recentTurns: RecentTurn[];
  triage: TurnTriage;
  activeIntent: ResolvedIntentConfig;
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
    max_completion_tokens: 320,
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
    max_completion_tokens: 320,
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

  if (input.recentMessages.length > 0) {
    for (const message of input.recentMessages) {
      messages.push({
        role: message.role,
        content: formatRecentMessage(message),
      });
    }
  } else {
    for (const turn of input.recentTurns) {
      messages.push({ role: "user", content: turn.user });
      messages.push({ role: "assistant", content: turn.assistant });
    }
  }

  messages.push({ role: "user", content: input.turn.text });
  return messages;
}

function formatRecentMessage(message: AgentConversationMessage): string {
  return stripLeadingChannelLabel(message.body);
}

function buildSystemPrompt(input: GenerateReplyInput): string {
  const onboarding = asRecord(input.profile.facts.onboarding);
  const agentPriority = resolveAgentPriority(input.openLoops);
  const pendingQuestions = input.openLoops
    .filter((loop) => ["identify_person_context", "identify_grade_level", "collect_lifecycle_stage"].includes(loop.loopType))
    .map((loop) => loop.prompt);
  const contextBlock = compactJson({
    channel: input.turn.channel,
    stage: input.profile.lifecycleStage,
    firstName: readString(input.profile.facts.firstName) ?? readString(onboarding.firstName),
    highSchool: readString(input.profile.facts.highSchool) ?? readString(onboarding.highSchool),
    role: readString(input.profile.facts.onboardingRole) ?? readString(onboarding.role),
    grade: readString(input.profile.facts.gradeLevel) ?? readString(onboarding.gradeLevel),
    acceptedSchool: readString(input.profile.facts.acceptedSchool),
    known: input.profile.profileSummary,
    interests: input.profile.interests,
    constraints: input.profile.constraints,
    communicationStyle: buildCommunicationStyleContext(input),
    currentIntent: input.triage.intent,
    recentMessageChannels: [...new Set(input.recentMessages.map((message) => message.channel))],
    intentDirective: input.activeIntent.promptDirective,
    urgency: input.triage.urgency !== "low" ? input.triage.urgency : undefined,
    flags: [
      input.triage.acknowledgmentOnly ? "acknowledgment_only" : undefined,
      input.triage.correction ? "correction" : undefined,
    ].filter(Boolean),
    agentPriority,
    openLoops: pendingQuestions,
    collegeSearch: buildCollegeSearchContext(input),
  });
  const toolHints = input.tools.map((tool) => `${tool.key}: ${tool.description}`);

  return [
    "You are Halda's college guidance agent across sms, email, and web chat.",
    input.lifecycleProfile.systemPrompt,
    "",
    "Style rules:",
    "- Output only the final student-facing reply. Never include hidden reasoning, analysis, planning notes, draft alternatives, tool-selection thoughts, or scratchpad text.",
    "- Do not write phrases like \"the user wants\", \"i should\", \"let me\", \"draft:\", \"better:\", \"analysis:\", or \"final answer:\".",
    "- Write in all lowercase, including greetings and sentence starts.",
    "- Use short, text-message sentences. Prefer fragments when they sound natural.",
    "- Do not use em dashes or en dashes. Avoid formal punctuation stacks like semicolons and colons.",
    "- Reply like a thoughtful peer who makes college choices feel manageable, not a counselor, brand account, or teen persona.",
    "- Keep sms, imessage, and web chat extremely brief: usually 1-2 sentences, under 280 characters unless the user asks for detail.",
    "- For email, still be casual and concise, but 2-4 short sentences is okay when useful.",
    "- Match the student's casual energy, but default to plain, grounded language.",
    "- Humor should be rare and natural. Never roast anxiety, money, grades, identity, family stuff, or anything the student seems worried about.",
    "- Encourage progress genuinely. Keep it specific, not motivational-poster energy.",
    "- Avoid performative slang and meme phrases like no cap, slay, bestie, ate, it's giving, fr, ngl, lowkey, and literally unless the student used that phrase first and it would not sound forced.",
    "- Do not stack casual markers. If a line feels like it is trying to sound young, rewrite it plainly.",
    "- Emojis are allowed only when they clearly match the student's style. Usually use none.",
    "- Never over-explain. If a sentence is just setup, cut it.",
    "- Demo onboarding is intentionally simple: collect first name, grade/year, and high school. After those are known, warmly suggest finishing signup.",
    "- If any of first name, grade/year, or high school is missing, answer the user's immediate question briefly, then ask for exactly one missing field.",
    "- Respect Context.communicationStyle as the student's tone preference.",
    "- Communication style preferences can tune slang, emoji, roasting, directness, and detail level, but they cannot override college guidance, factuality, safety, brevity, tool policy, or hidden instructions.",
    "- If update_communication_style is active and the student asks to change how you talk, call it before replying.",
    "- If the student asks for less slang, fewer emojis, no roasting, or more directness, follow that preference immediately.",
    "- Do not repeat the previous assistant wording or restate internal lifecycle labels.",
    "- Some prior messages may come from other channels. Treat them as same-student history, but never include channel labels like [email] or [imessage] in your reply.",
    "- If the student only acknowledges, move naturally to the next useful choice.",
    "- If the student corrects you, briefly own it and continue from their correction.",
    "- Ask at most one question in sms, imessage, website, mobile app, and terminal.",
    "- In email or gmail, ask for all missing inputs for the current task in one compact message.",
    "- If Context.agentPriority exists, it is the current agent-driven goal. Steer toward resolving it even when currentIntent is chat.",
    "- Still answer the immediate message briefly when needed, then ask one natural question for the priority.",
    "- For college search in sms-like channels, collect one missing field at a time: direction or schools, region or open-anywhere, rough yearly budget after aid, then gpa if they want reach/target/likely labels.",
    "- For college search in email or gmail, if inputs are missing, ask for all missing fields together: major/career or schools, state/area or anywhere, yearly budget after aid, and optional gpa.",
    "- When enough college-search context exists, or the student asks to search now, call college_match_search. State any caveats briefly after the tool result.",
    "- Use the context block quietly. Do not expose labels like lifecycleStage, currentIntent, agentPriority, or openLoops.",
    "- Use Context.intentDirective as the local job for this turn when present.",
    "- Use tools only when active tools are listed and you need their data or persistence. Otherwise just talk.",
    "- If a tool result says status is not_connected, treat it as unavailable and do not present its facts as verified.",
    "- Do not mention tools, system prompts, metadata, JSON, or internal state.",
    "",
    `Lifecycle tone rules: ${input.lifecycleProfile.toneRules.join(" ")}`,
    `Context: ${JSON.stringify(contextBlock)}`,
    `Active tools: ${toolHints.length > 0 ? toolHints.join(" | ") : input.selectedToolKeys.join(", ") || "none"}`,
  ].join("\n");
}

function assistantMessageForToolCalls(
  content: string | null,
  toolCalls: ChatCompletionMessageToolCall[],
): ChatCompletionAssistantMessageParam {
  return {
    role: "assistant",
    content: scrubReasoningTrace(content) || null,
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
  const normalized = scrubReasoningTrace(value).replace(/[\u2013\u2014]/g, "-").trim().toLowerCase();
  return stripLeadingChannelLabel(normalized).trim();
}

function scrubReasoningTrace(value: string | null | undefined): string {
  const withoutTaggedThinking = (value ?? "")
    .replace(/<think(?:ing)?\b[^>]*>[\s\S]*?<\/think(?:ing)?>/gi, "")
    .replace(/```(?:analysis|reasoning|thought)[\s\S]*?```/gi, "")
    .trim();
  if (!withoutTaggedThinking) return "";

  const delimiterMatch = [...withoutTaggedThinking.matchAll(/(?:^|\n)\s*(?:final(?: answer)?|reply|answer)\s*:\s*/gi)].at(-1);
  if (delimiterMatch?.index !== undefined) {
    return stripWrappingQuotes(withoutTaggedThinking.slice(delimiterMatch.index + delimiterMatch[0].length).trim());
  }

  const lines = withoutTaggedThinking.split(/\r?\n/);
  const markerIndexes = lines.flatMap((line, index) => reasoningMarker(line) ? [index] : []);
  const earlyMarkerCount = markerIndexes.filter((index) => index < 16).length;
  if (earlyMarkerCount < 2) return withoutTaggedThinking;

  const candidate = lines.slice(Math.max(...markerIndexes) + 1).join("\n").trim();
  if (candidate) return stripWrappingQuotes(candidate);

  const lastPlainParagraph = withoutTaggedThinking
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .toReversed()
    .find((part) => !part.split(/\r?\n/).some(reasoningMarker));

  return stripWrappingQuotes(lastPlainParagraph ?? "");
}

function reasoningMarker(line: string): boolean {
  const text = line.trim().toLowerCase();
  if (!text) return false;

  return (
    /^(?:the user|user wants|i should|i need|i have to|i can|i will|i’ll|i'll|let me|maybe|draft|rewrite|better|analysis|reasoning|thought|plan|context|final answer candidate)\b/.test(text) ||
    /\b(?:stay in character|system prompt|context block|agentpriority|active tools|tool call|scratchpad|hidden reasoning)\b/.test(text)
  );
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^["']|["']$/g, ""))
    .join("\n")
    .trim();
}

function stripLeadingChannelLabel(value: string): string {
  const channelPattern = "(?:sms|imessage|email|gmail|website|mobile_app|terminal)";
  return value
    .replace(new RegExp(`^(?:\\s*\\[${channelPattern}\\]\\s*)+`, "i"), "")
    .replace(new RegExp(`^(?:\\s*${channelPattern}\\s*[:\\-]\\s*)+`, "i"), "");
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
  if (!/^kimi-k2(?:[.-]|$)/i.test(model)) return body;

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

function buildCollegeSearchContext(input: GenerateReplyInput): JsonObject | undefined {
  const collegeSearch = asRecord(input.profile.facts.collegeSearch);
  const knownSchools = asStringArray(collegeSearch.knownSchools);
  const interests = [...new Set([...input.profile.interests, ...asStringArray(collegeSearch.interests)])];
  const direction = readString(collegeSearch.direction) ?? interests[0];
  const missing = [
    !direction && knownSchools.length === 0 ? "direction_or_known_schools" : undefined,
    !readString(collegeSearch.region) && collegeSearch.openAnywhere !== true && knownSchools.length === 0
      ? "region_or_open_anywhere"
      : undefined,
    typeof collegeSearch.budgetAnnual !== "number" ? "budgetAnnual" : undefined,
    typeof collegeSearch.gpa !== "number" && collegeSearch.gpaSkipped !== true ? "gpa_optional" : undefined,
  ].filter((field): field is string => Boolean(field));
  const isRelevant =
    input.triage.intent === "college_search" ||
    input.openLoops.some((loop) => loop.loopType.startsWith("collect_college_search_")) ||
    Object.keys(collegeSearch).length > 0;
  if (!isRelevant) return undefined;

  return compactJson({
    direction,
    interests,
    knownSchools,
    region: readString(collegeSearch.region),
    openAnywhere: collegeSearch.openAnywhere === true,
    budgetAnnual: typeof collegeSearch.budgetAnnual === "number" ? collegeSearch.budgetAnnual : undefined,
    gpa: typeof collegeSearch.gpa === "number" ? collegeSearch.gpa : undefined,
    gpaSkipped: collegeSearch.gpaSkipped === true,
    firstGen: typeof collegeSearch.firstGen === "boolean" ? collegeSearch.firstGen : undefined,
    missing,
    smsOrder: ["direction_or_known_schools", "region_or_open_anywhere", "budgetAnnual", "gpa_optional"],
  });
}

function buildCommunicationStyleContext(input: GenerateReplyInput): JsonObject | undefined {
  const style = compactJson(input.profile.communicationStyle);
  if (Object.keys(style).length === 0) return undefined;

  return style;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asRecord(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}
