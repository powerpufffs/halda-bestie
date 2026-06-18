import type { LifecycleStage } from "../types.ts";
import { juniorProfile } from "./junior.ts";
import { sophomoreProfile } from "./sophomore.ts";
import { seniorProfile } from "./senior.ts";
import { transferProfile } from "./transfer.ts";
import type { LifecycleAgentProfile } from "./types.ts";
import { unknownProfile } from "./unknown.ts";

export const lifecycleProfiles = [
  unknownProfile,
  sophomoreProfile,
  juniorProfile,
  seniorProfile,
  transferProfile,
] satisfies LifecycleAgentProfile[];

export function getLifecycleProfile(stage: LifecycleStage): LifecycleAgentProfile {
  return lifecycleProfiles.find((profile) => profile.lifecycleStages.includes(stage)) ?? unknownProfile;
}
