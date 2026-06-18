import { getLifecycleProfile } from "./profiles/index.ts";
import { assembleToolBundle } from "./tool-bundles.ts";
import type { AgentEvent, AgentTurnInput, AgentTurnResult, StudentProfileState } from "./types.ts";
import { classifyIntent } from "./intent.ts";
import { inferLifecycleStage } from "./lifecycle.ts";
import { advanceOnboarding } from "./onboarding.ts";
import { buildReply } from "./reply.ts";
import { type AgentStateStore, setLifecycleStage } from "./state-store.ts";

export async function handleAgentTurn(
  input: AgentTurnInput,
  store: AgentStateStore,
): Promise<AgentTurnResult> {
  let profile = await store.getProfile(input.userId);
  let conversation = await store.getConversationState(input.userId, input.threadId);
  const events: AgentEvent[] = [];

  const lifecycle = inferLifecycleStage(input.text, profile);
  const inferredProfile = getLifecycleProfile(lifecycle.stage);
  const profileChanged =
    lifecycle.stage !== profile.lifecycleStage ||
    inferredProfile.profileKey !== profile.agentProfileKey;

  if (profileChanged) {
    profile = setLifecycleStage(
      profile,
      lifecycle.stage,
      lifecycle.confidence,
      inferredProfile.profileKey,
    );
    events.push({
      userId: input.userId,
      threadId: input.threadId,
      eventType: "lifecycle_stage_updated",
      input: { text: input.text },
      output: { stage: lifecycle.stage, reason: lifecycle.reason },
      createdAt: input.timestamp,
    });
  }

  const intent = classifyIntent(input.text);
  const onboarding = await advanceOnboarding({
    turn: input,
    store,
    profile,
    openLoops: await store.listOpenLoops(input.userId),
  });
  profile = onboarding.profile;
  events.push(...onboarding.events);

  const selectedProfile = getLifecycleProfile(profile.lifecycleStage);
  conversation = {
    ...conversation,
    agentProfileKey: selectedProfile.profileKey,
    currentIntent: intent,
    slotValues: {
      ...conversation.slotValues,
      goalStack: onboarding.goalStack,
      stateBlob: onboarding.stateBlob,
    },
    shortTermSummary: [
      `Latest intent: ${intent}.`,
      `Onboarding: ${onboarding.resolution}.`,
      `Active goals: ${onboarding.goalStack.join(", ") || "none"}.`,
      `Latest message: ${input.text}`,
    ].join(" "),
  };

  const toolBundle = assembleToolBundle({
    channel: input.channel,
    lifecycleStage: profile.lifecycleStage,
    profile: selectedProfile,
    currentIntent: intent,
  });

  profile = updateProfileFromTurn(profile, input.text, intent, toolBundle.selectedToolKeys);
  const reply = buildReply({
    text: input.text,
    intent,
    profile,
    openLoops: onboarding.openLoops,
    selectedToolKeys: toolBundle.selectedToolKeys,
  });

  events.push({
    userId: input.userId,
    threadId: input.threadId,
    eventType: "agent_reply_generated",
    input: { intent },
    output: { selectedToolKeys: toolBundle.selectedToolKeys },
    createdAt: input.timestamp,
  });

  await store.saveProfile(profile);
  await store.saveConversationState(conversation);
  await store.logEvents(events);

  return {
    reply,
    profile,
    conversation,
    selectedToolKeys: toolBundle.selectedToolKeys,
    toolCallDefinitions: toolBundle.toolCallDefinitions,
    goalStack: onboarding.goalStack,
    events,
  };
}

function updateProfileFromTurn(
  profile: StudentProfileState,
  text: string,
  intent: string,
  selectedToolKeys: string[],
) {
  const interests = new Set(profile.interests);
  if (/\bnursing\b/i.test(text)) interests.add("nursing");
  if (/\b(cs|computer science|coding|programming|ai)\b/i.test(text)) interests.add("computer science");
  if (/\bbusiness\b/i.test(text)) interests.add("business");

  return {
    ...profile,
    facts: {
      ...profile.facts,
      lastIntent: intent,
      lastMessagePreview: text.slice(0, 160),
    },
    interests: [...interests],
    toolAccess: selectedToolKeys,
    profileSummary: buildProfileSummary(profile.lifecycleStage, [...interests]),
  };
}

function buildProfileSummary(lifecycleStage: string, interests: string[]): string {
  const stageText = lifecycleStage === "unknown" ? "a student with an unknown stage" : `a ${lifecycleStage}`;
  const interestText = interests.length > 0 ? ` interested in ${interests.join(", ")}` : "";

  return `This student is ${stageText}${interestText}.`;
}
