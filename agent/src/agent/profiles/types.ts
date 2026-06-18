import type { LifecycleStage } from "../types.ts";

export interface LifecycleAgentProfile {
  profileKey: string;
  lifecycleStages: LifecycleStage[];
  systemPrompt: string;
  toneRules: string[];
  defaultGoals: string[];
  defaultOpenLoops: string[];
  toolKeys: string[];
  milestoneModel: string[];
  riskFlags: string[];
  demoSuccessCriteria: string[];
}
