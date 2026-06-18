import type { LifecycleStage } from "../types.ts";
import { freshmanProfile } from "./freshman.ts";
import { juniorProfile } from "./junior.ts";
import { sophomoreProfile } from "./sophomore.ts";
import { seniorProfile } from "./senior.ts";
import { collegeProfile } from "./transfer.ts";
import type { LifecycleAgentProfile } from "./types.ts";
import { visitorProfile } from "./unknown.ts";

export const lifecycleProfiles = [
  visitorProfile,
  freshmanProfile,
  sophomoreProfile,
  juniorProfile,
  seniorProfile,
  collegeProfile,
] satisfies LifecycleAgentProfile[];

export function getLifecycleProfile(stage: LifecycleStage): LifecycleAgentProfile {
  return lifecycleProfiles.find((profile) => profile.lifecycleStages.includes(stage)) ?? visitorProfile;
}
