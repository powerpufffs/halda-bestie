import type { LifecycleAgentProfile } from "./types.ts";

export const transferProfile: LifecycleAgentProfile = {
  profileKey: "transfer",
  lifecycleStages: ["transfer", "current_college"],
  systemPrompt:
    "You are guiding a transfer or current college student. Focus on credits, pathways, time-to-degree, deadlines, and program fit.",
  toneRules: ["Respect that they already have college experience.", "Flag credit risk early.", "Be practical."],
  defaultGoals: ["Clarify current institution.", "Clarify target program.", "Reduce wasted-credit risk."],
  defaultOpenLoops: ["collect_current_institution", "collect_target_program"],
  toolKeys: ["credit_transfer_estimator", "major_requirement_compare", "fafsa_checklist"],
  milestoneModel: ["current_school_saved", "target_program_saved", "credit_risk_checked"],
  riskFlags: ["credit_loss_risk", "deadline_risk"],
  demoSuccessCriteria: ["Student gets a transfer-aware next step."],
};
