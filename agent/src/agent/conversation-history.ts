import type { ConversationState, JsonObject } from "./types.ts";

export interface RecentTurn extends JsonObject {
  user: string;
  assistant: string;
  at: string;
}

const MAX_RECENT_TURNS = 8;

export function readRecentTurns(conversation: ConversationState): RecentTurn[] {
  const raw = conversation.slotValues.recentTurns;
  if (!Array.isArray(raw)) return [];

  return raw.filter(isRecentTurn).slice(-MAX_RECENT_TURNS);
}

export function appendRecentTurn(
  turns: RecentTurn[],
  turn: RecentTurn,
): RecentTurn[] {
  return [...turns, turn].slice(-MAX_RECENT_TURNS);
}

function isRecentTurn(value: unknown): value is RecentTurn {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;

  return (
    typeof record.user === "string" &&
    typeof record.assistant === "string" &&
    typeof record.at === "string"
  );
}
