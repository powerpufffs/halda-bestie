import { sql, type SQL } from "drizzle-orm";
import type {
  AgentOpenLoop,
  ConversationState,
  JsonObject,
  LifecycleStage,
  OpenLoopStatus,
  StudentProfileState,
} from "./types.ts";

export interface IdentityParts {
  platformKey: string;
  externalIdentity: string;
  normalizedIdentity: string;
}

export interface IdRow {
  id: string;
}

export interface UserProfileRow {
  lifecycle_stage: LifecycleStage;
  lifecycle_stage_confidence: string | number;
  agent_profile_key: string;
  profile_version: number;
  profile_summary: string | null;
  facts: unknown;
  preferences: unknown;
  interests: unknown;
  constraints: unknown;
  milestones: unknown;
  tool_access: unknown;
  communication_style: unknown;
  tags: unknown;
  modified_at: Date | string;
}

export interface ConversationStateRow {
  agent_profile_key: string;
  current_intent: string | null;
  current_flow: string | null;
  slot_values: unknown;
  short_term_summary: string | null;
  modified_at: Date | string;
}

export interface OpenLoopRow {
  id: string;
  conversation_id: string | null;
  loop_type: string;
  status: OpenLoopStatus;
  priority: number;
  blocking: boolean;
  prompt: string | null;
  result: unknown;
  metadata: unknown;
  created_at: Date | string;
  modified_at: Date | string;
}

export function profileFromRow(userId: string, row: UserProfileRow): StudentProfileState {
  return {
    userId,
    lifecycleStage: row.lifecycle_stage,
    lifecycleStageConfidence: Number(row.lifecycle_stage_confidence),
    agentProfileKey: row.agent_profile_key,
    profileVersion: row.profile_version,
    profileSummary: row.profile_summary ?? undefined,
    facts: asRecord(row.facts),
    preferences: asRecord(row.preferences),
    interests: asStringArray(row.interests),
    constraints: asStringArray(row.constraints),
    milestones: asRecord(row.milestones),
    toolAccess: asStringArray(row.tool_access),
    communicationStyle: asRecord(row.communication_style),
    tags: asStringArray(row.tags),
    updatedAt: asDate(row.modified_at),
  };
}

export function conversationStateFromRow(
  userId: string,
  threadId: string,
  row: ConversationStateRow,
): ConversationState {
  return {
    userId,
    threadId,
    agentProfileKey: row.agent_profile_key,
    currentIntent: row.current_intent ?? undefined,
    currentFlow: row.current_flow ?? undefined,
    slotValues: asRecord(row.slot_values),
    shortTermSummary: row.short_term_summary ?? undefined,
    updatedAt: asDate(row.modified_at),
  };
}

export function openLoopFromRow(userId: string, row: OpenLoopRow): AgentOpenLoop {
  const metadata = asRecord(row.metadata);
  const threadId = typeof metadata.externalThreadId === "string" ? metadata.externalThreadId : undefined;

  return {
    id: row.id,
    userId,
    threadId,
    loopType: row.loop_type,
    status: row.status,
    priority: row.priority,
    blocking: row.blocking,
    prompt: row.prompt ?? "",
    result: row.result ? asRecord(row.result) : undefined,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.modified_at),
  };
}

export function parseIdentity(userId: string): IdentityParts {
  const separatorIndex = userId.indexOf(":");
  const platformKey = separatorIndex > 0 ? userId.slice(0, separatorIndex) : "website";
  const externalIdentity = separatorIndex > 0 ? userId.slice(separatorIndex + 1) : userId;
  const normalizedIdentity = normalizeIdentity(platformKey, externalIdentity || "unknown");

  return {
    platformKey: platformKey.replace(/[^a-z0-9_]/g, "_"),
    externalIdentity: externalIdentity || "unknown",
    normalizedIdentity,
  };
}

export function jsonb(value: unknown): SQL {
  return sql`${JSON.stringify(value ?? {})}::jsonb`;
}

export function textArray(values: string[]): SQL {
  if (values.length === 0) return sql`array[]::text[]`;
  return sql`array[${sql.join(values.map((value) => sql`${value}`), sql`, `)}]::text[]`;
}

export function timestamptz(value: Date): SQL {
  return sql`${value.toISOString()}::timestamptz`;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function displayNameForPlatform(platformKey: string): string {
  return platformKey
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeIdentity(platformKey: string, externalIdentity: string): string {
  const trimmed = externalIdentity.trim();
  if (platformKey === "sms" || platformKey === "imessage") return trimmed.replace(/[^\d+]/g, "");
  return trimmed.toLowerCase();
}

function asRecord(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
