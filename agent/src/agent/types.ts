import type { LlmToolDefinition } from "../tools/types.ts";

export type AgentChannel = "imessage" | "sms" | "email" | "gmail" | "website" | "mobile_app" | "terminal";

export type LifecycleStage =
  | "unknown"
  | "freshman"
  | "sophomore"
  | "junior"
  | "senior"
  | "transfer"
  | "current_college"
  | "gap_year";

export type JsonObject = Record<string, unknown>;

export type OpenLoopStatus = "open" | "snoozed" | "completed" | "cancelled";

export interface StudentProfileState {
  userId: string;
  lifecycleStage: LifecycleStage;
  lifecycleStageConfidence: number;
  agentProfileKey: string;
  profileVersion: number;
  profileSummary?: string;
  facts: JsonObject;
  preferences: JsonObject;
  interests: string[];
  constraints: string[];
  milestones: JsonObject;
  toolAccess: string[];
  communicationStyle: JsonObject;
  tags: string[];
  updatedAt: Date;
}

export interface ConversationState {
  userId: string;
  threadId: string;
  agentProfileKey: string;
  currentIntent?: string;
  currentFlow?: string;
  slotValues: JsonObject;
  shortTermSummary?: string;
  updatedAt: Date;
}

export interface AgentOpenLoop {
  id: string;
  userId: string;
  threadId?: string;
  loopType: string;
  status: OpenLoopStatus;
  priority: number;
  blocking: boolean;
  prompt: string;
  result?: JsonObject;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentEvent {
  userId: string;
  threadId?: string;
  eventType: string;
  input?: JsonObject;
  output?: JsonObject;
  createdAt: Date;
}

export type AgentMessageRole = "user" | "assistant" | "system" | "tool";
export type AgentMessageStatus = "received" | "queued" | "sent" | "failed" | "ignored";

export interface AgentMessageRecord {
  userId: string;
  threadId: string;
  channel: AgentChannel;
  role: AgentMessageRole;
  body: string;
  status: AgentMessageStatus;
  externalMessageId?: string;
  metadata?: JsonObject;
  occurredAt: Date;
  processedAt?: Date;
}

export interface AgentConversationMessage {
  threadId: string;
  channel: AgentChannel;
  role: Extract<AgentMessageRole, "user" | "assistant">;
  body: string;
  occurredAt: Date;
}

export interface AgentTurnInput {
  channel: AgentChannel;
  userId: string;
  threadId: string;
  text: string;
  timestamp: Date;
  externalMessageId?: string;
  metadata?: JsonObject;
}

export interface AgentTurnResult {
  reply: string;
  generationMode: "llm" | "fallback";
  profile: StudentProfileState;
  conversation: ConversationState;
  selectedToolKeys: string[];
  toolCallDefinitions: LlmToolDefinition[];
  goalStack: string[];
  events: AgentEvent[];
}
