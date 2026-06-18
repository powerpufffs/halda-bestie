import { getLifecycleProfile } from "./profiles/index.ts";
import { assembleToolBundle } from "./tool-bundles.ts";
import type {
  AgentEvent,
  AgentOpenLoop,
  AgentTurnInput,
  AgentTurnResult,
  ConversationState,
  StudentProfileState,
} from "./types.ts";
import { updateCollegeSearchFacts } from "./college-search-memory.ts";
import { resolveAgentPriority, syncConfiguredAgentPriorities } from "./agent-priority.ts";
import { appendRecentTurn, readRecentTurns } from "./conversation-history.ts";
import { generateReply, type LlmRuntime } from "./generation.ts";
import { advanceOnboarding } from "./onboarding.ts";
import { buildEmergencyFallbackReply } from "./reply.ts";
import { type AgentStateStore, setLifecycleStage } from "./state-store.ts";
import { triageTurn, type TurnTriage } from "./triage.ts";
import {
  buildWebsiteHandoff,
  markWebsiteHandoffSent,
  type WebsiteHandoff,
} from "./website-handoff.ts";

interface HandleAgentTurnOptions {
  llmRuntime?: LlmRuntime;
}

export async function handleAgentTurn(
  input: AgentTurnInput,
  store: AgentStateStore,
  options: HandleAgentTurnOptions = {},
): Promise<AgentTurnResult> {
  let profile = await store.getProfile(input.userId);
  let conversation = await store.getConversationState(input.userId, input.threadId);
  const recentMessages = await store.listRecentMessages(input.userId, 14);
  const openLoopsBeforeTurn = await store.listOpenLoops(input.userId);
  const recentTurns = readRecentTurns(conversation);
  const events: AgentEvent[] = [];

  const triage = await triageTurn(input.text, profile, {
    runtime: options.llmRuntime,
    recentMessages,
    openLoops: openLoopsBeforeTurn,
  });
  await logInboundMessage(input, store, triage);
  profile = applyLifecycleTriage(profile, input, triage, events);

  const onboarding = await advanceOnboarding({
    turn: input,
    store,
    profile,
    openLoops: openLoopsBeforeTurn,
    triage,
  });
  profile = onboarding.profile;
  events.push(...onboarding.events);

  const selectedProfile = getLifecycleProfile(profile.lifecycleStage);
  const toolBundle = assembleToolBundle({
    channel: input.channel,
    lifecycleStage: profile.lifecycleStage,
    profile: selectedProfile,
    currentIntent: triage.intent,
  });
  profile = updateProfileFromTurn(profile, input.text, triage, toolBundle.selectedToolKeys, onboarding.openLoops);
  const openLoops = await syncConfiguredAgentPriorities({
    userId: input.userId,
    threadId: input.threadId,
    store,
    profile,
    profileConfig: selectedProfile,
    openLoops: onboarding.openLoops,
    currentIntent: triage.intent,
  });
  const goalStack = openLoops.map((loop) => loop.loopType);
  const agentPriority = resolveAgentPriority(openLoops);
  conversation = buildConversationState({
    agentPriority,
    conversation,
    goalStack,
    input,
    onboarding,
    selectedProfile,
    toolBundle,
    triage,
  });
  await store.saveProfile(profile);

  let { reply, generationMode } = await generateReplyWithFallback({
    text: input.text,
    triage,
    profile,
    turn: input,
    store,
    selectedProfile,
    onboardingOpenLoops: openLoops,
    recentMessages,
    recentTurns,
    toolBundle,
    llmRuntime: options.llmRuntime,
    events,
  });
  profile = await store.getProfile(input.userId);

  const websiteHandoff = buildWebsiteHandoff({ profile, turn: input });
  const handoffReply = attachWebsiteHandoff(reply, websiteHandoff, generationMode);
  if (handoffReply) {
    reply = handoffReply;
    profile = markWebsiteHandoffSent({ profile, handoff: websiteHandoff, sentAt: input.timestamp });
    events.push({
      userId: input.userId,
      threadId: input.threadId,
      eventType: "website_handoff_link_sent",
      input: { intent: triage.intent },
      output: { url: websiteHandoff.url, expiresAt: websiteHandoff.expiresAt },
      createdAt: input.timestamp,
    });
  }
  await logAssistantMessage(input, store, reply, generationMode, toolBundle.selectedToolKeys);
  profile = rememberAgentReply(profile, reply, input.timestamp);
  conversation = appendTurnHistory(conversation, recentTurns, input, reply);

  events.push({
    userId: input.userId,
    threadId: input.threadId,
    eventType: "agent_reply_generated",
    input: { intent: triage.intent },
    output: { selectedToolKeys: toolBundle.selectedToolKeys, generationMode },
    createdAt: input.timestamp,
  });

  await store.saveProfile(profile);
  await store.saveConversationState(conversation);
  await store.logEvents(events);

  return {
    reply,
    generationMode,
    profile,
    conversation,
    selectedToolKeys: toolBundle.selectedToolKeys,
    toolCallDefinitions: toolBundle.toolCallDefinitions,
    goalStack,
    events,
  };
}

function attachWebsiteHandoff(
  reply: string,
  handoff: WebsiteHandoff,
  _generationMode: "llm" | "fallback",
): string | undefined {
  if (!handoff.ready || !handoff.url) return undefined;
  if (reply.includes(handoff.url)) return reply;

  const linkLine = `you’re all set to finish signup. open your halda console here: ${handoff.url}`;
  return linkLine;
}

async function logInboundMessage(
  input: AgentTurnInput,
  store: AgentStateStore,
  triage: TurnTriage,
): Promise<void> {
  await store.logMessage({
    userId: input.userId,
    threadId: input.threadId,
    channel: input.channel,
    role: "user",
    body: input.text,
    status: "received",
    externalMessageId: input.externalMessageId,
    metadata: { ...(input.metadata ?? {}), triage },
    occurredAt: input.timestamp,
    processedAt: new Date(),
  });
}

function applyLifecycleTriage(
  profile: StudentProfileState,
  input: AgentTurnInput,
  triage: TurnTriage,
  events: AgentEvent[],
): StudentProfileState {
  const inferredProfile = getLifecycleProfile(triage.lifecycleStage);
  const profileChanged =
    triage.lifecycleStage !== profile.lifecycleStage ||
    inferredProfile.name !== profile.agentProfileKey;
  if (!profileChanged) return profile;

  events.push({
    userId: input.userId,
    threadId: input.threadId,
    eventType: "lifecycle_stage_updated",
    input: { text: input.text },
    output: { stage: triage.lifecycleStage, reason: triage.lifecycleReason },
    createdAt: input.timestamp,
  });

  return setLifecycleStage(
    profile,
    triage.lifecycleStage,
    triage.lifecycleConfidence,
    inferredProfile.name,
  );
}

interface BuildConversationStateInput {
  agentPriority: ReturnType<typeof resolveAgentPriority>;
  conversation: ConversationState;
  goalStack: string[];
  input: AgentTurnInput;
  onboarding: Awaited<ReturnType<typeof advanceOnboarding>>;
  selectedProfile: ReturnType<typeof getLifecycleProfile>;
  toolBundle: ReturnType<typeof assembleToolBundle>;
  triage: TurnTriage;
}

function buildConversationState(input: BuildConversationStateInput): ConversationState {
  return {
    ...input.conversation,
    agentProfileKey: input.selectedProfile.name,
    currentIntent: input.triage.intent,
    slotValues: {
      ...input.conversation.slotValues,
      goalStack: input.goalStack,
      stateBlob: {
        ...input.onboarding.stateBlob,
        goalStack: input.goalStack,
      },
      latestTriage: input.triage,
      agentPriority: input.agentPriority ?? null,
      activeIntent: {
        name: input.toolBundle.activeIntent.name,
        triggerCondition: input.toolBundle.activeIntent.triggerCondition,
        toolKeys: input.toolBundle.selectedToolKeys,
      },
    },
    shortTermSummary: [
      `Latest intent: ${input.triage.intent}.`,
      `Onboarding: ${input.onboarding.resolution}.`,
      `Agent priority: ${input.agentPriority?.loopType ?? "none"}.`,
      `Active goals: ${input.goalStack.join(", ") || "none"}.`,
      `Latest message: ${input.input.text}`,
    ].join(" "),
  };
}

async function logAssistantMessage(
  input: AgentTurnInput,
  store: AgentStateStore,
  reply: string,
  generationMode: "llm" | "fallback",
  selectedToolKeys: string[],
): Promise<void> {
  await store.logMessage({
    userId: input.userId,
    threadId: input.threadId,
    channel: input.channel,
    role: "assistant",
    body: reply,
    status: "queued",
    metadata: {
      ...(input.metadata ?? {}),
      generationMode,
      selectedToolKeys,
    },
    occurredAt: input.timestamp,
    processedAt: new Date(),
  });
}

function appendTurnHistory(
  conversation: ConversationState,
  recentTurns: ReturnType<typeof readRecentTurns>,
  input: AgentTurnInput,
  reply: string,
): ConversationState {
  return {
    ...conversation,
    slotValues: {
      ...conversation.slotValues,
      recentTurns: appendRecentTurn(recentTurns, {
        user: input.text,
        assistant: reply,
        at: input.timestamp.toISOString(),
      }),
    },
  };
}

interface GenerateReplyWithFallbackInput {
  text: string;
  triage: TurnTriage;
  profile: StudentProfileState;
  turn: AgentTurnInput;
  store: AgentStateStore;
  selectedProfile: ReturnType<typeof getLifecycleProfile>;
  onboardingOpenLoops: Awaited<ReturnType<typeof advanceOnboarding>>["openLoops"];
  recentMessages: Awaited<ReturnType<AgentStateStore["listRecentMessages"]>>;
  recentTurns: ReturnType<typeof readRecentTurns>;
  toolBundle: ReturnType<typeof assembleToolBundle>;
  llmRuntime?: LlmRuntime;
  events: AgentEvent[];
}

async function generateReplyWithFallback(
  input: GenerateReplyWithFallbackInput,
): Promise<{ reply: string; generationMode: "llm" | "fallback" }> {
  if (!input.llmRuntime) {
    return { reply: buildEmergencyFallbackReply(), generationMode: "fallback" };
  }

  try {
    const reply = await generateReply({
      runtime: input.llmRuntime,
      turn: input.turn,
      store: input.store,
      profile: input.profile,
      lifecycleProfile: input.selectedProfile,
      openLoops: input.onboardingOpenLoops,
      recentMessages: input.recentMessages,
      recentTurns: input.recentTurns,
      triage: input.triage,
      activeIntent: input.toolBundle.activeIntent,
      selectedToolKeys: input.toolBundle.selectedToolKeys,
      toolCallDefinitions: input.toolBundle.toolCallDefinitions,
      tools: input.toolBundle.tools,
    });

    return { reply: reply || buildEmergencyFallbackReply(), generationMode: reply ? "llm" : "fallback" };
  } catch (error) {
    input.events.push({
      userId: input.turn.userId,
      threadId: input.turn.threadId,
      eventType: "agent_reply_generation_failed",
      input: { intent: input.triage.intent, latestMessage: input.text },
      output: { error: error instanceof Error ? error.message : String(error) },
      createdAt: input.turn.timestamp,
    });

    return { reply: buildEmergencyFallbackReply(), generationMode: "fallback" };
  }
}

function updateProfileFromTurn(
  profile: StudentProfileState,
  text: string,
  triage: TurnTriage,
  selectedToolKeys: string[],
  openLoops: AgentOpenLoop[],
) {
  const interests = new Set(profile.interests);
  for (const interest of triage.interests) interests.add(interest);
  const collegeSearch = updateCollegeSearchFacts(profile, text, triage, openLoops);

  return {
    ...profile,
    facts: {
      ...profile.facts,
      lastIntent: triage.intent,
      lastMessagePreview: text.slice(0, 160),
      lastTriage: triage,
      ...(triage.acceptedSchool ? { acceptedSchool: triage.acceptedSchool } : {}),
      ...(collegeSearch ? { collegeSearch } : {}),
    },
    interests: [...interests],
    toolAccess: selectedToolKeys,
    profileSummary: buildProfileSummary(profile.lifecycleStage, [...interests]),
  };
}

function rememberAgentReply(
  profile: StudentProfileState,
  reply: string,
  timestamp: Date,
): StudentProfileState {
  return {
    ...profile,
    facts: {
      ...profile.facts,
      lastAgentReply: reply,
      lastAgentReplyAt: timestamp.toISOString(),
    },
  };
}

function buildProfileSummary(lifecycleStage: string, interests: string[]): string {
  const stageText = lifecycleStage === "unknown" ? "a student with an unknown stage" : `a ${lifecycleStage}`;
  const interestText = interests.length > 0 ? ` interested in ${interests.join(", ")}` : "";

  return `This student is ${stageText}${interestText}.`;
}
