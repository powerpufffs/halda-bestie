import { lifecycleProfiles } from "../profiles/index.ts";
import type { AgentConfig } from "./types.ts";

export const agentConfig = {
  profiles: lifecycleProfiles,
} satisfies AgentConfig;
