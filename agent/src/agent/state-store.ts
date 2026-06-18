import type {
  AgentEvent,
  AgentConversationMessage,
  AgentMessageRecord,
  AgentOpenLoop,
  ConversationState,
  LifecycleStage,
  StudentProfileState,
} from "./types.ts";

export interface AgentStateStore {
  getProfile(userId: string): Promise<StudentProfileState>;
  saveProfile(profile: StudentProfileState): Promise<void>;
  getConversationState(userId: string, threadId: string): Promise<ConversationState>;
  saveConversationState(state: ConversationState): Promise<void>;
  listOpenLoops(userId: string): Promise<AgentOpenLoop[]>;
  upsertOpenLoop(loop: AgentOpenLoop): Promise<void>;
  listRecentMessages(userId: string, limit?: number): Promise<AgentConversationMessage[]>;
  logMessage(message: AgentMessageRecord): Promise<void>;
  logEvents(events: AgentEvent[]): Promise<void>;
}

export class InMemoryAgentStateStore implements AgentStateStore {
  readonly #profiles = new Map<string, StudentProfileState>();
  readonly #conversationStates = new Map<string, ConversationState>();
  readonly #openLoops = new Map<string, AgentOpenLoop>();
  readonly #messages: AgentMessageRecord[] = [];
  readonly #events: AgentEvent[] = [];

  async getProfile(userId: string): Promise<StudentProfileState> {
    const existing = this.#profiles.get(userId);
    if (existing) return existing;

    const now = new Date();
    const profile: StudentProfileState = {
      userId,
      lifecycleStage: "unknown",
      lifecycleStageConfidence: 0,
      agentProfileKey: "unknown",
      profileVersion: 1,
      facts: { accountStatus: "anonymous" },
      preferences: {},
      interests: [],
      constraints: [],
      milestones: {},
      toolAccess: [],
      communicationStyle: {},
      tags: [],
      updatedAt: now,
    };

    this.#profiles.set(userId, profile);
    return profile;
  }

  async saveProfile(profile: StudentProfileState): Promise<void> {
    this.#profiles.set(profile.userId, { ...profile, updatedAt: new Date() });
  }

  async getConversationState(userId: string, threadId: string): Promise<ConversationState> {
    const key = this.#conversationKey(userId, threadId);
    const existing = this.#conversationStates.get(key);
    if (existing) return existing;

    const state: ConversationState = {
      userId,
      threadId,
      agentProfileKey: "unknown",
      slotValues: {},
      updatedAt: new Date(),
    };

    this.#conversationStates.set(key, state);
    return state;
  }

  async saveConversationState(state: ConversationState): Promise<void> {
    this.#conversationStates.set(this.#conversationKey(state.userId, state.threadId), {
      ...state,
      updatedAt: new Date(),
    });
  }

  async listOpenLoops(userId: string): Promise<AgentOpenLoop[]> {
    return [...this.#openLoops.values()]
      .filter((loop) => loop.userId === userId && loop.status === "open")
      .toSorted((a, b) => b.priority - a.priority);
  }

  async upsertOpenLoop(loop: AgentOpenLoop): Promise<void> {
    this.#openLoops.set(loop.id, { ...loop, updatedAt: new Date() });
  }

  async listRecentMessages(userId: string, limit = 12): Promise<AgentConversationMessage[]> {
    return this.#messages
      .filter((message) => message.userId === userId)
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-limit)
      .map((message) => ({
        threadId: message.threadId,
        channel: message.channel,
        role: message.role as "user" | "assistant",
        body: message.body,
        occurredAt: message.occurredAt,
      }));
  }

  async logMessage(message: AgentMessageRecord): Promise<void> {
    this.#messages.push(message);
  }

  async logEvents(events: AgentEvent[]): Promise<void> {
    this.#events.push(...events);
  }

  #conversationKey(userId: string, threadId: string): string {
    return `${userId}:${threadId}`;
  }
}

export function createOpenLoop(input: {
  userId: string;
  threadId?: string;
  loopType: string;
  prompt: string;
  priority?: number;
  blocking?: boolean;
}): AgentOpenLoop {
  const now = new Date();

  return {
    id: `${input.userId}:${input.loopType}`,
    userId: input.userId,
    threadId: input.threadId,
    loopType: input.loopType,
    status: "open",
    priority: input.priority ?? 0,
    blocking: input.blocking ?? false,
    prompt: input.prompt,
    createdAt: now,
    updatedAt: now,
  };
}

export function setLifecycleStage(
  profile: StudentProfileState,
  stage: LifecycleStage,
  confidence: number,
  agentProfileKey: string,
): StudentProfileState {
  return {
    ...profile,
    lifecycleStage: stage,
    lifecycleStageConfidence: confidence,
    agentProfileKey,
    profileVersion: profile.lifecycleStage === stage ? profile.profileVersion : profile.profileVersion + 1,
  };
}
