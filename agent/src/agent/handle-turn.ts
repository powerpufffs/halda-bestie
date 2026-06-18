import { getLifecycleProfile } from "./profiles/index.ts";
import { assembleToolBundle } from "./tool-bundles.ts";
import type { AgentEvent, AgentTurnInput, AgentTurnResult, StudentProfileState } from "./types.ts";
import { classifyIntent } from "./intent.ts";
import { inferLifecycleStage } from "./lifecycle.ts";
import { buildReply } from "./reply.ts";
import {
  createOpenLoop,
  type AgentStateStore,
  setLifecycleStage,
} from "./state-store.ts";

export async function handleAgentTurn(
  input: AgentTurnInput,
  store: AgentStateStore,
): Promise<AgentTurnResult> {
  let profile = await store.getProfile(input.userId);
  let conversation = await store.getConversationState(input.userId, input.threadId);
  const events: AgentEvent[] = [];

  const lifecycle = inferLifecycleStage(input.text, profile);
  const selectedProfile = getLifecycleProfile(lifecycle.stage);
  const profileChanged =
    lifecycle.stage !== profile.lifecycleStage ||
    selectedProfile.profileKey !== profile.agentProfileKey;

  if (profileChanged) {
    profile = setLifecycleStage(
      profile,
      lifecycle.stage,
      lifecycle.confidence,
      selectedProfile.profileKey,
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
  conversation = {
    ...conversation,
    agentProfileKey: selectedProfile.profileKey,
    currentIntent: intent,
    shortTermSummary: `Latest intent: ${intent}. Latest message: ${input.text}`,
  };

  const openLoops = await ensureLifecycleLoop(input, store, profile.lifecycleStage);
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
    openLoops,
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
    events,
  };
}

async function ensureLifecycleLoop(
  input: AgentTurnInput,
  store: AgentStateStore,
  lifecycleStage: string,
) {
  const existingOpenLoops = await store.listOpenLoops(input.userId);
  const lifecycleLoop = existingOpenLoops.find((loop) => loop.loopType === "collect_lifecycle_stage");

  if (lifecycleStage !== "unknown" && lifecycleLoop) {
    await store.upsertOpenLoop({
      ...lifecycleLoop,
      status: "completed",
      result: { lifecycleStage },
    });

    return existingOpenLoops.filter((loop) => loop.id !== lifecycleLoop.id);
  }

  if (lifecycleStage === "unknown" && !lifecycleLoop) {
    const loop = createOpenLoop({
      userId: input.userId,
      threadId: input.threadId,
      loopType: "collect_lifecycle_stage",
      prompt: "quick thing so I do not steer you wrong: are you a sophomore, junior, senior, transfer student, or already in college?",
      priority: 10,
    });

    await store.upsertOpenLoop(loop);
    return [loop, ...existingOpenLoops];
  }

  return existingOpenLoops;
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
