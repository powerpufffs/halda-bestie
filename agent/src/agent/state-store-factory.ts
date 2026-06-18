import { createDatabase } from "../db/client.ts";
import { PostgresAgentStateStore } from "./postgres-state-store.ts";
import { InMemoryAgentStateStore, type AgentStateStore } from "./state-store.ts";

export function createAgentStateStore(): AgentStateStore {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn(
      "[halda] DATABASE_URL is not set. Using in-memory agent state; onboarding memory will reset on restart.",
    );
    return new InMemoryAgentStateStore();
  }

  console.log("[halda] Using Postgres-backed agent state.");
  return new PostgresAgentStateStore(createDatabase(databaseUrl));
}
